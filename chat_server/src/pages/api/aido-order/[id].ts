import { NextApiRequest, NextApiResponse } from 'next';
import { AidoOrderProcessing } from '../../../data/models/AidoOrderProcessing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid ID parameter' });
    }

    const aidoOrder = new AidoOrderProcessing();
    const record = await aidoOrder.findById(id);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    return res.status(200).json({record});
  } catch (error) {
    console.error('Error fetching record:', error);
    return res.status(500).json({ error: 'Failed to fetch record' });
  }
} 