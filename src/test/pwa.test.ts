import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

// Setup node-compatible browser mocks
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
};

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });

  if (typeof (globalThis as Record<string, unknown>).window === 'undefined') {
    Object.defineProperty(globalThis, 'window', {
      value: globalThis,
      writable: true,
      configurable: true,
    });
  }

  if (typeof (globalThis as Record<string, unknown>).document === 'undefined') {
    Object.defineProperty(globalThis, 'document', {
      value: { referrer: '' },
      writable: true,
      configurable: true,
    });
  }

  if (typeof (globalThis as Record<string, unknown>).navigator === 'undefined') {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        platform: 'Win32',
        maxTouchPoints: 0,
      },
      writable: true,
      configurable: true,
    });
  }
});

import {
  checkIsInstalled,
  detectPlatform,
  checkIsDismissed,
  usePwaStore,
  type BeforeInstallPromptEvent,
} from '../lib/pwa/pwaStore';

describe('PWA Installation Logic & Utilities', () => {
  beforeEach(() => {
    storageMap.clear();
    (globalThis as unknown as { document: { referrer: string } }).document.referrer = '';
    vi.restoreAllMocks();

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(navigator, 'standalone', {
      value: false,
      configurable: true,
    });

    usePwaStore.setState({
      isInstalled: false,
      isInstallable: false,
      platform: 'desktop',
      isDismissed: false,
      isReadyToShow: false,
      isIosModalOpen: false,
      deferredPrompt: null,
    });
  });

  describe('checkIsInstalled', () => {
    it('returns false in normal browser tab', () => {
      expect(checkIsInstalled()).toBe(false);
    });

    it('returns true when display-mode: standalone matches', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(checkIsInstalled()).toBe(true);
    });

    it('returns true when navigator.standalone is true (iOS Safari standalone)', () => {
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        configurable: true,
      });

      expect(checkIsInstalled()).toBe(true);
    });

    it('returns true when user has previously installed flag in localStorage', () => {
      mockLocalStorage.setItem('paisapal_pwa_installed', 'true');
      expect(checkIsInstalled()).toBe(true);
    });

    it('returns true when document referrer is Android TWA', () => {
      (globalThis as unknown as { document: { referrer: string } }).document.referrer = 'android-app://com.paisapal.app';
      expect(checkIsInstalled()).toBe(true);
    });
  });

  describe('detectPlatform', () => {
    it('detects iOS devices via userAgent', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      );
      expect(detectPlatform()).toBe('ios');
    });

    it('detects Android devices via userAgent', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
      );
      expect(detectPlatform()).toBe('android');
    });

    it('detects desktop devices', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      );
      expect(detectPlatform()).toBe('desktop');
    });
  });

  describe('Dismissal Management', () => {
    it('is not dismissed by default', () => {
      expect(checkIsDismissed()).toBe(false);
    });

    it('tracks dismissal and stores timestamp in localStorage', () => {
      usePwaStore.getState().dismissPrompt();
      expect(checkIsDismissed()).toBe(true);
      expect(usePwaStore.getState().isDismissed).toBe(true);
      expect(mockLocalStorage.getItem('paisapal_pwa_prompt_dismissed_at')).toBeTruthy();
    });

    it('clears dismissal with resetDismissal', () => {
      usePwaStore.getState().dismissPrompt();
      expect(checkIsDismissed()).toBe(true);

      usePwaStore.getState().resetDismissal();
      expect(checkIsDismissed()).toBe(false);
      expect(usePwaStore.getState().isDismissed).toBe(false);
      expect(mockLocalStorage.getItem('paisapal_pwa_prompt_dismissed_at')).toBeNull();
    });
  });

  describe('promptInstall flow', () => {
    it('triggers native beforeinstallprompt on supported browsers when accepted', async () => {
      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const fakeEvent = {
        platforms: ['web'],
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
      } as unknown as BeforeInstallPromptEvent;

      usePwaStore.setState({
        deferredPrompt: fakeEvent,
        platform: 'desktop',
        isInstallable: true,
      });

      const outcome = await usePwaStore.getState().promptInstall();

      expect(mockPrompt).toHaveBeenCalled();
      expect(outcome).toBe('accepted');
      expect(usePwaStore.getState().isInstalled).toBe(true);
      expect(mockLocalStorage.getItem('paisapal_pwa_installed')).toBe('true');
      expect(usePwaStore.getState().deferredPrompt).toBeNull();
    });

    it('handles dismissed choice from native prompt', async () => {
      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const fakeEvent = {
        platforms: ['web'],
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: 'dismissed' as const, platform: 'web' }),
      } as unknown as BeforeInstallPromptEvent;

      usePwaStore.setState({
        deferredPrompt: fakeEvent,
        platform: 'android',
        isInstallable: true,
      });

      const outcome = await usePwaStore.getState().promptInstall();

      expect(mockPrompt).toHaveBeenCalled();
      expect(outcome).toBe('dismissed');
      expect(usePwaStore.getState().isInstalled).toBe(false);
      expect(usePwaStore.getState().deferredPrompt).toBeNull();
    });

    it('opens iOS instructions modal on iOS when no native prompt exists', async () => {
      usePwaStore.setState({
        deferredPrompt: null,
        platform: 'ios',
        isInstallable: true,
        isIosModalOpen: false,
      });

      const outcome = await usePwaStore.getState().promptInstall();

      expect(outcome).toBe('ios_guided');
      expect(usePwaStore.getState().isIosModalOpen).toBe(true);
    });

    it('returns unsupported if already installed', async () => {
      usePwaStore.setState({
        isInstalled: true,
      });

      const outcome = await usePwaStore.getState().promptInstall();
      expect(outcome).toBe('unsupported');
    });
  });
});
