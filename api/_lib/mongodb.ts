import { MongoClient, Db } from 'mongodb';
import dns from 'node:dns';
import process from 'node:process';

// Fix for Windows / local ISPs failing SRV lookups on mongodb+srv URIs
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in restricted environments
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'paisapal';

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is missing');
  }

  const client = new MongoClient(uri);
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
  return { client, db };
}
