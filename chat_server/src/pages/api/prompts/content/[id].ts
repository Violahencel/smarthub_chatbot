import type { NextApiRequest, NextApiResponse } from 'next';
import { PromptRepository } from '../../../../repositories/promptRepository';

// Initialize prompt repository
const promptRepository = new PromptRepository();

/**
 * API handler for /api/prompts/content/[id] endpoint
 * GET: Get the content of a specific prompt
 * PUT: Update the content of a prompt
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.query;
    
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid prompt ID' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetPromptContent(id, res);
      case 'PUT':
        return await handleUpdatePromptContent(id, req, res);
      default:
        // Method not allowed
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Error in /api/prompts/content/[id]:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handles GET requests to retrieve prompt content
 */
async function handleGetPromptContent(
  id: string,
  res: NextApiResponse
) {
  try {
    // First check if the prompt exists
    const prompt = await promptRepository.findById(id);
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    // Get the content
    const content = await promptRepository.getContent(id);
    
    // Set appropriate content type and return the content
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(content);
  } catch (error) {
    if ((error as Error).message?.includes('not found')) {
      return res.status(404).json({ error: 'Prompt content not found' });
    }
    throw error;
  }
}

/**
 * Handles PUT requests to update prompt content
 */
async function handleUpdatePromptContent(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if the prompt exists
  const prompt = await promptRepository.findById(id);
  
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  
  // Validate request body
  const { content } = req.body;
  
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required and must be a string' });
  }
  
  // Update the content
  const success = await promptRepository.updateContent(id, content);
  
  if (success) {
    res.status(200).json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to update prompt content' });
  }
} 