import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'base_bot')))
from dotenv import load_dotenv
from base_bot.base_bot import BaseBot as _BaseBot
from langchain_community.chat_models import ChatOpenAI

load_dotenv()

class FoodRecipeBot(_BaseBot):
    def __init__(self, options=None):
        default_options = {
            "bot_id": "recipe",
            "bot_name": "Food Recipe Bot {id: recipe}",
            "bot_type": "recipe_bot",
            "autojoin_channel": "general"
        }
        openai_api_key = os.environ.get("OPENAI_API_KEY")
        self.llm = ChatOpenAI(model_name="gpt-4-turbo", temperature=0.2, openai_api_key=openai_api_key)
        if options:
            default_options.update(options)
        super().__init__(options=default_options)

    def is_recipe_question(self, message):
        """
        Detect if a message is a recipe-related question.
        """
        tags = message.get("tags", [])
        if self.config["bot_id"] in tags:
            return True
        
        content = message.get("content", "").lower()
        recipe_keywords = [
            "recipe", "cook", "food", "dish", "meal", "cuisine", "ingredients",
            "cooking", "how to make", "how to cook", "preparation", "cookbook",
            "indian", "italian", "french", "chinese", "japanese", "cuisine",
            "breakfast", "lunch", "dinner", "dessert", "snack", "appetizer",
            "vegetarian", "vegan", "non-vegetarian", "spicy", "sweet", "savory"
        ]
        
        return any(kw in content for kw in recipe_keywords)

    async def generate_response(self, message):
        content = message.get("content", "")
        
        # Extract the recipe query
        query = content.replace("@recipe", "").strip()
        if not query:
            return "Please provide a recipe request after @recipe. For example: '@recipe how to make butter chicken'"
        
        # Create a prompt that emphasizes recipe expertise
        prompt = (
            "You are a professional chef and cooking expert. "
            "Provide a detailed recipe in response to the user's request. "
            "Format your response in markdown with a bold heading '**FoodRecipeBot Answer:**' "
            "and use clear sections for the recipe. "
            "Always include:"
            "\n1. Dish Name and Brief Description"
            "\n2. Preparation Time and Cooking Time"
            "\n3. Servings"
            "\n4. Ingredients (with precise measurements)"
            "\n5. Step-by-step Instructions"
            "\n6. Tips and Notes"
            "\n7. Any cultural context or variations"
            "\n\nMake sure the recipe is authentic and practical. "
            "If the request is vague, provide a popular recipe from the mentioned cuisine. "
            f"\n\nUser request: {query}"
        )
        
        try:
            # First, acknowledge that we're working on the recipe
            self.socket.emit('message', {
                "channelId": message.get("channelId"),
                "content": "🍳 Working on your recipe request..."
            })
            
            # Get response from LLM
            response = self.llm.invoke(prompt).content
            
            # Format the response if needed
            if not response.strip().startswith("**FoodRecipeBot Answer:**"):
                response = f"**FoodRecipeBot Answer:**\n{response.strip()}"
            
            return response
        except Exception as e:
            error_msg = f"Sorry, I couldn't process your recipe request. Error: {str(e)}"
            print(f"Recipe Bot Error: {error_msg}")  # Log the error
            return f"**FoodRecipeBot Error:** {error_msg}"

    def should_respond_to(self, message):
        if isinstance(message, dict):
            content = message.get("content", "").lower()
        else:
            content = str(message).lower()
        if "<!--recipebot-->" in content:
            return False
        return "@recipe" in content

    def show_custom_help(self):
        self.print_message("Food Recipe Bot can help you with:")
        self.print_message("- Recipes from various cuisines (Indian, Italian, French, Chinese, Japanese)")
        self.print_message("- Detailed cooking instructions and ingredients")
        self.print_message("- Meal ideas for breakfast, lunch, and dinner")
        self.print_message("- Vegetarian and non-vegetarian recipes")
        self.print_message("- Desserts and snacks")
        self.print_message("\nExample commands:")
        self.print_message("- @recipe how to make butter chicken")
        self.print_message("- @recipe give me an Italian pasta recipe")
        self.print_message("- @recipe show me a vegetarian Indian dish")
        self.print_message("- @recipe what's a good Japanese dessert?")

# Run the bot
if __name__ == "__main__":
    bot = FoodRecipeBot()
    bot.start()
    bot.join()
    bot.cleanup()
