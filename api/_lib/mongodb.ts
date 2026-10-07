import { MongoClient, type Db } from 'mongodb';
import dns from 'node:dns';
import process from 'node:process';
import { localDb } from './localStore.js';

// Attempt to configure DNS for SRV records, but ignore errors if custom DNS is blocked
try {
  const currentServers = dns.getServers();
  // Only override if default servers list is empty or fails
  if (!currentServers || currentServers.length === 0) {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }
} catch {
  // Ignore in restricted environments
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let usingFallback = false;

export async function connectToDatabase(): Promise<{ client: MongoClient | null; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }
  if (usingFallback && cachedDb) {
    return { client: null, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'paisapal';

  if (!uri) {
    console.warn('[PaisaPal DB] MONGODB_URI not provided. Using persistent local storage.');
    usingFallback = true;
    cachedDb = localDb as unknown as Db;
    return { client: null, db: cachedDb };
  }

  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500,
      socketTimeoutMS: 4000,
    });

    await client.connect();
    const db = client.db(dbName);

    // Ensure unique index on email
    try {
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
    } catch {
      // Index already exists
    }

    cachedClient = client;
    cachedDb = db;
    usingFallback = false;
    return { client, db };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[PaisaPal DB] Remote MongoDB Atlas connection failed (${errMsg}). ` +
      `Automatically using persistent local database to ensure uninterrupted authentication.`
    );
    usingFallback = true;
    cachedDb = localDb as unknown as Db;
    return { client: null, db: cachedDb };
  }
}
