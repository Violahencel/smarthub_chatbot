from .base_bot import BaseBot

class LLMBotBase(BaseBot):
    def __init__(self, options=None):
        super().__init__(options)
        # You can add LLM initialization here if needed

    async def generate_response(self, message):
        # Default: just call BaseBot's generate_response
        return await super().generate_response(message) 