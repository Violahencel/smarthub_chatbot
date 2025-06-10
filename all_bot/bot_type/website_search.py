import sys
import os
from dotenv import load_dotenv
from base_bot.base_bot import BaseBot as _BaseBot
from langchain_community.chat_models import ChatOpenAI
import requests
from bs4 import BeautifulSoup

load_dotenv()

class WebsiteSearchBot(_BaseBot):
    def __init__(self, options=None):
        default_options = {
            "bot_id": "website",
            "bot_name": "Website Search Bot {id: website}",
            "bot_type": "website_search_bot",
            "autojoin_channel": "general"
        }
        openai_api_key = os.environ.get("OPENAI_API_KEY")
        self.llm = ChatOpenAI(model_name="gpt-4-turbo", temperature=0.2, openai_api_key=openai_api_key)
        if options:
            default_options.update(options)
        super().__init__(options=default_options)

    def should_respond_to(self, message):
        if isinstance(message, dict):
            content = message.get("content", "").lower()
        else:
            content = str(message).lower()
        return "@website" in content

    async def generate_response(self, message):
        content = message.get("content", "")
        
        # Extract search query
        query = content.replace("@website", "").strip()
        if not query:
            return "Please provide a search query after @website."

        try:
            # Create a prompt for the LLM to help format the search results
            prompt = (
                "You are a helpful web search assistant. "
                "Format your response in markdown with a bold heading '**WebsiteSearchBot Answer:**' "
                "and use bullet points for clarity. "
                "When providing search results:"
                "\n- Summarize the key information"
                "\n- Include relevant facts and details"
                "\n- Keep the response concise and informative"
                "\n- Use proper formatting for readability"
                f"\n\nSearch query: {query}"
            )
            
            # Get response from LLM
            response = self.llm.invoke(prompt).content
            if not response.strip().startswith("**WebsiteSearchBot Answer:**"):
                response = f"**WebsiteSearchBot Answer:**\n- {response.strip()}"
            return response

        except Exception as e:
            return f"**WebsiteSearchBot Error:** Sorry, I couldn't process your search request. Error: {str(e)}"

    def show_custom_help(self):
        self.print_message("Website Search Bot can help you:")
        self.print_message("- Search for information on any topic")
        self.print_message("- Get quick summaries of search results")
        self.print_message("- Find relevant information and facts")
        self.print_message("Just mention me with @website followed by your search query!")

# Run the bot
if __name__ == "__main__":
    bot = WebsiteSearchBot()
    bot.start()
    bot.join()
    bot.cleanup()
