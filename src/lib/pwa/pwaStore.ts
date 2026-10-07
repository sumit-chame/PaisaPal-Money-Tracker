import { create } from 'zustand';

export type DevicePlatform = 'ios' | 'android' | 'desktop' | 'other';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISSED_KEY = 'paisapal_pwa_prompt_dismissed_at';
const INSTALLED_KEY = 'paisapal_pwa_installed';
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days cooldown if dismissed

export function checkIsInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Standalone / fullscreen display modes
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isMinimal = window.matchMedia('(display-mode: minimal-ui)').matches;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;

  // 2. iOS Safari standalone property
  const isIOSStandalone = Boolean((window.navigator as unknown as { standalone?: boolean }).standalone);

  // 3. Android Trusted Web App (TWA)
  const isTWA = document.referrer.startsWith('android-app://');

  // 4. Stored user confirmation flag
  const hasInstalledFlag = localStorage.getItem(INSTALLED_KEY) === 'true';

  return isStandalone || isMinimal || isFullscreen || isIOSStandalone || isTWA || hasInstalledFlag;
}

export function detectPlatform(): DevicePlatform {
  if (typeof window === 'undefined') return 'other';
  const ua = navigator.userAgent || '';

  // iOS detection (including iPadOS on modern desktop Safari user agent)
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function checkIsDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  const val = localStorage.getItem(DISMISSED_KEY);
  if (!val) return false;
  const dismissedAt = parseInt(val, 10);
  if (isNaN(dismissedAt)) return true;
  return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
}

// Module-level cache to catch beforeinstallprompt fired before React mounts
let cachedPromptEvent: BeforeInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    cachedPromptEvent = e as BeforeInstallPromptEvent;
  });
}

export interface PwaState {
  isInstalled: boolean;
  isInstallable: boolean;
  platform: DevicePlatform;
  isDismissed: boolean;
  isReadyToShow: boolean;
  isIosModalOpen: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;

  initPwa: () => () => void;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'ios_guided' | 'unsupported'>;
  dismissPrompt: () => void;
  resetDismissal: () => void;
  setIsIosModalOpen: (open: boolean) => void;
}

export const usePwaStore = create<PwaState>((set, get) => ({
  isInstalled: false,
  isInstallable: false,
  platform: 'desktop',
  isDismissed: false,
  isReadyToShow: false,
  isIosModalOpen: false,
  deferredPrompt: null,

  initPwa: () => {
    if (typeof window === 'undefined') return () => {};

    const installed = checkIsInstalled();
    const plat = detectPlatform();
    const dismissed = checkIsDismissed();

    set({
      isInstalled: installed,
      platform: plat,
      isDismissed: dismissed,
      // If iOS, it's installable via Safari share menu as long as not already installed
      isInstallable: installed ? false : plat === 'ios' || cachedPromptEvent !== null,
      deferredPrompt: cachedPromptEvent,
    });

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      cachedPromptEvent = promptEvent;
      set({
        deferredPrompt: promptEvent,
        isInstallable: true,
      });
    };

    const handleAppInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, 'true');
      cachedPromptEvent = null;
      set({
        isInstalled: true,
        isInstallable: false,
        deferredPrompt: null,
        isIosModalOpen: false,
      });
    };

    const mq = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        localStorage.setItem(INSTALLED_KEY, 'true');
        set({ isInstalled: true, isInstallable: false, deferredPrompt: null });
      }
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mq.addEventListener('change', handleMediaChange);

    // Delay prompt appearance so user has an unhurried, comfortable initial experience
    const timer = setTimeout(() => {
      set({ isReadyToShow: true });
    }, 2400);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mq.removeEventListener('change', handleMediaChange);
      clearTimeout(timer);
    };
  },

  promptInstall: async () => {
    const { deferredPrompt, platform, isInstalled } = get();

    if (isInstalled) return 'unsupported';

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          localStorage.setItem(INSTALLED_KEY, 'true');
          set({
            isInstalled: true,
            isInstallable: false,
            deferredPrompt: null,
          });
          return 'accepted';
        } else {
          return 'dismissed';
        }
      } catch {
        return 'unsupported';
      } finally {
        set({ deferredPrompt: null });
      }
    }

    if (platform === 'ios') {
      set({ isIosModalOpen: true });
      return 'ios_guided';
    }

    return 'unsupported';
  },

  dismissPrompt: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    }
    set({ isDismissed: true });
  },

  resetDismissal: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DISMISSED_KEY);
    }
    set({ isDismissed: false });
  },

  setIsIosModalOpen: (open: boolean) => set({ isIosModalOpen: open }),
}));
