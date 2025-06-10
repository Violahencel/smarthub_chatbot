import { Collection, ObjectId } from 'mongodb';
import { connectToDatabase } from '../database/mongodb';

export class DynamicRepository {
  private collection: Collection;
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    this.collection = null as any; // Will be initialized in init()
  }

  private async init() {
    if (!this.collection) {
      const { db } = await connectToDatabase();
      this.collection = db.collection(this.collectionName);
    }
    return this.collection;
  }

  async create(data: any | any[]): Promise<any[]> {
    const collection = await this.init();
    const records = Array.isArray(data) ? data : [data];
    const now = new Date();
    
    const documents = records.map(record => ({
      ...record,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      _id: new ObjectId()
    }));

    await collection.insertMany(documents);
    return documents;
  }

  async update(id: string, data: any): Promise<any | null> {
    const collection = await this.init();
    const now = new Date();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...data,
          updatedAt: now
        }
      },
      { returnDocument: 'after' }
    );
    return result?.value || null;
  }

  async delete(id: string): Promise<boolean> {
    const collection = await this.init();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async find(filter: any = {}): Promise<any[]> {
    const collection = await this.init();
    return collection.find(filter).toArray();
  }

  async findOne(filter: any = {}): Promise<any | null> {
    const collection = await this.init();
    return collection.findOne(filter);
  }
} 