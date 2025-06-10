import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'base_bot')))
from dotenv import load_dotenv
from base_bot.base_bot import BaseBot as _BaseBot
from langchain_community.chat_models import ChatOpenAI

load_dotenv()

class GeographyBot(_BaseBot):
    def __init__(self, options=None):
        default_options = {
            "bot_id": "geography",
            "bot_name": "Geography Bot {id: geography}",
            "bot_type": "geography_bot",
            "autojoin_channel": "general"
        }
        openai_api_key = os.environ.get("OPENAI_API_KEY")
        self.llm = ChatOpenAI(model_name="gpt-4-turbo", temperature=0.2, openai_api_key=openai_api_key)
        if options:
            default_options.update(options)
        super().__init__(options=default_options)

    def is_geography_question(self, message):
        """
        Detect if a message is a geography-related question.
        """
        tags = message.get("tags", [])
        if self.config["bot_id"] in tags:
            return True
        
        content = message.get("content", "").lower()
        geography_keywords = [
            "country", "city", "capital", "continent", "ocean", "mountain", "river",
            "lake", "desert", "forest", "island", "peninsula", "latitude", "longitude",
            "coordinates", "map", "location", "place", "region", "territory",
            "population", "area", "border", "climate", "timezone", "geography",
            "geographical", "landmark", "monument", "heritage", "world heritage",
            "elevation", "altitude", "sea level", "coast", "shore", "beach",
            "valley", "plateau", "plain", "basin", "gulf", "bay", "strait",
            "channel", "archipelago", "volcano", "glacier", "tundra", "savanna",
            "rainforest", "grassland", "wetland", "delta", "fjord", "canyon"
        ]
        
        return any(kw in content for kw in geography_keywords)

    async def generate_response(self, message):
        content = message.get("content", "")
        
        # Create a prompt that emphasizes geographical expertise
        prompt = (
            "You are a knowledgeable geography assistant. "
            "Format your response in markdown with a bold heading '**GeographyBot Answer:**' "
            "and use bullet points for clarity. "
            "When providing geographical information:"
            "\n- Include precise coordinates when relevant"
            "\n- Mention relevant geographical features"
            "\n- Provide population and area data when available"
            "\n- Include interesting geographical facts"
            "\n- Mention neighboring countries/regions when relevant"
            "\n- Include climate and timezone information when appropriate"
            "\n- Use proper geographical terminology"
            f"\n\nUser question: {content}"
        )
        
        try:
            response = self.llm.invoke(prompt).content
            if not response.strip().startswith("**GeographyBot Answer:**"):
                response = f"**GeographyBot Answer:**\n- {response.strip()}"
            return response
        except Exception as e:
            return f"**GeographyBot Answer:**\n- ❌ Sorry, I couldn't process your geography question. Error: {e}"

    def should_respond_to(self, message):
        if isinstance(message, dict):
            content = message.get("content", "").lower()
        else:
            content = str(message).lower()
        if "<!--geographybot-->" in content:
            return False
        return "@geography" in content

    def show_custom_help(self):
        self.print_message("GeographyBot can help with:")
        self.print_message("- Country and city information")
        self.print_message("- Geographical coordinates and locations")
        self.print_message("- Physical features (mountains, rivers, oceans, etc.)")
        self.print_message("- Population and area statistics")
        self.print_message("- Climate and timezone information")
        self.print_message("- Geographical landmarks and heritage sites")
        self.print_message("Mention me or type a geography-related question to get started!")

# Run the bot
if __name__ == "__main__":
    bot = GeographyBot()
    bot.start()
    bot.join()
    bot.cleanup()
