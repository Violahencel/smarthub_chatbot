import os
import sys
import importlib.util
import threading

def load_and_start_bots(bot_type_dir='all_bot/bot_type'):
    bot_files = [f for f in os.listdir(bot_type_dir) if f.endswith('.py') and not f.startswith('__')]
    bots = []
    for bot_file in bot_files:
        module_name = bot_file[:-3]
        bot_file_path = os.path.join(bot_type_dir, bot_file)
        spec = importlib.util.spec_from_file_location(module_name, bot_file_path)
        if spec is None:
            continue
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        bot_class = None
        for attr_name in dir(module):
            if attr_name.endswith('Bot'):
                bot_class = getattr(module, attr_name)
                break
        if bot_class:
            bot_instance = bot_class()
            bots.append(bot_instance)
            print(f"Loaded bot: {module_name}")

    # Start each bot in its own thread
    for bot in bots:
        t = threading.Thread(target=bot.start)
        t.daemon = True
        t.start()
        print(f"Started bot: {getattr(bot, 'config', {}).get('bot_name', str(bot))}")

    print("All bots started. Press Ctrl+C to stop.")
    try:
        while True:
            pass  # Keep main thread alive
    except KeyboardInterrupt:
        print("\nCtrl+C detected! Shutting down all bots...")
        for bot in bots:
            bot_name = getattr(bot, 'config', {}).get('bot_name', str(bot))
            print(f"Stopping {bot_name}...")
            if hasattr(bot, 'cleanup'):
                bot.cleanup()
            print(f"{bot_name} stopped")
        print("All bots have been stopped.")

if __name__ == "__main__":
    load_and_start_bots() 