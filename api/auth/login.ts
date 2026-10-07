import { z } from 'zod';
import type { ApiRequest, ApiResponse, UserDoc } from '../_lib/types.js';
import { connectToDatabase } from '../_lib/mongodb.js';
import {
  hasMongoInjection,
  checkRateLimit,
  getClientIp,
  verifyPassword,
  createAuthToken,
  setAuthCookie,
} from '../_lib/auth.js';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const INVALID_CREDENTIALS_MSG = 'Invalid email or password';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Rate limiting check
  const ip = getClientIp(req);
  if (!checkRateLimit(ip, 10, 60_000)) {
    return res.status(429).json({ ok: false, error: 'Too many login attempts. Please try again later.' });
  }

  // NoSQL injection guard
  if (hasMongoInjection(req.body)) {
    return res.status(400).json({ ok: false, error: 'Invalid payload keys' });
  }

  // Validate input
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: INVALID_CREDENTIALS_MSG });
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const { db } = await connectToDatabase();
    const users = db.collection<UserDoc>('users');

    const user = await users.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ ok: false, error: INVALID_CREDENTIALS_MSG });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ ok: false, error: INVALID_CREDENTIALS_MSG });
    }

    const userId = user._id ? user._id.toString() : '';

    // Create session token & cookie
    const token = await createAuthToken({ userId, email: normalizedEmail });
    setAuthCookie(res, token);

    return res.status(200).json({
      ok: true,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt instanceof Date ? user.createdAt.getTime() : Date.now(),
        updatedAt: user.updatedAt instanceof Date ? user.updatedAt.getTime() : Date.now(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return res.status(500).json({ ok: false, error: message });
  }
}
