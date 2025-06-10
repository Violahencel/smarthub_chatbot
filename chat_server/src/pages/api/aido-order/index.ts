import { NextApiRequest, NextApiResponse } from 'next';
import { AidoOrderProcessing } from '../../../data/models/AidoOrderProcessing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const aidoOrder = new AidoOrderProcessing();
    const records = await aidoOrder.find();
    return res.status(200).json({ records });
  } catch (error) {
    console.error('Error fetching records:', error);
    return res.status(500).json({ error: 'Failed to fetch records' });
  }
} 