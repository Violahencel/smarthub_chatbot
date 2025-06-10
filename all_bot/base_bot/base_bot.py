import queue
import asyncio
import re
import socketio
import os
import time
import json
import threading
import random
import sys
import signal
import datetime
from dotenv import load_dotenv


class EventEmitter:
    def __init__(self):
        self._events = {}
        self.config = {}
        
    def on(self, event, listener):
        if event not in self._events:
            self._events[event] = []
        self._events[event].append(listener)
        
    def emit(self, event, *args, **kwargs):
        if event in self._events:
            for listener in self._events[event]:
                listener(*args, **kwargs)
                
class BaseBot(EventEmitter):
    def __init__(self, options=None):
        super().__init__()
        
        # Load environment variables
        load_dotenv()
        
        print('base bot intialization')

        # Bot configuration with defaults and overrides
        self.options = options or {}
        self.config.update({
            "bot_id": self.options.get("bot_id", os.getenv("BOT_ID", "base-bot")),
            "window_hwnd": self.options.get("window_hwnd", 0),
            "commands": self.options.get("commands", {}),
            "bot_name": self.options.get("bot_name", os.getenv("BOT_NAME", "Base Bot")),
            "bot_type": self.options.get("bot_type", os.getenv("BOT_TYPE", "base")),
            "server_url": self.options.get("server_url", os.getenv("SERVER_URL", "http://localhost:3000")),
            "default_channel": self.options.get("default_channel", os.getenv("DEFAULT_CHANNEL", "general")),
            "max_reconnect_attempts": int(self.options.get("max_reconnect_attempts", os.getenv("MAX_RECONNECT_ATTEMPTS", "5"))),
        })
        # self.config.update(options)
        # Current state
        self.state = {
            "current_channel_id": None,
            "is_connected": False,
            "connection_attempts": 0,
            "channel_states": {}  # Track active state of channels
        }
        
        # Input handling
        self.input_thread = None
        self.running = False
        
        
        # For thread management
        self._running = False
        self._thread = None
        self._completed = threading.Event()
        # # if you need child also to have its own thread aside the parent, uncomment below 
        # self._child_thread = None 
        self._exit_flag = threading.Event()  # Flag to signal exit for all threads
        
        # Set up signal handler for graceful exit
        self._original_sigint_handler = signal.getsignal(signal.SIGINT)
        signal.signal(signal.SIGINT, self._signal_handler)
        
        #Thread management END
        
        # Initialize the bot
        self.init()
        
    def init(self):
        """Initialize the bot"""
        self.initSocket()
        self.setupSocketHandlers()
        
        # Display initial prompt
        self.display_prompt()
        
        # Start the bot (connect and setup console)
        # self.start()
        
        # Emit initialized event
        # self.emit("initialized")
        
    def initSocket(self):
        """Initialize the Socket.IO client"""
        self.socket = socketio.Client(
            reconnection=True,
            reconnection_attempts=self.config["max_reconnect_attempts"],
            reconnection_delay=1,
            reconnection_delay_max=5,
            request_timeout=20
        )
        # Store the server URL and path
        self.server_url = self.config["server_url"]
        self.server_path = '/api/socket'
        
    def setupSocketHandlers(self):
        """Set up Socket.IO event handlers"""
        # Connection events
        @self.socket.event
        def connect():
            self.state["is_connected"] = True
            self.state["connection_attempts"] = 0
            self.print_message("Connected to server")
            
            # Register the bot
            self.socket.emit("register", {
                "botId": self.config["bot_id"],
                "name": self.config["bot_name"],
                "type": self.config["bot_type"],
                "window_hwnd": self.config["window_hwnd"],
                "commands": self.config["commands"]
            })
            
            self.print_message(f'Registered as {self.config["bot_name"]} ({self.config["bot_id"]}) ({self.config["window_hwnd"]})')
            self.display_prompt()
            
            # Emit connected event
            self.emit("connected")
            
        @self.socket.event
        def disconnect():
            self.state["is_connected"] = False
            self.print_message("Disconnected from server")
            self.display_prompt()
            
            # Emit disconnected event
            self.emit("disconnected")
            
        @self.socket.event
        def connect_error(error):
            self.state["connection_attempts"] += 1
            self.print_message(f'Connection error: {str(error)}')
            
            if self.state["connection_attempts"] < self.config["max_reconnect_attempts"]:
                self.print_message(f'Reconnection attempt {self.state["connection_attempts"]}/{self.config["max_reconnect_attempts"]}...')
            else:
                self.print_message(f'Failed to connect after {self.config["max_reconnect_attempts"]} attempts.')
                self.print_message("Use /reconnect to try again or check server status.")
            
            self.display_prompt()
            
            # Emit error event
            self.emit("error", error)
            
        # Message events
        @self.socket.on("control_command")
        def on_control_command(message):
            self.print_message(f"Control command: {message}")
            if message.get('targetId') == self.config["bot_id"]:
                self.emit("control_command", message)
                
        @self.socket.on("new_message")
        def on_new_message(message):
            # Don't show our own messages again
            if message.get("senderId") != self.config["bot_id"]:
                self.print_message(f"{message.get('senderName')}: {message.get('content')}")
                
                if self.should_respond_to(message):
                    # Create a delay to seem more human-like
                    delay = 1 + random.random() * 2  # 1-3 seconds
                    
                    def delayed_response():
                        time.sleep(delay)
                        
                        if not self.state["is_connected"]:
                            self.print_message("Cannot respond to message: Not connected to server")
                            self.display_prompt()
                            return
                        
                        # Check if the channel is active before responding
                        if self.state["channel_states"].get(message.get("channelId")) is False:
                            self.print_message(f"Cannot respond to message: Channel {message.get('channelId')} is inactive")
                            self.display_prompt()
                            return
                        
                        try:
                            
                            json = self.extract_json_block(message.get("content"))
                            if json:
                                message["json"] = json
                            
                            # Create a new event loop for this thread
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)
                            
                            # Run the async generate_response method
                            try:
                                response = loop.run_until_complete(self.generate_response(message))
                            except Exception as e:
                                self.print_message(f"Error generating response x01: {str(e)}")
                                response = "Error generating response x01"
                            finally:
                                # Clean up
                                loop.close()    
                            
                            # Send the response
                            self.socket.emit("message", {
                                "channelId": message.get("channelId"),
                                "content": response
                            })
                            
                            self.print_message(f"You responded to {message.get('senderName')}: {response}")
                        except Exception as e:
                            self.print_message(f"Error generating response x02: {str(e)}")
                        finally:
                            self.display_prompt()
                    
                    # Start a thread for the delayed response
                    response_thread = threading.Thread(target=delayed_response)
                    response_thread.daemon = True
                    response_thread.start()
            
            self.display_prompt()
            
            # Emit message event
            self.emit("message", message)
            
        # Channel events
        @self.socket.on("channel_status")
        def on_channel_status(data):
            self.print_message(f"Channel status: {data.get('channelId')} ({'active' if data.get('active') else 'inactive'})")
            self.print_message(f'Participants: {len(data.get("participants", []))}')
            
            # Update channel state
            self.state["channel_states"][data.get("channelId")] = data.get("active")
            
            self.display_prompt()
            
            # Emit channel status event
            self.emit("channelStatus", data)
            
        @self.socket.on("participant_joined")
        def on_participant_joined(data):
            self.print_message(f"Participant joined: {data.get('name')} ({data.get('participantId')})")
            self.display_prompt()
            
            # Emit participant joined event
            self.emit("participantJoined", data)
            
        @self.socket.on("participant_left")
        def on_participant_left(data):
            self.print_message(f"Participant left: {data.get('name') or data.get('participantId')}")
            self.display_prompt()
            
            # Emit participant left event
            self.emit("participantLeft", data)
            
        @self.socket.on("channel_started")
        def on_channel_started(data):
            self.print_message(f"Channel started: {data.get('channelId')}")
            
            # Update channel state to active
            self.state["channel_states"][data.get("channelId")] = True
            
            self.display_prompt()
            
            # Emit channel started event
            self.emit("channelStarted", data)
            
        @self.socket.on("channel_stopped")
        def on_channel_stopped(data):
            self.print_message(f"Channel stopped: {data.get('channelId')}")
            
            # Update channel state to inactive
            self.state["channel_states"][data.get("channelId")] = False
            
            self.display_prompt()
            
            # Emit channel stopped event
            self.emit("channelStopped", data)
            
        @self.socket.on("bot_registered")
        def on_bot_registered(data):
            self.print_message(f"Bot registered: {data.get('name')} ({data.get('botId')})")
            self.display_prompt()
            
            # Emit bot registered event
            self.emit("botRegistered", data)
            
            if self.options.get('autojoin_channel', None) is not None:
                print('----------------autojoining channel', self.options.get('autojoin_channel', None))
                self.process_command(f"/join {self.options.get('autojoin_channel', None)}")

    def extract_json_block(self, content):
        """Extract JSON block from content"""
        try:
            regex = re.compile(r'\[json\](.*?)\[\/json\]', re.DOTALL)
            match = regex.search(content)
            jsonMatch = match.group(1) if match else None
            if jsonMatch:
                return json.loads(jsonMatch)
        except Exception as error:
            self.print_message(f"Error parsing JSON: {error}")
            return None
    

    def extract_json_data(self, message):
        jsonData = message.get("jsonData", None)
        if jsonData:
            json_key = list(jsonData.keys())[0]
            return jsonData[json_key]
        return None  
    
    # Thread management START
    
    def _signal_handler(self, sig, frame):
        """Internal signal handler for Ctrl+C"""
        print("\nCtrl+C detected! Shutting down gracefully...")
        self.stop()
        sys.exit(0)
    
    def runUntilStopped(self):
        print(f'{self.config["bot_name"]} started running')
        try:
            self._running = True
            while self._running and not self._exit_flag.is_set():
                try:
                    # Use a timeout to allow checking for exit flag
                    char = input(f'[{self.config["bot_name"]}] enter details. /exit to quit: ')
                    if char == '/exit':
                        self.cleanup_and_exit()
                        break
                    print(char)
                    self.process_command(char)
                except KeyboardInterrupt:
                    print(f'\n{self.config["bot_name"]} process interrupted')
                    break
        except Exception as e:
            print(f'Error in {self.config["bot_name"]}: {e}')
        finally:
            print(f'{self.config["bot_name"]} finished running')
            self._running = False
            self._completed.set()  # Signal that parent has completed
        
    def start(self):
        try:
             # Start the socket.io connection
            if not self.state["is_connected"]:
                self.socket.connect(
                    url=self.server_url,
                    socketio_path=self.server_path
                )
                
            """Start the parent process"""
            if self._exit_flag.is_set():
                self._exit_flag.clear()
            self._running = True
            self._thread = threading.Thread(target=self.runUntilStopped)
            self._thread.daemon = True  # Make threads daemon to auto-exit on main thread exit
            self._thread.start()
            
        except Exception as e:
            print(f"Error starting bot: {e}")
            self.emit("error", e)

    
    def stop(self):
        """Stop all threads gracefully"""
        self._exit_flag.set()
        self._running = False
        self._completed.set()
        
        time.sleep(0.5)  # Small delay to allow threads to respond
        # Restore original signal handler
        signal.signal(signal.SIGINT, self._original_sigint_handler)
        self.cleanup_and_exit()
    
    def join(self, timeout=None):
        """Wait for this parent to complete its execution"""
        try:
            if self._thread and self._thread.is_alive():
                self._thread.join(timeout)
            
            # if you need child also to have its own thread aside the parent, uncomment below 
            # if self._child_thread and self._child_thread.is_alive():
            #     self._child_thread.join(timeout)
            
        except KeyboardInterrupt:
            print("\nJoin interrupted. Stopping threads...")
            self.stop()
    
    def cleanup(self):
        """Clean up resources and restore original signal handlers"""
        self.stop()
    
    
    # Thread management END





    # def console_input_loop(self):
    #     """
    #     Console input loop to process user commands
    #     This uses a non-blocking approach to handle input
    #     """
    #     try:
    #         # On Windows, we need to use a simpler approach since select doesn't work with stdin
    #         if sys.platform.startswith('win'):
    #             self._win_console_loop()
    #         else:
    #             self._unix_console_loop()
    #     except KeyboardInterrupt:
    #         self.cleanup_and_exit()
    
   
    def cleanup_and_exit(self):
        """Clean up resources and exit gracefully"""
        if self.state["current_channel_id"] and self.state["is_connected"]:
            self.socket.emit("leave_channel", self.state["current_channel_id"])
        if self.state["is_connected"]:
            self.socket.disconnect()
        self.running = False
        self.print_message("Exiting bot")
        sys.exit(0)
    
    
    # def start(self):
    #     """Start the bot and connect to the server"""
    #     try:
    #         # Start the socket.io connection
    #         if not self.state["is_connected"]:
    #             self.socket.connect(
    #                 url=self.server_url,
    #                 socketio_path=self.server_path
    #             )
            
    #         # Start the console input loop in a separate thread if not already running
    #         if not self.input_thread or not self.input_thread.is_alive():
    #             self.running = True
    #             self.input_thread = threading.Thread(target=self.console_input_loop)
    #             self.input_thread.daemon = True
    #             self.input_thread.start()
                
    #     except Exception as e:
    #         self.print_message(f"Error starting bot: {str(e)}")
    #         self.emit("error", e)
    
    def process_command(self, input_text):
        """
        Process user commands
        
        Args:
            input_text (str): User input
        """
        trimmed_input = input_text.strip()
        
        # Check if it's a command (starts with /)
        if trimmed_input.startswith('/'):
            command_parts = trimmed_input[1:].split(' ')
            command = command_parts[0].lower()
            args = command_parts[1:] if len(command_parts) > 1 else []
            
            if command == 'join':
                join_channel_id = args[0] if args else self.config["default_channel"]
                if not self.state["is_connected"]:
                    self.print_message("Not connected to server. Cannot join channel.")
                    return
                self.socket.emit("join_channel", join_channel_id)
                self.state["current_channel_id"] = join_channel_id
                
                # When joining a channel, request its status to update our state
                def on_channel_details(data):
                    if data and isinstance(data.get("active"), bool):
                        self.state["channel_states"][join_channel_id] = data.get("active")
                        self.print_message(f"Channel {join_channel_id} is {'active' if data.get('active') else 'inactive'}")
                
                self.socket.emit("get_channel_details", join_channel_id, callback=on_channel_details)
                
                self.print_message(f"Joining channel: {join_channel_id}")
                
            elif command == 'leave':
                if not self.state["current_channel_id"]:
                    self.print_message("Error: Not in a channel")
                    return
                if not self.state["is_connected"]:
                    self.print_message("Not connected to server. Cannot leave channel.")
                    return
                self.socket.emit("leave_channel", self.state["current_channel_id"])
                self.print_message(f'Leaving channel: {self.state["current_channel_id"]}')
                self.state["current_channel_id"] = None
                
            elif command == 'start':
                if not self.state["is_connected"]:
                    self.print_message("Not connected to server. Cannot start channel.")
                    return
                start_channel_id = args[0] if args else self.state["current_channel_id"] or self.config["default_channel"]
                if not start_channel_id:
                    self.print_message("Error: No channel specified and not in a channel")
                    return
                self.socket.emit("start_channel", start_channel_id)
                self.state["current_channel_id"] = start_channel_id
                
                # When starting a channel, set its state to active
                self.state["channel_states"][start_channel_id] = True
                
                self.print_message(f"Starting channel: {start_channel_id}")
                
            elif command == 'stop':
                if not self.state["current_channel_id"]:
                    self.print_message("Error: Not in a channel")
                    return
                if not self.state["is_connected"]:
                    self.print_message("Not connected to server. Cannot stop channel.")
                    return
                self.socket.emit("stop_channel", self.state["current_channel_id"])
                
                # When stopping a channel, set its state to inactive
                self.state["channel_states"][self.state["current_channel_id"]] = False
                
                self.print_message(f'Stopping channel: {self.state["current_channel_id"]}')
                
            elif command == 'channel':
                new_channel_id = args[0] if args else None
                if not new_channel_id:
                    self.print_message(f'Current channel: {self.state["current_channel_id"] or "None"}')
                    if self.state["current_channel_id"]:
                        is_active = self.is_channel_active(self.state["current_channel_id"])
                        self.print_message(f"Channel status: {'Active' if is_active else 'Inactive'}")
                    return
                
                self.state["current_channel_id"] = new_channel_id
                
                # When switching channels, check its status if connected
                if self.state["is_connected"]:
                    def on_channel_details(data):
                        if data and isinstance(data.get("active"), bool):
                            self.state["channel_states"][new_channel_id] = data.get("active")
                            self.print_message(f"Channel {new_channel_id} is {'active' if data.get('active') else 'inactive'}")
                    
                    self.socket.emit("get_channel_details", new_channel_id, callback=on_channel_details)
                
                self.print_message(f"Switched to channel: {new_channel_id}")
                
            elif command == 'reconnect':
                if self.state["is_connected"]:
                    self.print_message("Already connected to server.")
                    return
                self.print_message("Attempting to reconnect to server...")
                try:
                    self.socket.connect(
                        url=self.server_url,
                        socketio_path=self.server_path
                    )
                except Exception as e:
                    self.print_message(f"Reconnection error: {str(e)}")
                
            elif command == 'info':
                if not self.state["current_channel_id"]:
                    self.print_message("Error: Not in a channel")
                    return
                if not self.state["is_connected"]:
                    self.print_message("Not connected to server. Cannot get channel info.")
                    return
                
                def on_channel_details(data):
                    self.print_message(f"Channel: {data.get('channelId')}")
                    self.print_message(f"Status: {'Active' if data.get('active') else 'Inactive'}")
                    
                    # Update our local state with the server's state
                    self.state["channel_states"][data.get("channelId")] = data.get("active")
                    
                    self.print_message(f'Participants: {len(data.get("participants", []))}')
                    self.print_message(f"Message count: {data.get('messageCount')}")
                
                self.socket.emit("get_channel_details", self.state["current_channel_id"], callback=on_channel_details)
                
            elif command == 'messages':
                if not self.state["current_channel_id"]:
                    self.print_message("Error: Not in a channel")
                    return
                if not self.state["is_connected"]:
                    self.print_message("Not connected to server. Cannot get messages.")
                    return
                
                def on_channel_messages(data):
                    self.print_message(f"Channel: {data.get('channelId')}")
                    messages = data.get('messages', [])
                    self.print_message(f"Message count: {len(messages)}")
                    if messages:
                        self.print_message("Recent messages:")
                        # Show last 5 messages
                        recent_messages = messages[-5:] if len(messages) > 5 else messages
                        for msg in recent_messages:
                            timestamp = datetime.datetime.fromtimestamp(msg.get('timestamp') / 1000)
                            time_str = timestamp.strftime("%H:%M:%S")
                            self.print_message(f'[{time_str}] {msg.get("senderName")}: {msg.get("content")}')
                
                self.socket.emit("get_channel_messages", self.state["current_channel_id"], callback=on_channel_messages)
                
            elif command == 'help':
                self.show_help()
                
            elif command == 'exit':
                if self.state["current_channel_id"] and self.state["is_connected"]:
                    self.socket.emit("leave_channel", self.state["current_channel_id"])
                self.socket.disconnect()
                self.running = False
                self.print_message("Exiting bot")
                sys.exit(0)
                
            else:
                # Check if the derived class has a custom command handler
                if not self.handle_custom_command(command, args):
                    self.print_message(f"Unknown command: {command}")
        
        elif trimmed_input and self.state["current_channel_id"]:
            # Send a message to the current channel
            if not self.state["is_connected"]:
                self.print_message("Not connected to server. Cannot send message.")
                return
            
            # Check if the channel is active before sending a message
            if self.state["channel_states"].get(self.state["current_channel_id"]) is False:
                self.print_message(f'Cannot send message: Channel {self.state["current_channel_id"]} is inactive.')
                self.display_prompt()
                return
            
            self.socket.emit("message", {
                "channelId": self.state["current_channel_id"],
                "content": trimmed_input
            })
            self.print_message(f"You sent: {trimmed_input}")
            
        elif trimmed_input:
            self.print_message("Error: Not in a channel. Join a channel first with /join [channel]")
        
        self.display_prompt()
        
    def extractJsonBlock(self, content):
        """Extract JSON block from content"""
        try:
            print('extracting STARTED:', content)
            regex = re.compile(r'\[json\](.*?)\[\/json\]', re.DOTALL)
            match = regex.search(content)
            jsonMatch = match.group(1) if match else None
            if jsonMatch:
                return json.loads(jsonMatch)
        except Exception as error:
            self.print_message(f"Error parsing JSON: {error}")
            return None
    
    def show_help(self):
        """Show help message"""
        self.print_message("Available commands:")
        self.print_message("/join [channel] - Join a channel (default: general)")
        self.print_message("/leave - Leave the current channel")
        self.print_message("/start [channel] - Start a channel (default: current or general)")
        self.print_message("/stop - Stop the current channel")
        self.print_message("/channel [channel] - Switch to or display current channel")
        self.print_message("/info - Get information about the current channel")
        self.print_message("/messages - Show recent messages in the current channel")
        self.print_message("/reconnect - Attempt to reconnect to the server")
        self.print_message("/exit - Exit the bot")
        self.print_message("/help - Show this help message")
        
        # Show custom help if available
        self.show_custom_help()
        
        self.print_message("To send a message, just type it and press enter")
    
    def print_message(self, message):
        """
        Print a message with timestamp
        
        Args:
            message (str): Message to print
        """
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        print(f'[{timestamp}] {message}')
    
    def display_prompt(self):
        """Display prompt to the user"""
        channel_status = f'({self.config["bot_id"]})[{self.state["current_channel_id"]}]' if self.state["current_channel_id"] else "[no channel]"
        
        channel_active = ""
        if self.state["current_channel_id"]:
            is_active = self.is_channel_active(self.state["current_channel_id"])
            channel_active = "active" if is_active else "inactive"
        
        connection_status = "connected" if self.state["is_connected"] else "disconnected"
        
        prompt = f'{channel_status}'
        if channel_active:
            prompt += f" ({channel_active})"
        prompt += f" ({connection_status}) > "
        
        # Print the prompt without newline and flush
        print(prompt, end="", flush=True)
    
    def should_respond_to(self, message):
        """
        Determine if the bot should respond to a message
        This method should be overridden by derived classes
        
        Args:
            message (dict): Message object
            
        Returns:
            bool: Whether the bot should respond
        """
        print("hi i am being called", self.state["channel_states"].get(message.get("channelId")))
        # Check if the channel is active before responding
        if self.state["channel_states"].get(message.get("channelId")) is False:
            return False
        
        # Base implementation: respond to messages that tag this bot
        tags = message.get("tags", [])
        return tags and self.config["bot_id"] in tags
    
    async def generate_response(self, message):
        """
        Generate a response to a message
        This method should be overridden by derived classes
        
        Args:
            message (dict): Message object
            
        Returns:
            str: Response message
        """
        # Base implementation: generic response
        return f"I see you've mentioned me, {message.get('senderName')}. I'm a base bot and don't have specific response logic implemented."
    
    def handle_custom_command(self, command, args):
        """
        Handle custom commands
        This method should be overridden by derived classes
        
        Args:
            command (str): Command name
            args (list): Command arguments
            
        Returns:
            bool: Whether the command was handled
        """
        # Base implementation: no custom commands
        return False
    
    def show_custom_help(self):
        """
        Show custom help
        This method should be overridden by derived classes
        """
        # Base implementation: no custom help
        pass
    
    def is_channel_active(self, channel_id):
        """
        Check if a channel is active
        
        Args:
            channel_id (str): Channel ID to check
            
        Returns:
            bool: Whether the channel is active
        """
        # If we don't have state information, assume it's active
        if channel_id not in self.state["channel_states"]:
            return True
        return self.state["channel_states"][channel_id] is True
