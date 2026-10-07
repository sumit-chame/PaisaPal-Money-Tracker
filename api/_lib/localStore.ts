import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { ObjectId } from 'mongodb';
import type { UserDoc } from './types.js';

function getStoragePath(): string {
  try {
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'users.json');
  } catch {
    // Fallback for read-only environments (e.g. AWS Lambda / Vercel tmp)
    const tmpDir = path.join(process.env.TEMP || process.env.TMP || '/tmp', 'paisapal');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return path.join(tmpDir, 'users.json');
  }
}

class LocalUserCollection {
  private filePath: string;
  private users: UserDoc[] = [];

  constructor() {
    this.filePath = getStoragePath();
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.users = parsed.map((u: any) => ({
            ...u,
            _id: u._id ? new ObjectId(u._id) : new ObjectId(),
            createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
            updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
          }));
        }
      }
    } catch (err) {
      console.warn('[LocalStore] Could not read users file, starting fresh:', err);
      this.users = [];
    }
  }

  private save() {
    try {
      const serializable = this.users.map((u) => ({
        ...u,
        _id: u._id?.toString(),
        createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
        updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : u.updatedAt,
      }));
      fs.writeFileSync(this.filePath, JSON.stringify(serializable, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[LocalStore] Could not persist users to file:', err);
    }
  }

  async createIndex(_keys: unknown, _options?: unknown) {
    return 'email_1';
  }

  async findOne(filter: Record<string, any>): Promise<UserDoc | null> {
    this.load(); // Refresh latest from disk

    const found = this.users.find((u) => {
      if (filter.email !== undefined) {
        if (u.email.toLowerCase() !== String(filter.email).toLowerCase()) return false;
      }
      if (filter._id !== undefined) {
        const targetId = filter._id?.toString();
        const currentId = u._id?.toString();
        if (targetId && currentId && targetId !== currentId) return false;
      }
      return true;
    });

    return found ? { ...found } : null;
  }

  async insertOne(doc: UserDoc): Promise<{ insertedId: ObjectId }> {
    this.load();

    const _id = doc._id || new ObjectId();
    const newDoc: UserDoc = {
      ...doc,
      _id,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt : new Date(),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt : new Date(),
    };

    this.users.push(newDoc);
    this.save();

    return { insertedId: _id };
  }

  async updateOne(filter: Record<string, any>, update: Record<string, any>): Promise<{ modifiedCount: number }> {
    this.load();

    const index = this.users.findIndex((u) => {
      if (filter.email !== undefined) {
        if (u.email.toLowerCase() !== String(filter.email).toLowerCase()) return false;
      }
      if (filter._id !== undefined) {
        const targetId = filter._id?.toString();
        const currentId = u._id?.toString();
        if (targetId && currentId && targetId !== currentId) return false;
      }
      return true;
    });

    if (index === -1) {
      return { modifiedCount: 0 };
    }

    const current = this.users[index];
    if (update.$set) {
      this.users[index] = {
        ...current,
        ...update.$set,
        updatedAt: update.$set.updatedAt ? new Date(update.$set.updatedAt) : new Date(),
      };
    }

    this.save();
    return { modifiedCount: 1 };
  }

  async deleteOne(filter: Record<string, any>): Promise<{ deletedCount: number }> {
    this.load();

    const initialLen = this.users.length;
    this.users = this.users.filter((u) => {
      if (filter.email !== undefined) {
        if (u.email.toLowerCase() === String(filter.email).toLowerCase()) return false;
      }
      if (filter._id !== undefined) {
        const targetId = filter._id?.toString();
        const currentId = u._id?.toString();
        if (targetId && currentId && targetId === currentId) return false;
      }
      return true;
    });

    const deleted = initialLen - this.users.length;
    if (deleted > 0) {
      this.save();
    }

    return { deletedCount: deleted };
  }
}

const localCollectionInstance = new LocalUserCollection();

export const localDb = {
  databaseName: 'paisapal_local',
  collection<T = UserDoc>(_name: string): any {
    return localCollectionInstance;
  },
  async command(cmd: Record<string, any>) {
    if (cmd.ping) return { ok: 1 };
    return { ok: 1 };
  },
};
