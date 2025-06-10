/**
 * Data Sharing Examples for Bot Implementation
 * 
 * This file demonstrates how bots can use the data sharing functionality
 * to share different types of data between participants in the chat.
 */

// Import Socket.IO client
const { io } = require('socket.io-client');

// Connect to the Socket.IO server
const socket = io('http://localhost:3000', {
  path: '/api/socket',
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Register the bot when connected
socket.on('connect', () => {
  console.log(`Connected to socket server with ID: ${socket.id}`);
  
  // Register the bot
  socket.emit('register', {
    botId: 'example-bot',
    name: 'Example Bot',
    type: 'utility' // Optional: bot type
  });
  
  // Join a channel
  socket.emit('join_channel', 'general');
});

/**
 * Example 1: Sharing text data (string type)
 * 
 * Use this to share simple text information with other participants.
 */
function shareTextData() {
  const textContent = "This is some important information to share with the team.";
  
  socket.emit('share_data', {
    channelId: 'general',
    content: textContent,
    type: 'string' // default type if omitted
  }, (response) => {
    if (response.error) {
      console.error('Error sharing text data:', response.error);
      return;
    }
    
    const dataId = response.dataId;
    console.log(`Text data shared with ID: ${dataId}`);
    
    // Now send a message referencing this data
    socket.emit('message', {
      channelId: 'general',
      content: `I've shared some important information with you: [data_id: ${dataId}]`
    });
  });
}

/**
 * Example 2: Sharing structured JSON data
 * 
 * Use this to share structured data like API responses, configuration,
 * or any complex data that can be represented as JSON.
 */
function shareJsonData() {
  const jsonData = {
    title: "Project Timeline",
    project: "Chat System Enhancement",
    milestones: [
      { name: "Planning", date: "2023-05-01", status: "completed" },
      { name: "Development", date: "2023-06-15", status: "in-progress" },
      { name: "Testing", date: "2023-07-30", status: "pending" }
    ],
    owner: "Team Alpha"
  };
  
  socket.emit('share_data', {
    channelId: 'general',
    content: JSON.stringify(jsonData, null, 2), // Pretty-print the JSON
    type: 'json'
  }, (response) => {
    if (response.error) {
      console.error('Error sharing JSON data:', response.error);
      return;
    }
    
    const dataId = response.dataId;
    console.log(`JSON data shared with ID: ${dataId}`);
    
    // Now send a message referencing this data
    socket.emit('message', {
      channelId: 'general',
      content: `@analytics Here's the project timeline data: [data_id: ${dataId}]`
    });
  });
}

/**
 * Example 3: Sharing an image
 * 
 * Use this to share images. The image needs to be converted to a
 * base64 data URL format before sharing.
 */
function shareImageData() {
  // In a real implementation, this might come from:
  // - Reading a file with fs.readFile()
  // - Processing an image with a library
  // - Receiving an image from an API
  
  // This is an example base64 data URL for a small image
  // In real code, you would generate this from an actual image file
  const imageDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH5gMTCx8aP8pLigAABB1JREFSOBHFVFtsU2UYPf9y+deuF7bSjZW12zoYY46NQUAmWyIJN1mIkcSYLYYXfDAaE31QY3zxEmJ8MJgYMYExtBCQcHHDzQgGAQcM2MbWsMnGWNnat3N/6M/Xzra7/wUTTfrS79zOd/3OOcD/QEw+sLOzE8FgECsrK2/U19e/nc/nEQqFsLo6Pn9SdR+tazDOeXwlTE1NrR7yhYDRKyMwzClomgZJFOHz+bC4uAiPx5MwGo37LBZLo8PhQCqVQiqRGswp9t5QdhE+nw/JZHKdQQB48uQJ/H4/wuEwRFGErutQFAXd3d3vK4rypcfjsZMXULUcklGffNDf5UUiwuZvX+Cefz8KhYIxpHa7HYlEAhaLBc3NzR94vd73JEkCx3GoqiBF467Tk4PfyK7NTjRtcaK98y10tXdAEARjSB88ePB7OBx+VZbl11RVfY6wxGKxn7PZ7Bfr6X0Rz6r8+2eHw6+8PjY29h2Ay+RibW0Np06dQkNDA5LJ5BFCkMlkoGkalpaWfhoaGrqZSqXQ1dUFWZaxuLj4I72rzF8lPO/c+Rt3PmxpaTnpcDj2ilYZoiiC4zh0dHT0FgqFL9fX15HL5VAsFmGz2WC1WiGKoqEgQSXv+0RzN+GVJvPMKVjdOoJjE8jJBuXZ2VksLy+jra3tWH9//7d+vx/RaJSQ56nVNBXNzc04fvw4JiYmYDKZXiawfPP+hOsRSg9G0N+qwOVyGWRulwuBQAAtLS3o6enB3bt3QQwMcnd3N9LpNKanp384e/bs52SUaKlUIiPCFbsNLjqGbDbXS/aFpaUlcy6XQzQaBemIeDwOsp+YmZlBMBjE0NAQwuGwkc3k5CTGx8cxOjqKTCaDRCKBcDgETdNM1FZZFIkNCEEuVaISJbdIhp1+wePxiKQD6MIZ0YG5uTnDhYaGBlB/E9bVVnZ3dxscDx8+NNjJkZoWFhZAXCbnKCnGHvN6ve5IJAKO4xkmj67rsNvtIIWRaDTqnp+fLx8+fBi1tbUgu41JlUvnMPzB29i5dQPIgWWcOngco+N3DfXN5KfVaoXP52svFAq9nPQMZ/lkAVIWRo4CHOHlGrg4FT5PAOVrD7BnxwssRxmXLv+M6YdXYbbwcDpkUDMKpTKjwU8PDFy4cGHvmcGLZyxWu5tlWeZFQlyRYbOOxKUlS5YFZgQrHDYFpfIczJKOzZs3IZNRMHb3H9TX2fDbH5fOj/wx+m76PyFQdHZ0dHz058RE2mQOHNEYI1dL1WrFQCQcgdliBuPgWEZHgdlVzChI7KvQVdvDJ8+enT95/gfj/4g8PT09m91u95fJzIuqWlZERSmqqk6RWpKVwLIsJ/I8L1YqFcSJh4yKzWb7JB3dUNNq3rR/AEPGjt1XHAcJAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIyLTAzLTE5VDExOjMxOjI2KzAwOjAwL9/aygAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMi0wMy0xOVQxMTozMToyNiswMDowMF6CYnYAAAAASUVORK5CYII=";
  
  socket.emit('share_data', {
    channelId: 'general',
    content: imageDataUrl,
    type: 'image'
  }, (response) => {
    if (response.error) {
      console.error('Error sharing image data:', response.error);
      return;
    }
    
    const dataId = response.dataId;
    console.log(`Image shared with ID: ${dataId}`);
    
    // Now send a message referencing this image
    socket.emit('message', {
      channelId: 'general',
      content: `Here's the diagram we discussed: [data_id: ${dataId}]`
    });
  });
}

/**
 * Example 4: Sharing a document
 * 
 * Use this to share longer text content that should be treated as a document.
 */
function shareDocumentData() {
  // A document could be loaded from a file in a real implementation
  const documentContent = `# Meeting Minutes - Project Planning
  
Date: 2023-03-15
Participants: John, Sarah, Miguel, Alex

## Agenda Items

1. Project timeline review
2. Resource allocation
3. Risk assessment

## Discussion Points

The team discussed the current project timeline and identified potential bottlenecks in the development phase. 
Sarah suggested adding an additional QA resource to help mitigate risks.

## Action Items

- John: Update project timeline by Friday
- Miguel: Prepare resource allocation document
- Alex: Schedule follow-up meeting for next week

## Next Steps

We will reconvene next Tuesday to review progress on action items.`;
  
  socket.emit('share_data', {
    channelId: 'general',
    content: documentContent,
    type: 'document'
  }, (response) => {
    if (response.error) {
      console.error('Error sharing document data:', response.error);
      return;
    }
    
    const dataId = response.dataId;
    console.log(`Document shared with ID: ${dataId}`);
    
    // Now send a message referencing this document
    socket.emit('message', {
      channelId: 'general',
      content: `@team Here are the meeting minutes from today: [data_id: ${dataId}]`
    });
  });
}

/**
 * Example 5: Retrieving shared data
 * 
 * Bots can also retrieve data that was shared by others.
 */
function retrieveSharedData(dataId) {
  // Method 1: Using the socket event
  socket.emit('get_data', dataId, (data) => {
    if (data.error) {
      console.error('Error retrieving data:', data.error);
      return;
    }
    
    console.log('Retrieved data:', {
      id: data.id,
      type: data.type,
      timestamp: new Date(data.timestamp).toLocaleString()
    });
    
    // Process the data based on its type
    switch (data.type) {
      case 'json':
        const jsonData = JSON.parse(data.content);
        console.log('Parsed JSON:', jsonData);
        break;
      case 'image':
        console.log('Image data URL length:', data.content.length);
        // In a real implementation, you might:
        // - Display the image in a UI
        // - Save it to a file
        // - Process it with an image library
        break;
      default:
        console.log('Content:', data.content);
    }
  });
  
  // Method 2: Alternative approach using HTTP endpoint
  // This could be used in a web environment or where fetch is available
  /*
  fetch(`/api/data/${dataId}`)
    .then(response => response.json())
    .then(result => {
      console.log('Retrieved data via HTTP:', result.data);
    })
    .catch(error => {
      console.error('Error retrieving data via HTTP:', error);
    });
  */
}

// Event listeners
socket.on('disconnect', () => {
  console.log('Disconnected from socket server');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Export the example functions
module.exports = {
  shareTextData,
  shareJsonData,
  shareImageData,
  shareDocumentData,
  retrieveSharedData
};

// Usage example:
// When bot detects a specific command in a message, it can share data
// e.g., detect "!share-timeline" and call shareJsonData() 