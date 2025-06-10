import type { NextApiRequest, NextApiResponse } from 'next';
import { PromptRepository } from '../../../repositories/promptRepository';
import { PromptCreateInput, PromptListResponse } from '../../../types/prompt';

// Initialize prompt repository
const promptRepository = new PromptRepository();

/**
 * API handler for /api/prompts endpoint
 * GET: List prompts with optional filtering
 * POST: Create a new prompt
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGetPrompts(req, res);
      case 'POST':
        return await handleCreatePrompt(req, res);
      default:
        // Method not allowed
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Error in /api/prompts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handles GET requests to list prompts
 */
async function handleGetPrompts(
  req: NextApiRequest,
  res: NextApiResponse<PromptListResponse | { error: string }>
) {
  // Parse query parameters
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;
  const createdBy = req.query.createdBy as string | undefined;
  const tags = req.query.tags ? (Array.isArray(req.query.tags) 
    ? req.query.tags as string[] 
    : [req.query.tags as string]) 
    : undefined;

  // Get prompts from repository
  const prompts = await promptRepository.findAll({
    limit,
    offset,
    isActive,
    createdBy,
    tags
  });

  // Get total count for pagination
  const total = await promptRepository.count({
    isActive,
    createdBy,
    tags
  });

  // Return response
  res.status(200).json({
    prompts,
    total,
    limit,
    offset
  });
}

/**
 * Handles POST requests to create a new prompt
 */
async function handleCreatePrompt(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Validate request body
  const { title, content, description, tags, createdBy, isActive, metadata } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Title is required and must be a string' });
  }

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required and must be a string' });
  }

  // Create prompt
  const promptInput: PromptCreateInput = {
    title,
    content,
    description,
    tags,
    createdBy,
    isActive,
    metadata
  };

  const id = await promptRepository.create(promptInput);

  // Return the created prompt ID
  res.status(201).json({ id });
} 