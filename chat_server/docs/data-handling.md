# Data Handling Documentation

## Overview
The system handles different types of data through the `/api/data/[dataId]` endpoint. This document explains the various approaches and how they coexist.

## Data Types and Storage

### 1. File Uploads (PDF Documents)
- **Storage Location**: `uploads/` directory
- **Identification**: Files with `filePath` starting with `/api/data/`
- **Metadata Storage**: MongoDB `shared_data` collection
- **Access Pattern**: 
  - Files are streamed directly to the client
  - Content-Type and Content-Disposition headers are set appropriately
  - Files are searched across all subdirectories in the uploads folder

### 2. Legacy Shared Data
- **Storage Location**: `shared_data/` directory
- **Identification**: Files without `/api/data/` prefix in filePath
- **Metadata Storage**: 
  - Primary: MongoDB `shared_data` collection
  - Fallback: In-memory store (for backward compatibility)
- **Access Pattern**: 
  - Data is read and returned as JSON
  - Supports text-based content

## API Behavior

### `/api/data/[dataId]` Endpoint Logic

1. **Metadata Lookup**:
   ```typescript
   // First try MongoDB
   const dataMetadata = await sharedDataRepo.getDataById(dataId);
   
   // Fallback to in-memory store if not found
   if (!dataMetadata) {
     const sharedDataStore = (global as any).sharedDataStore;
     // ... handle in-memory data
   }
   ```

2. **File Type Detection**:
   ```typescript
   // Check if this is a file upload
   if (dataMetadata.filePath?.startsWith('/api/data/')) {
     // Handle file upload
   } else {
     // Handle legacy shared data
   }
   ```

3. **Response Handling**:
   - For file uploads: Streams the file with appropriate headers
   - For legacy data: Returns JSON with content and metadata

## Important Notes

1. **Backward Compatibility**:
   - The system maintains support for the in-memory store
   - Legacy data in `shared_data/` directory is still accessible

2. **File Search Strategy**:
   - Uploaded files are searched across all subdirectories
   - This allows for flexible organization of uploaded files

3. **Error Handling**:
   - 404 if data not found in either storage
   - 500 for streaming errors
   - 400 for invalid dataId

## Future Considerations

1. **Migration Path**:
   - Consider moving all data to MongoDB for consistency
   - Plan for deprecation of in-memory store

2. **Storage Optimization**:
   - Consider implementing file deduplication
   - Add file cleanup for unused uploads

3. **Security**:
   - Implement file type validation
   - Add access control based on user permissions 