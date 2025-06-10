import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'base_bot')))
from dotenv import load_dotenv
from base_bot.base_bot import BaseBot as _BaseBot
from langchain_community.chat_models import ChatOpenAI

load_dotenv()

class HealthBot(_BaseBot):
    def __init__(self, options=None):
        default_options = {
            "bot_id": "health",
            "bot_name": "Health Bot {id: health}",
            "bot_type": "health_bot",
            "autojoin_channel": "general"
        }
        openai_api_key = os.environ.get("OPENAI_API_KEY")
        self.llm = ChatOpenAI(model_name="gpt-4-turbo", temperature=0.2, openai_api_key=openai_api_key)
        if options:
            default_options.update(options)
        super().__init__(options=default_options)

    def is_health_question(self, message):
        """
        Detect if a message is a health-related question.
        """
        tags = message.get("tags", [])
        if self.config["bot_id"] in tags:
            return True
        
        content = message.get("content", "").lower()
        health_keywords = [
            "health", "medical", "doctor", "symptom", "disease", "illness", "pain",
            "treatment", "medicine", "exercise", "diet", "nutrition", "vitamin",
            "fitness", "wellness", "mental health", "physical", "therapy",
            "prevention", "diagnosis", "cure", "recovery", "sick", "healthy",
            "weight", "blood pressure", "heart", "lung", "brain", "immune",
            "allergy", "infection", "virus", "bacteria", "chronic", "acute"
        ]
        
        return any(kw in content for kw in health_keywords)

    async def generate_response(self, message):
        content = message.get("content", "")
        
        # Create a prompt that emphasizes health expertise and safety
        prompt = (
            "You are a helpful health information assistant. "
            "IMPORTANT: Always include a medical disclaimer. "
            "Format your response in markdown with a bold heading '**HealthBot Answer:**' "
            "and use bullet points for clarity. "
            "Always emphasize that you are providing general information and not medical advice. "
            "If the question is about specific symptoms or conditions, recommend consulting a healthcare professional. "
            "For emergency situations, always advise seeking immediate medical attention. "
            "Keep responses factual, evidence-based, and focused on general health information. "
            f"\n\nUser question: {content}"
        )
        
        try:
            response = self.llm.invoke(prompt).content
            if not response.strip().startswith("**HealthBot Answer:**"):
                response = f"**HealthBot Answer:**\n- {response.strip()}"
            return response
        except Exception as e:
            return f"**HealthBot Answer:**\n- ❌ Sorry, I couldn't process your health question. Error: {e}"

    def should_respond_to(self, message):
        if isinstance(message, dict):
            content = message.get("content", "").lower()
        else:
            content = str(message).lower()
        if "<!--healthbot-->" in content:
            return False
        return "@health" in content

    def show_custom_help(self):
        self.print_message("HealthBot can help with:")
        self.print_message("- General health information and wellness tips")
        self.print_message("- Understanding common health conditions")
        self.print_message("- Basic nutrition and exercise guidance")
        self.print_message("- General medical terminology explanations")
        self.print_message("Mention me or type a health-related question to get started!")
        self.print_message("Note: Always consult healthcare professionals for medical advice.")

# Run the bot
if __name__ == "__main__":
    bot = HealthBot()
    bot.start()
    bot.join()
    bot.cleanup()
