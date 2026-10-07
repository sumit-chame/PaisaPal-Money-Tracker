import { MongoClient } from 'mongodb';
import dns from 'node:dns';
import process from 'node:process';

// Fallback DNS for Windows/local environments where SRV lookups fail
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // ignore
}

async function cleanupDatabase() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'paisapal';

  if (!uri) {
    console.log('[Cleanup] MONGODB_URI not found. Skipping remote database cleanup.');
    return;
  }

  console.log(`[Cleanup] Connecting to database "${dbName}"...`);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

  try {
    await client.connect();
    const db = client.db(dbName);

    console.log('[Cleanup] Connected successfully to MongoDB Atlas.');

    // 1. Clean test users from 'users' collection
    const usersCol = db.collection('users');
    const deleteTestFilter = {
      $or: [
        { email: { $regex: /test/i } },
        { email: { $regex: /@example\./i } },
        { email: { $regex: /vitest/i } },
        { name: { $regex: /test/i } },
      ],
    };

    const countBefore = await usersCol.countDocuments(deleteTestFilter);
    if (countBefore > 0) {
      const delResult = await usersCol.deleteMany(deleteTestFilter);
      console.log(`[Cleanup] Deleted ${delResult.deletedCount} test user(s) from 'users' collection.`);
    } else {
      console.log('[Cleanup] No lingering test users found in "users" collection.');
    }

    // Ensure unique index exists
    await usersCol.createIndex({ email: 1 }, { unique: true }).catch(() => {});

    // List remaining collections and document counts
    const collections = await db.listCollections().toArray();
    console.log('[Cleanup] Current Database Status:');
    for (const col of collections) {
      const totalDocs = await db.collection(col.name).countDocuments();
      console.log(`  - Collection '${col.name}': ${totalDocs} document(s) remaining`);
    }

    console.log('[Cleanup] Database is fresh and clean.');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('SSL alert number 80') || msg.includes('whitelist') || msg.includes('IP')) {
      console.warn('[Cleanup Note] MongoDB Atlas rejected the TLS connection (SSL Alert 80).');
      console.warn('  -> This indicates your current IP is not in MongoDB Atlas "Network Access".');
      console.warn('  -> For Vercel & local development, add 0.0.0.0/0 to Atlas Network Access.');
    } else {
      console.warn('[Cleanup Warning] Could not connect to remote DB:', msg);
    }
  } finally {
    await client.close().catch(() => {});
  }
}

cleanupDatabase();
