import type { ApiRequest, ApiResponse } from '../_lib/types.js';
import { clearAuthCookie } from '../_lib/auth.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  clearAuthCookie(res);
  return res.status(200).json({ ok: true });
}
