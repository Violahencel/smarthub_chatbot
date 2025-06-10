import type { NextApiRequest, NextApiResponse } from 'next';
import { PromptRepository } from '../../../repositories/promptRepository';
import { PromptUpdateInput } from '../../../types/prompt';

// Initialize prompt repository
const promptRepository = new PromptRepository();

/**
 * API handler for /api/prompts/[id] endpoint
 * GET: Get a specific prompt
 * PUT: Update a prompt
 * DELETE: Delete a prompt
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
        return await handleGetPrompt(id, res);
      case 'PUT':
        return await handleUpdatePrompt(id, req, res);
      case 'DELETE':
        return await handleDeletePrompt(id, res);
      default:
        // Method not allowed
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Error in /api/prompts/[id]:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handles GET requests to retrieve a specific prompt
 */
async function handleGetPrompt(
  id: string,
  res: NextApiResponse
) {
  // Get the prompt from the repository
  const prompt = await promptRepository.findById(id);
  
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  
  // Return the prompt
  res.status(200).json(prompt);
}

/**
 * Handles PUT requests to update a prompt
 */
async function handleUpdatePrompt(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get the prompt first to check if it exists
  const existingPrompt = await promptRepository.findById(id);
  
  if (!existingPrompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  
  // Validate and extract update data
  const { title, description, tags, isActive, metadata } = req.body;
  
  const updates: PromptUpdateInput = {};
  
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (tags !== undefined) updates.tags = tags;
  if (isActive !== undefined) updates.isActive = isActive;
  if (metadata !== undefined) updates.metadata = metadata;
  
  // Update the prompt
  const success = await promptRepository.update(id, updates);
  
  if (success) {
    // Get the updated prompt
    const updatedPrompt = await promptRepository.findById(id);
    res.status(200).json(updatedPrompt);
  } else {
    res.status(500).json({ error: 'Failed to update prompt' });
  }
}

/**
 * Handles DELETE requests to delete a prompt
 */
async function handleDeletePrompt(
  id: string,
  res: NextApiResponse
) {
  // Check if the prompt exists
  const existingPrompt = await promptRepository.findById(id);
  
  if (!existingPrompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  
  // Delete the prompt
  const success = await promptRepository.delete(id);
  
  if (success) {
    res.status(200).json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
} 