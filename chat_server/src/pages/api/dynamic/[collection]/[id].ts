import { NextApiRequest, NextApiResponse } from 'next';
import { DynamicRepository } from '../../../../lib/repositories/DynamicRepository';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { collection, id } = req.query;
  
  // Basic validation
  if (!collection || typeof collection !== 'string' || collection.length < 1) {
    return res.status(400).json({ error: 'Invalid collection name' });
  }
  if (!id || typeof id !== 'string' || id.length < 1) {
    return res.status(400).json({ error: 'Invalid record ID' });
  }

  const repo = new DynamicRepository(collection);

  try {
    switch (req.method) {
      case 'PUT':
        const data = req.body;
        if (!data) {
          return res.status(400).json({ error: 'No data provided' });
        }
        const updatedRecord = await repo.update(id, data);
        if (!updatedRecord) {
          return res.status(404).json({ error: 'Record not found' });
        }
        return res.status(200).json({ record: updatedRecord});

      case 'DELETE':
        const deleted = await repo.delete(id);
        if (!deleted) {
          return res.status(404).json({ error: 'Record not found' });
        }
        return res.status(200).json({ success: true });

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Dynamic API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
} 