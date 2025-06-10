## Update 11
Enable sending message to individual participants from the UI. When clicked on participants a modal window pops up showing control options.

Participants will now have "window_hwnd" property which is a handle to their application window.

We have implemented a more streamlined approach:

1. Created API endpoints for participant management:
   - `/api/channels/[channelId]/controlCommand.ts` - For sending control commands to participants

2. Redesigned the ParticipantActionModal with:
   - A compact layout showing name and type on a single row
   - Window handle (HWND) displayed in a badge format when available
   - A clean "Actions" section with a "Cancel Task" button for bot participants
   - Improved visual hierarchy with lightweight headers and appropriate spacing

3. The modal now uses REST API calls instead of direct Socket.IO connections:
   - Uses fetch() to send commands through the API endpoints
   - APIs handle the Socket.IO communication in the backend
   - System messages automatically notify channel participants of actions taken

4. Enhanced UI/UX:
   - Reduced modal size and footprint for a less intrusive experience
   - Condensed information display with badge-style elements
   - Clear visual separation between information and actions
   - Simplified controls with focused action buttons
