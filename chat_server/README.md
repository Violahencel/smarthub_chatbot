# Chat Admin Panel

This is the admin panel for the chat server.

## Configuration

### Service Manager

The Service Manager allows you to start and stop various Python services with a simple UI. To configure your services, follow these steps:

1. Create or edit `.env.local` in the root directory
2. Add the `NEXT_PUBLIC_COMMANDS` variable with a JSON array of commands

Example configuration:

```
NEXT_PUBLIC_COMMANDS='[
  {
    "id": "1",
    "name": "Fileprep Main Service",
    "command": "D:/services/fileprep|conda activate env_name|script.py",
    "status": "stopped"
  },
  {
    "id": "2",
    "name": "Secondary Service",
    "command": "D:/services/secondary|venv/Scripts/activate|run.py",
    "status": "stopped"
  }
]'
```

Each command should have:
- `id`: Unique identifier for the command
- `name`: Display name in the UI
- `command`: The command to execute, in the format: `directory|venv_path|script_path`
- `status`: Initial status, should be "stopped" initially

The format for commands is: `directory|venv_activation_command|script_name.py`

## Running the Admin Panel

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) to view the admin panel.

## Features

- Start/stop conversation channel
- Real-time message updates via WebSockets
- Clean, responsive UI

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Run the development server:
   ```
   npm run dev
   ```

3. Build for production:
   ```
   npm run build
   ```

4. Start the production server:
   ```
   npm start
   ```

The frontend will be available at http://localhost:3000

## Project Structure

- `src/` - Source code
  - `components/` - React components
    - `Channel/` - Channel-related components
    - `Conversation/` - Conversation display components
    - `UI/` - Reusable UI components
  - `pages/` - Next.js pages
  - `styles/` - Global styles
  - `utils/` - Utility functions