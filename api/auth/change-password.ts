import { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { ApiRequest, ApiResponse, UserDoc } from '../_lib/types.js';
import { connectToDatabase } from '../_lib/mongodb.js';
import {
  parseCookie,
  verifyAuthToken,
  hasMongoInjection,
  verifyPassword,
  hashPassword,
  clearAuthCookie,
} from '../_lib/auth.js';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Authentication check
  const token = parseCookie(req);
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }

  const payload = await verifyAuthToken(token);
  if (!payload || !payload.userId) {
    clearAuthCookie(res);
    return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
  }

  // NoSQL injection guard
  if (hasMongoInjection(req.body)) {
    return res.status(400).json({ ok: false, error: 'Invalid payload keys' });
  }

  // Validate body
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || 'Invalid input';
    return res.status(400).json({ ok: false, error: issue });
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const userObjectId = new ObjectId(payload.userId);
    const { db } = await connectToDatabase();
    const users = db.collection<UserDoc>('users');

    const user = await users.findOne({ _id: userObjectId });
    if (!user) {
      clearAuthCookie(res);
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const isMatch = await verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ ok: false, error: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(newPassword);
    await users.updateOne(
      { _id: userObjectId },
      { $set: { passwordHash: newHash, updatedAt: new Date() } }
    );

    return res.status(200).json({ ok: true, message: 'Password changed successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to change password';
    return res.status(500).json({ ok: false, error: message });
  }
}
