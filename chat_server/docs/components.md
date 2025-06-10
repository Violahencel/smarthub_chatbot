# Reusable Components Documentation

## FileUploadModal

A reusable modal component for handling file uploads with configurable options.

### Props

- `isOpen` (boolean): Controls the visibility of the modal
- `onClose` (function): Callback when the modal is closed
- `onUploadComplete` (function): Callback when files are successfully uploaded
- `title` (string, optional): Custom title for the modal (default: "Upload PDF Files")
- `folderPath` (string, optional): Target folder for file uploads (default: "aido_order_files")
- `maxFileSize` (number, optional): Maximum file size in bytes (default: 3MB)
- `allowedTypes` (string[], optional): Array of allowed MIME types (default: ["application/pdf"])
- `multiple` (boolean, optional): Whether to allow multiple file selection (default: true)

### Usage Example

```tsx
<FileUploadModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onUploadComplete={(records) => console.log(records)}
  title="Upload Documents"
  folderPath="documents"
  maxFileSize={5 * 1024 * 1024} // 5MB
  allowedTypes={['application/pdf', 'image/jpeg']}
  multiple={false}
/>
```

## StartTaskButton

A specialized button component for starting Aido order processing tasks.

### Props

- `className` (string, optional): Additional CSS classes for the button
- `buttonText` (string, optional): Custom text for the button (default: "Start New Task")
- `folderPath` (string, optional): Target folder for file uploads (default: "aido_order_files")
- `onUploadComplete` (function, optional): Additional callback after upload completion

### Usage Example

```tsx
<StartTaskButton
  className="my-custom-class"
  buttonText="Process Orders"
  folderPath="orders"
  onUploadComplete={(records) => {
    // Additional handling after upload
    console.log('Upload completed:', records);
  }}
/>
```

### Features

- Opens a file upload modal for PDF files
- Handles file validation and upload
- Sends a message to the chat channel after successful upload
- Supports custom styling and text
- Configurable upload folder path
- Optional callback for additional post-upload actions

### Message Format

After successful upload, the component sends a message to the chat channel with the following format:

```json
{
  "channelId": "general",
  "content": {
    "action": "start_task",
    "files": [
      {
        "id": "file_id",
        "name": "file_name.pdf",
        "path": "file_path"
      }
    ]
  }
}
```

### Error Handling

- Validates file types and sizes before upload
- Shows upload progress indicator
- Handles upload failures gracefully
- Logs errors to console for debugging

### Dependencies

- Uses the FileUploadModal component
- Requires a chat API endpoint at `/api/channels/general/sendMessage`
 