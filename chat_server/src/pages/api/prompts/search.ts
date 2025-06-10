import type { NextApiRequest, NextApiResponse } from 'next';
import { PromptRepository } from '../../../repositories/promptRepository';
import { PromptModel } from '../../../types/prompt';

// Initialize prompt repository
const promptRepository = new PromptRepository();

/**
 * API handler for /api/prompts/search endpoint
 * GET: Search for prompts by query
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Parse additional filters
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;
    const createdBy = req.query.createdBy as string | undefined;
    const tags = req.query.tags ? (Array.isArray(req.query.tags) 
      ? req.query.tags as string[] 
      : [req.query.tags as string]) 
      : undefined;

    // Search prompts
    const prompts = await promptRepository.search(query, {
      limit,
      offset,
      isActive,
      createdBy,
      tags
    });

    res.status(200).json({ prompts, count: prompts.length });
  } catch (error) {
    console.error('Error in /api/prompts/search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 