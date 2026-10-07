import type { ApiRequest, ApiResponse } from './_lib/types.js';
import { connectToDatabase } from './_lib/mongodb.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    await db.command({ ping: 1 });
    return res.status(200).json({
      ok: true,
      status: 'healthy',
      database: db.databaseName,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database connection error';
    return res.status(503).json({
      ok: false,
      status: 'unhealthy',
      error: message,
    });
  }
}
