# Aido Order Processing Implementation ✅

> Status: Completed
> 
> Implementation includes:
> - Self-contained StartTaskButton component with channel state handling
> - Reusable FileUploadModal component
> - Complete file upload workflow with database integration
> - Chat message integration for task initiation
> - Security and error handling measures

## Component Structure

### StartTaskButton Component
A self-contained unit that handles the complete workflow of starting an Aido order processing task.

#### Features
- Opens a file upload modal for PDF files
- Handles file validation and upload
- Manages upload state and processing state
- Sends a message to the chat channel after successful upload
- Shows processing state in the button UI
- Disabled when channel is not active

#### Props
- `className` (optional): Additional CSS classes for styling
- `buttonText` (optional): Custom text for the button (default: "Start New Task")
- `isChannelActive` (optional): Whether the chat channel is active (default: false)

#### Usage Example
```tsx
<StartTaskButton 
  className="my-custom-class"
  buttonText="Process Orders"
  isChannelActive={channelActive}
/>
```

#### Workflow
1. Button is disabled if channel is not active
2. User clicks the button to open the file upload modal (only when channel is active)
3. User selects one or more PDF files
4. Files are uploaded to the server
5. On successful upload:
   - Creates records in the database
   - Sends a message to the chat channel
   - Closes the modal
   - Updates button state to show processing
6. Handles errors gracefully with appropriate UI feedback

### FileUploadModal Component
A reusable modal component for file uploads, used internally by StartTaskButton.

#### Props
- `isOpen`: Controls modal visibility
- `onClose`: Callback when modal is closed
- `onUploadComplete`: Callback when files are uploaded
- `title`: Modal title
- `folderPath`: Target folder for uploads
- `maxFileSize`: Maximum file size
- `allowedTypes`: Allowed file types
- `multiple`: Allow multiple file selection

## API Endpoints

### File Upload Endpoint
`POST /api/aido-order/upload`

Handles file uploads with the following features:
- Validates file types (PDF only)
- Generates unique filenames
- Stores files in configured upload directory
- Creates records in both AidoOrderProcessing and SharedData collections
- Returns uploaded file records

#### Request Format
```typescript
FormData {
  files: File[],
  folder: string
}
```

#### Response Format
```typescript
{
  records: Array<{
    url: string,
    original_filename: string,
    file_type: string,
    id: string,
    folder_path: string
  }>
}
```

## Database Schema

### AidoOrderProcessing Collection
```typescript
{
  url: string,              // File URL path
  original_filename: string, // Original file name
  file_type: string,        // MIME type
  id: string,               // Unique identifier
  folder_path: string,      // Upload folder path
  created_at: Date          // Creation timestamp
}
```

### SharedData Collection
```typescript
{
  id: string,               // Unique identifier
  type: 'document',         // Data type
  filePath: string,         // File URL path
  timestamp: number,        // Creation timestamp
  senderId: string,         // System sender ID
  originalSize: number,     // File size
  createdAt: number,        // Creation timestamp
  metadata: {
    filename: string,       // Original filename
    contentType: string,    // MIME type
    size: number           // File size
  }
}
```

## Message Format
After successful upload, a message is sent to the chat channel with the following format:

```json
{
  "channelId": "general",
  "content": {
    "action": "start_task",
    "data": [
      {
        "url": "/api/data/filename.pdf",
        "original_filename": "original.pdf",
        "file_type": "application/pdf",
        "id": "unique-id",
        "folder_path": "aido_order_files"
      }
    ]
  }
}
```

## Configuration
File upload configuration is managed through `FILE_UPLOAD_CONFIG`:
```typescript
{
  baseUploadFolder: string,  // Base directory for uploads
  maxFileSize: number,       // Maximum file size in bytes
  allowedTypes: string[]     // Allowed MIME types
}
```

## Error Handling
- File type validation
- File size limits
- Upload process errors
- Database operation errors
- Message sending errors
- UI feedback for all error states

## Security Considerations
- Files are stored in a restricted area
- File paths are not directly exposed
- File types are strictly validated
- Unique filenames prevent overwrites
- Database records track all operations