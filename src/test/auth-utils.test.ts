import { describe, it, expect } from 'vitest'
import {
  hasMongoInjection,
  hashPassword,
  verifyPassword,
  createAuthToken,
  verifyAuthToken,
  checkRateLimit,
  parseCookie,
} from '../../api/_lib/auth'

describe('Auth Utilities - hasMongoInjection defense', () => {
  it('returns false for safe objects', () => {
    expect(hasMongoInjection({ email: 'user@example.com', name: 'John' })).toBe(false)
    expect(hasMongoInjection('safe string')).toBe(false)
    expect(hasMongoInjection(12345)).toBe(false)
    expect(hasMongoInjection(null)).toBe(false)
    expect(hasMongoInjection(undefined)).toBe(false)
  })

  it('detects operator injection with $ prefix', () => {
    expect(hasMongoInjection({ email: { $gt: '' } })).toBe(true)
    expect(hasMongoInjection({ $where: 'sleep(1000)' })).toBe(true)
    expect(hasMongoInjection({ password: { $ne: null } })).toBe(true)
  })

  it('detects dot-notation path injection', () => {
    expect(hasMongoInjection({ 'profile.role': 'admin' })).toBe(true)
  })

  it('detects deeply nested operator injection', () => {
    const nested = {
      user: {
        filter: {
          subfield: {
            $regex: '.*',
          },
        },
      },
    }
    expect(hasMongoInjection(nested)).toBe(true)
  })
})

describe('Auth Utilities - Password Hashing & Verification', () => {
  it('hashes and verifies matching password', async () => {
    const raw = 'SuperSecureP@ss123'
    const hash = await hashPassword(raw)

    expect(hash).toBeDefined()
    expect(hash).not.toBe(raw)
    expect(hash.startsWith('$2')).toBe(true) // bcrypt hash prefix

    const isMatch = await verifyPassword(raw, hash)
    expect(isMatch).toBe(true)
  })

  it('rejects incorrect password against hash', async () => {
    const hash = await hashPassword('CorrectPassword')
    const isMatch = await verifyPassword('WrongPassword', hash)
    expect(isMatch).toBe(false)
  })
})

describe('Auth Utilities - JWT Sign and Verification', () => {
  it('creates and verifies a valid JWT session token', async () => {
    const payload = { userId: 'user-id-12345', email: 'test@example.com' }
    const token = await createAuthToken(payload)

    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // header.payload.signature

    const verified = await verifyAuthToken(token)
    expect(verified).not.toBeNull()
    expect(verified?.userId).toBe(payload.userId)
    expect(verified?.email).toBe(payload.email)
  })

  it('returns null for tampered or invalid token', async () => {
    const verified = await verifyAuthToken('invalid.token.signature')
    expect(verified).toBeNull()
  })
})

describe('Auth Utilities - Rate Limiter', () => {
  it('allows requests within the limit and blocks exceeding requests', () => {
    const testIp = `test-ip-${Date.now()}`
    const limit = 3

    expect(checkRateLimit(testIp, limit)).toBe(true)
    expect(checkRateLimit(testIp, limit)).toBe(true)
    expect(checkRateLimit(testIp, limit)).toBe(true)
    // 4th request must exceed limit
    expect(checkRateLimit(testIp, limit)).toBe(false)
  })
})

describe('Auth Utilities - Cookie Parsing', () => {
  it('extracts auth token from cookie header correctly', () => {
    const mockReq = {
      headers: {
        cookie: 'other_cookie=xyz; paisapal_auth=test-token-value; foo=bar',
      },
    } as any

    const token = parseCookie(mockReq)
    expect(token).toBe('test-token-value')
  })

  it('returns null when auth cookie is absent', () => {
    const mockReq = {
      headers: {
        cookie: 'other_cookie=xyz; foo=bar',
      },
    } as any

    expect(parseCookie(mockReq)).toBeNull()
  })
})
