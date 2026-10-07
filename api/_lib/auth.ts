import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import process from 'node:process';
import type { ApiRequest, ApiResponse } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'paisapal-default-secret-key-at-least-32-chars-long';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export const COOKIE_NAME = 'paisapal_auth';

// ── NoSQL Injection Defense ──
export function hasMongoInjection(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (key.startsWith('$') || key.includes('.')) return true;
    const val = (obj as Record<string, unknown>)[key];
    if (typeof val === 'object' && hasMongoInjection(val)) return true;
  }
  return false;
}

// ── Password Hashing & Verification (bcryptjs cost 12) ──
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT Sign & Verify (jose) ──
export async function createAuthToken(payload: { userId: string; email: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifyAuthToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as { userId: string; email: string };
  } catch {
    return null;
  }
}

// ── Cookie Helpers ──
export function parseCookie(req: ApiRequest): string | null {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const header = req.headers.cookie || '';
  const parts = header.split(';');
  for (const part of parts) {
    const [name, val] = part.trim().split('=');
    if (name === COOKIE_NAME && val) {
      return decodeURIComponent(val);
    }
  }
  return null;
}

export function setAuthCookie(res: ApiResponse, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  // 7 days = 604800 seconds
  const flags = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'Max-Age=604800',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (isProd) {
    flags.push('Secure');
  }
  res.setHeader('Set-Cookie', flags.join('; '));
}

export function clearAuthCookie(res: ApiResponse) {
  const isProd = process.env.NODE_ENV === 'production';
  const flags = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (isProd) {
    flags.push('Secure');
  }
  res.setHeader('Set-Cookie', flags.join('; '));
}

// ── Basic In-Memory Rate Limiting for Auth ──
const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string, limit = 15, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}

export function getClientIp(req: ApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}
