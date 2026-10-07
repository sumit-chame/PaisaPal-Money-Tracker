import { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { ApiRequest, ApiResponse, UserDoc } from '../_lib/types.js';
import { connectToDatabase } from '../_lib/mongodb.js';
import {
  parseCookie,
  verifyAuthToken,
  hasMongoInjection,
  verifyPassword,
  clearAuthCookie,
} from '../_lib/auth.js';

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name is too long'),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to confirm deletion'),
});

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // ── Authentication Check ──
  const token = parseCookie(req);
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }

  const payload = await verifyAuthToken(token);
  if (!payload || !payload.userId) {
    clearAuthCookie(res);
    return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
  }

  let userObjectId: ObjectId;
  try {
    userObjectId = new ObjectId(payload.userId);
  } catch {
    clearAuthCookie(res);
    return res.status(401).json({ ok: false, error: 'Invalid user token' });
  }

  const { db } = await connectToDatabase();
  const users = db.collection<UserDoc>('users');

  // ── GET /api/auth/me ──
  if (req.method === 'GET') {
    try {
      const user = await users.findOne({ _id: userObjectId });
      if (!user) {
        clearAuthCookie(res);
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      return res.status(200).json({
        ok: true,
        user: {
          id: user._id?.toString() || payload.userId,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt instanceof Date ? user.createdAt.getTime() : Date.now(),
          updatedAt: user.updatedAt instanceof Date ? user.updatedAt.getTime() : Date.now(),
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user';
      return res.status(500).json({ ok: false, error: message });
    }
  }

  // ── PATCH /api/auth/me (Update name) ──
  if (req.method === 'PATCH') {
    if (hasMongoInjection(req.body)) {
      return res.status(400).json({ ok: false, error: 'Invalid payload keys' });
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || 'Invalid input';
      return res.status(400).json({ ok: false, error: issue });
    }

    const { name } = parsed.data;
    const now = new Date();

    try {
      const result = await users.findOneAndUpdate(
        { _id: userObjectId },
        { $set: { name, updatedAt: now } },
        { returnDocument: 'after' }
      );

      if (!result) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      return res.status(200).json({
        ok: true,
        user: {
          id: result._id?.toString() || payload.userId,
          name: result.name,
          email: result.email,
          createdAt: result.createdAt instanceof Date ? result.createdAt.getTime() : Date.now(),
          updatedAt: result.updatedAt instanceof Date ? result.updatedAt.getTime() : now.getTime(),
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      return res.status(500).json({ ok: false, error: message });
    }
  }

  // ── DELETE /api/auth/me (Delete account) ──
  if (req.method === 'DELETE') {
    if (hasMongoInjection(req.body)) {
      return res.status(400).json({ ok: false, error: 'Invalid payload keys' });
    }

    const parsed = deleteAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || 'Password confirmation required';
      return res.status(400).json({ ok: false, error: issue });
    }

    const { password } = parsed.data;

    try {
      const user = await users.findOne({ _id: userObjectId });
      if (!user) {
        clearAuthCookie(res);
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ ok: false, error: 'Incorrect password' });
      }

      await users.deleteOne({ _id: userObjectId });
      clearAuthCookie(res);

      return res.status(200).json({ ok: true, message: 'Account deleted successfully' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      return res.status(500).json({ ok: false, error: message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
