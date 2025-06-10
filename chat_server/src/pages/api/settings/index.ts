import { NextApiRequest, NextApiResponse } from 'next';
import { DynamicRepository } from '@/repositories/DynamicRepository';
import { SettingsModel } from '@/types/settings';

const settingsRepo = new DynamicRepository('settings');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        const settings = await settingsRepo.find({ isActive: true });
        res.status(200).json({ settings });
        break;

      case 'POST':
        const newSetting = req.body as SettingsModel;
        const created = await settingsRepo.create(newSetting);
        res.status(201).json({ setting: created[0] });
        break;

      case 'PUT':
        const { _id, ...updateData } = req.body;
        const updated = await settingsRepo.update(_id, updateData);
        res.status(200).json({ setting: updated });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Settings API error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 