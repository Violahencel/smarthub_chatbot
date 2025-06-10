## Update 1 ✅ COMPLETED
Feature: Data sharing between bots/participants
Approach: simple and basic

Flow:
- ✅ chat server accepts a wss message with code that identifies for data (not message).
- ✅ current data shared type could be image, document or JSON string
- ✅ sender adds the type before sending, default is string
- ✅ server returns a data_id for retrieval
- ✅ server storage is basic for now: simple file, maybe a .json file
- ✅ bot then send message tagging target bot, message contains [data_id: <id>]
- ✅ anyone can request this data with data_id

In UI:
- ✅ show clickable link in UI
- ✅ when click, a popup shows to display the content according to the data type

## Update 2 ✅ COMPLETED
- ✅ shared files are stored in physical file with extension relative to their type .txt, .json, .jpg, etc. etc.
- ✅ maintain a metadata.json file to keep references to these files for easy retrieval

## Update 3 ✅ COMPLETED
- ✅ Added MongoDB data layer for persistent storage
- ✅ Created repositories for shared data, messages, and channels

### MongoDB Data Layer Implementation

#### 1. Database Architecture
- MongoDB is used as the primary database for persistent storage
- Connection pooling with caching is implemented for efficiency
- Configuration via environment variables with sensible defaults
- Three main collections: `messages`, `channels`, and `shared_data`

#### 2. Repository Pattern
- Each data type has its own repository class:
  - `SharedDataRepository`: Manages shared data metadata
  - `MessageRepository`: Handles chat messages, including request/response tracking
  - `ChannelRepository`: Manages channel information and participants

#### 3. Key Features
- Connection caching to prevent multiple database connections
- Full CRUD operations for all repositories
- Support for pagination in list/search operations
- Automatic timestamp management for creation and updates
- Query capabilities for related data (e.g., responses for a specific request)

#### 4. Data Storage Strategy
- File content continues to be stored on disk for efficiency
- Metadata and references are stored in MongoDB
- Messages with requestId/parentRequestId are tracked for request-response pairs

#### 5. Implementation
- TypeScript interfaces for all data models
- Strongly typed MongoDB collections
- Asynchronous repository methods using Promises
- Error handling and logging for database operations

## Implementation Details

### 1. Data Storage Architecture
- All shared data is stored in a `/data` directory at the project root
- Files are named with unique IDs and appropriate extensions
- A central `metadata.json` file tracks all references and metadata

### 2. Data Endpoints
- Socket event `share_data`: For bots to share data via WebSocket 
- Socket event `get_data`: For retrieving data via WebSocket
- HTTP endpoint `/api/data/[dataId]`: For retrieving data via HTTP
- HTTP endpoint `/api/data/metadata`: For viewing and managing the metadata

### 3. Data Types Supported
- `string`: Plain text files (stored as .txt)
- `json`: JSON data (stored as .json)
- `image`: Binary image data (stored as .jpg, .png, etc.)
- `document`: Document data (stored as .txt for now)

### 4. UI Integration
- Messages containing data references (`[data_id: xxx]`) show clickable buttons
- Clicking the button opens a modal popup that displays the data
- The display is adapted based on data type (images, formatted JSON, text)

### 5. Efficient Storage
- Only text content is kept in memory
- Binary data (images) is stored efficiently on disk
- Files are streamed when needed rather than fully loaded

<!--- updated CR -->
- ✅ For all messages that has a requestId, log into the database
- ✅ For all messages that is a response to requestId (parentRequestId) log into the database.

## Update 4 ✅ COMPLETED
- ✅ Implemented database logging for messages with requestId
- ✅ Implemented database logging for response messages with parentRequestId
- ✅ Created unified message processing system for consistency across endpoints

### Message Logging Implementation

#### 1. Message Tracking System
- Messages containing a requestId tag `[requestId: xxx]` are automatically logged to MongoDB
- Response messages containing a parentRequestId tag `[parentRequestId: xxx]` are also logged
- This creates a complete trail of request-response pairs in the database
- Works consistently across all message sources (WebSocket, REST API, system messages)

#### 2. Technical Implementation
- Enhanced message processing to extract parentRequestId from message content
- Created a unified message processing function following DRY principles
- Applied the unified approach across all entry points (WebSocket and REST API)
- Error handling to ensure chat functionality continues even if database logging fails
- Non-qualifying messages (without requestId or parentRequestId) are still stored in memory

#### 3. Unified Message Handling
- Single entry point for message processing (`processMessage` function)
- Consistent behavior regardless of message source (WebSocket or REST API)
- Centralized database logging logic in `messageProcessor.ts`
- Singleton MessageRepository instance to prevent connection duplication
- Source tracking for improved debugging and monitoring
- Streamlined maintenance with reduced code duplication

#### 4. Message Processing Flow
- Message content is analyzed for tags, dataIds, requestIds, and parentRequestIds
- Message is created with all extracted metadata
- Message is added to the in-memory channel history
- If message contains requestId or parentRequestId, it's logged to MongoDB
- Message is broadcast to all participants in the channel
- Flow is identical regardless of entry point

#### 5. Benefits
- Persistent storage of important request-response interactions
- Ability to analyze and report on request patterns
- Support for auditing and compliance requirements
- Foundation for future analytics features
- Resilient implementation that continues to function even if database operations fail
- Easier maintenance with single source of truth for message processing
- Simplified debugging with consistent logging patterns

## Update 5 ✅ COMPLETED
- ✅ Added "status" in message object with parsing for status tags using format: `[status: value]`
- ✅ Implemented status propagation to parent requests when responses include status

### Status Tracking Implementation

#### 1. Status Support
- Messages can now include a status tag in the format: `[status: value]`
- Status values are flexible and not restricted to a predefined set
- Examples: `[status: cancelled]`, `[status: completed]`, `[status: error]`, `[status: in_progress]`, etc.
- All status values are automatically normalized to lowercase for consistency
- The status is extracted from the message content and added to the message object
- Status field is saved to the database for messages with requestId or parentRequestId

#### 2. Status Propagation
- When a message with a parentRequestId includes a status, it's saved to the message
- The status is also automatically propagated to the parent request message
- This ensures that the request and response status are synchronized
- Status updates are logged for debugging and monitoring

#### 3. Technical Implementation
- Enhanced message processing to extract status from message content using flexible regex pattern
- Added status field to the MessageModel interface
- Implemented findMessageByRequestId method in MessageRepository
- Added status update logic in the unified message processing function
- Preserved backward compatibility with existing messages

#### 4. Use Cases
- Bots can mark requests with any appropriate status: `[status: completed]`
- Error states can be tracked: `[status: error]`, `[status: failed]`
- Progress can be indicated: `[status: in_progress]`, `[status: waiting]`
- Custom workflow states can be implemented: `[status: requires_approval]`
- Status can be used to filter and categorize request-response pairs
- UI can display different styling based on status

#### 5. Benefits
- Complete tracking of request-response lifecycle
- Ability to identify problematic or failed interactions
- Support for analytics based on completion status
- Foundation for more advanced workflow tracking
- Flexibility for different use cases and workflows

## Shared Data Storage

### MongoDB Integration for Shared Data Metadata

The system has been updated to store shared data metadata in MongoDB instead of a JSON file. This change offers several benefits:

1. **Scalability**: MongoDB can handle a much larger volume of data than a local JSON file.
2. **Query Performance**: MongoDB offers efficient query capabilities, especially for large datasets.
3. **Concurrent Access**: Multiple processes can read and write to MongoDB simultaneously without file locking issues.
4. **Cloud Readiness**: The metadata structure is now ready for future cloud storage integration.

#### Implementation Details

- **Data Model**: The `SharedDataModel` interface has been enhanced to include fields like timestamp, senderId, and originalSize.
- **File Storage Path**: While files are still stored on the local file system, their paths are now stored as full URLs, making future migration to cloud storage simpler.
- **API Endpoints**: 
  - `/api/data/upload.ts` now saves metadata to MongoDB
  - `/api/data/[dataId].ts` retrieves metadata from MongoDB
  - `/api/data/files/[filename].ts` serves the actual files

#### Centralized Type Definitions

A new type system has been implemented for shared data:

- **Shared Types**: All shared data interfaces are now centralized in `src/types/shared-data.ts`
- **Consistent Interfaces**: This ensures consistent data structure across socket handlers and REST API endpoints
- **Type Safety**: Improved type checking for data passing between modules
- **Reduced Duplication**: Eliminated duplicate type definitions across files

Main interfaces in the centralized type system:
- `SharedData`: For in-memory storage
- `SharedDataMetadata`: For file metadata
- `SharedDataModel`: For MongoDB storage
- `FileUploadResponse`: For API responses

#### Backward Compatibility

For backward compatibility, the system still maintains an in-memory store of shared data during runtime. This ensures existing code that relies on the in-memory store continues to function correctly.

## Update 6 ✅ COMPLETED - JSON Content Display Enhancement

### Feature: Improved JSON Viewing in Messages

A new feature has been added to enhance the readability of JSON content within messages:

#### 1. JSON Content Detection
- Messages containing content wrapped in `[json]` and `[/json]` tags are detected
- The JSON content between these tags is extracted and validated
- The tags and raw JSON content are hidden from the normal message display

#### 2. UI Implementation
- A clickable button labeled "View JSON" replaces the raw JSON content in the message
- Clicking this button opens a modal dialog displaying the JSON in a properly formatted, indented view
- The modal can be closed by pressing ESC or clicking a close button

#### 3. User Experience Benefits
- Cleaner message display without lengthy JSON strings cluttering the conversation
- Better readability of JSON data through proper formatting and indentation
- Improved navigation with keyboard shortcuts for the modal
- Ability to read complex data structures more easily

#### 4. Technical Implementation
- JSON validation to ensure proper formatting
- Syntax highlighting for better readability
- Error handling for malformed JSON
- Responsive modal design that works on mobile and desktop

#### 5. Use Cases
- Bot responses containing structured data
- API responses shared in the chat
- Configuration settings being discussed
- Debug information in a more readable format

## Update 7 ✅ COMPLETED
- ✅ Added a new table (collection) for prompts in MongoDB database
- ✅ Implemented API endpoints for CRUD operations for LLM prompts

### Prompt Management System

This update adds a complete system for managing LLM (Large Language Model) prompts, with a focus on storage efficiency and cloud migration readiness.

#### 1. Prompt Storage Architecture
- Hybrid storage approach with file-based content and MongoDB metadata
- Prompt content stored as text files in `/data/prompts/` directory
- Metadata and file references stored in MongoDB for efficient querying
- Design pattern compatible with future cloud storage migration

#### 2. Database Schema
The `prompts` collection in MongoDB includes comprehensive metadata:
- Basic info: title, description, tags
- File info: fileUrl, filePath, fileSize, contentType
- Tracking: createdAt, updatedAt, createdBy, version
- Status: isActive flag
- Custom data: flexible metadata object

#### 3. API Endpoints
Complete REST API for prompt management:
- Standard CRUD operations through `/api/prompts` endpoints
- Separate content management with `/api/prompts/content` endpoints
- Search functionality with text search and filtering options

#### 4. Implementation Details
- Repository pattern consistent with existing codebase
- Text search powered by MongoDB full-text search
- File management utility for prompt file operations
- Version tracking for audit purposes
- Comprehensive error handling

See the detailed documentation in [docs/update7-docs.md](./update7-docs.md) for complete API reference and usage examples.