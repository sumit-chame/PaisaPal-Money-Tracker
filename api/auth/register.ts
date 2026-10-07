import { z } from 'zod';
import type { ApiRequest, ApiResponse, UserDoc } from '../_lib/types.js';
import { connectToDatabase } from '../_lib/mongodb.js';
import {
  hasMongoInjection,
  checkRateLimit,
  getClientIp,
  hashPassword,
  createAuthToken,
  setAuthCookie,
} from '../_lib/auth.js';

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name is too long'),
  email: z.string().trim().email('Invalid email address').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Rate limiting check
  const ip = getClientIp(req);
  if (!checkRateLimit(ip, 10, 60_000)) {
    return res.status(429).json({ ok: false, error: 'Too many requests. Please wait a minute.' });
  }

  // NoSQL injection guard
  if (hasMongoInjection(req.body)) {
    return res.status(400).json({ ok: false, error: 'Invalid payload keys' });
  }

  // Validate input
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || 'Invalid input';
    return res.status(400).json({ ok: false, error: issue });
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const { db } = await connectToDatabase();
    const users = db.collection<UserDoc>('users');

    // Check if user already exists
    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ ok: false, error: 'An account with this email already exists' });
    }

    // Hash password with bcrypt cost 12
    const passwordHash = await hashPassword(password);
    const now = new Date();

    const insertResult = await users.insertOne({
      name,
      email: normalizedEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    const userId = insertResult.insertedId.toString();

    // Create session token & cookie
    const token = await createAuthToken({ userId, email: normalizedEmail });
    setAuthCookie(res, token);

    return res.status(201).json({
      ok: true,
      user: {
        id: userId,
        name,
        email: normalizedEmail,
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    return res.status(500).json({ ok: false, error: message });
  }
}
