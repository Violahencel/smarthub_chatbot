# Update 7: LLM Prompt Management

## Overview

Update 7 adds a comprehensive prompt management system for LLMs (Large Language Models). It includes a database table for storing prompt metadata and a set of API endpoints for CRUD operations on prompts.

## Key Features

### 1. Prompt Storage Architecture

- **File-based Content Storage**: Prompt content is stored in text files on disk for efficiency and future migration to cloud storage
- **MongoDB Metadata**: Prompt metadata is stored in MongoDB for efficient querying and retrieval
- **Versioning**: Each prompt tracks version information for auditing and history

### 2. Database Schema

The MongoDB `prompts` collection includes the following fields:

- `_id`: Unique identifier for the prompt
- `title`: Descriptive name for the prompt
- `description`: Longer description of the prompt's purpose
- `fileUrl`: Web URL to access the prompt content
- `filePath`: Server-side path to the content file
- `fileSize`: Size of the prompt file in bytes
- `contentType`: Content type (typically text/plain)
- `tags`: Array of tags for categorization and filtering
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `createdBy`: User/system that created the prompt
- `isActive`: Whether the prompt is currently active
- `version`: Version number (incremented on updates)
- `metadata`: Additional flexible metadata object

### 3. API Endpoints

The following REST API endpoints are available:

#### Prompt Management

- **GET /api/prompts**: List all prompts with filtering options
  - Query params: `limit`, `offset`, `isActive`, `createdBy`, `tags`
  - Returns: List of prompts with pagination info

- **GET /api/prompts/:id**: Get metadata for a specific prompt
  - Returns: Prompt metadata object

- **POST /api/prompts**: Create a new prompt
  - Body: `title`, `content`, `description`, `tags`, `createdBy`, `isActive`, `metadata`
  - Returns: ID of the created prompt

- **PUT /api/prompts/:id**: Update a prompt's metadata
  - Body: `title`, `description`, `tags`, `isActive`, `metadata`
  - Returns: Updated prompt metadata

- **DELETE /api/prompts/:id**: Delete a prompt
  - Returns: Success status

#### Prompt Content

- **GET /api/prompts/content/:id**: Get the actual content of a prompt
  - Returns: Raw prompt text content

- **PUT /api/prompts/content/:id**: Update a prompt's content
  - Body: `content`
  - Returns: Success status

#### Search

- **GET /api/prompts/search**: Search for prompts
  - Query params: `q` (required), `limit`, `offset`, `isActive`, `createdBy`, `tags`
  - Returns: List of matching prompts

### 4. Usage Examples

#### Creating a New Prompt

```javascript
const response = await fetch('/api/prompts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Customer Service Greeting',
    content: 'You are a helpful customer service agent. Respond to the customer in a friendly and professional manner.',
    tags: ['customer-service', 'greeting'],
    description: 'Basic prompt for customer service interactions',
    metadata: {
      recommendedModel: 'gpt-4',
      maxTokens: 150
    }
  })
});
const { id } = await response.json();
```

#### Retrieving Prompts

```javascript
// List all active prompts
const response = await fetch('/api/prompts?isActive=true');
const { prompts, total } = await response.json();

// Get a specific prompt
const promptResponse = await fetch(`/api/prompts/${id}`);
const prompt = await promptResponse.json();

// Get prompt content
const contentResponse = await fetch(`/api/prompts/content/${id}`);
const content = await contentResponse.text();
```

#### Searching Prompts

```javascript
// Search for prompts related to "customer"
const searchResponse = await fetch('/api/prompts/search?q=customer&tags=greeting');
const { prompts } = await searchResponse.json();
```

## Implementation Notes

- Text search is powered by MongoDB's full-text search capabilities
- Prompt files are stored in the `/data/prompts/` directory
- The file structure is designed for future migration to cloud storage
- All operations maintain consistent versioning and timestamps 