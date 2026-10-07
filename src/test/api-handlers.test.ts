import { describe, it, expect, vi } from 'vitest'
import healthHandler from '../../api/health'
import registerHandler from '../../api/auth/register'
import loginHandler from '../../api/auth/login'
import logoutHandler from '../../api/auth/logout'
import meHandler from '../../api/auth/me'
import changePasswordHandler from '../../api/auth/change-password'
import type { ApiRequest, ApiResponse } from '../../api/_lib/types'

// Mock response creator
function createMockResponse() {
  const res: Partial<ApiResponse> & {
    statusCode?: number
    data?: any
    headers: Record<string, string>
  } = {
    headers: {},
    status(code: number) {
      res.statusCode = code
      return res as ApiResponse
    },
    json(data: any) {
      res.data = data
      return res as ApiResponse
    },
    send(data: any) {
      res.data = data
      return res as ApiResponse
    },
    setHeader(key: string, value: string) {
      res.headers[key] = value
      return res as ApiResponse
    },
  }
  return res as ApiResponse & { statusCode?: number; data?: any; headers: Record<string, string> }
}

describe('API Route Handlers - Method and Validation Checks', () => {
  it('health endpoint rejects non-GET requests with 405', async () => {
    const req = { method: 'POST' } as ApiRequest
    const res = createMockResponse()

    await healthHandler(req, res)
    expect(res.statusCode).toBe(405)
    expect(res.data?.ok).toBe(false)
  })

  it('register endpoint rejects non-POST requests with 405', async () => {
    const req = { method: 'GET' } as ApiRequest
    const res = createMockResponse()

    await registerHandler(req, res)
    expect(res.statusCode).toBe(405)
    expect(res.data?.ok).toBe(false)
  })

  it('register endpoint rejects invalid email schema with 400', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: { name: 'Test User', email: 'not-an-email', password: 'Password123' },
    } as unknown as ApiRequest
    const res = createMockResponse()

    await registerHandler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res.data?.ok).toBe(false)
    expect(res.data?.error).toContain('Invalid email')
  })

  it('register endpoint rejects passwords shorter than 8 characters', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: { name: 'Test User', email: 'test@example.com', password: 'short' },
    } as unknown as ApiRequest
    const res = createMockResponse()

    await registerHandler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res.data?.ok).toBe(false)
    expect(res.data?.error).toContain('at least 8 characters')
  })

  it('register endpoint blocks NoSQL injection payloads with 400', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: { name: 'Hacker', email: { $gt: '' }, password: 'Password123' },
    } as unknown as ApiRequest
    const res = createMockResponse()

    await registerHandler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res.data?.ok).toBe(false)
    expect(res.data?.error).toBe('Invalid payload keys')
  })

  it('login endpoint rejects non-POST requests with 405', async () => {
    const req = { method: 'GET' } as ApiRequest
    const res = createMockResponse()

    await loginHandler(req, res)
    expect(res.statusCode).toBe(405)
  })

  it('login endpoint rejects empty or malformed inputs with 400', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: { email: 'invalid-email', password: '' },
    } as unknown as ApiRequest
    const res = createMockResponse()

    await loginHandler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res.data?.ok).toBe(false)
  })

  it('logout endpoint clears auth cookie and returns ok', async () => {
    const req = { method: 'POST' } as ApiRequest
    const res = createMockResponse()

    await logoutHandler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.data?.ok).toBe(true)
    expect(res.headers['Set-Cookie']).toBeDefined()
    expect(res.headers['Set-Cookie']).toContain('paisapal_auth=')
    expect(res.headers['Set-Cookie']).toContain('Max-Age=0')
  })

  it('me endpoint returns 401 when no session cookie is provided', async () => {
    const req = {
      method: 'GET',
      headers: {},
      cookies: {},
    } as unknown as ApiRequest
    const res = createMockResponse()

    await meHandler(req, res)
    expect(res.statusCode).toBe(401)
    expect(res.data?.ok).toBe(false)
    expect(res.data?.error).toBe('Not authenticated')
  })

  it('change-password endpoint returns 401 when unauthenticated', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: { currentPassword: 'OldPassword123', newPassword: 'NewPassword123' },
    } as unknown as ApiRequest
    const res = createMockResponse()

    await changePasswordHandler(req, res)
    expect(res.statusCode).toBe(401)
    expect(res.data?.ok).toBe(false)
  })
})
