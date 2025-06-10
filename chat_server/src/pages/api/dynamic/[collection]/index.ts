import { NextApiRequest, NextApiResponse } from 'next';
import { DynamicRepository } from '../../../../lib/repositories/DynamicRepository';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { collection } = req.query;
  
  // Basic collection name validation
  if (!collection || typeof collection !== 'string' || collection.length < 1) {
    return res.status(400).json({ error: 'Invalid collection name' });
  }

  const repo = new DynamicRepository(collection);

  try {
    switch (req.method) {
      case 'GET':
        const filter = req.query.filter ? JSON.parse(req.query.filter as string) : {};
        const records = await repo.find(filter);
        return res.status(200).json({ records });

      case 'POST':
        const data = req.body;
        if (!data) {
          return res.status(400).json({ error: 'No data provided' });
        }
        const createdRecords = await repo.create(data);
        return res.status(201).json({ records: createdRecords });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Dynamic API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
} 