import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'base_bot')))
import re
import ast
from dotenv import load_dotenv
from base_bot.base_bot import BaseBot as _BaseBot
from langchain_community.chat_models import ChatOpenAI
import statistics
import time
import asyncio
import json
import random

load_dotenv()

class MathCalcyBot(_BaseBot):
    def __init__(self, options=None):
        default_options = {
            "bot_id": "math",
            "bot_name": "Math Bot {id: math}",
            "bot_type": "math_bot",
            "autojoin_channel": "general"
        }
        openai_api_key = os.environ.get("OPENAI_API_KEY")
        self.llm = ChatOpenAI(model_name="gpt-4-turbo", temperature=0.2, openai_api_key=openai_api_key)
        if options:
            default_options.update(options)
        super().__init__(options=default_options)

    def parse_numbers_from_text(self, text):
        # Extract numbers from comma/space separated text
        numbers = [float(n) for n in re.findall(r'\d+(?:\.\d+)?', text)]
        return numbers

    def is_math_question(self, message):
        """
        Heuristic to detect if a message is a math question.
        Respond if tagged or if message contains math expressions/keywords or comma/space-separated numbers or natural language triggers.
        """
        tags = message.get("tags", [])
        if self.config["bot_id"] in tags:
            return True
        content = message.get("content", "").lower()
        math_keywords = [
            "average", "mean", "median", "mode", "sum", "difference", "product", "quotient",
            "integral", "derivative", "log", "sin", "cos", "tan", "sqrt", "power", "calculate",
            "+", "-", "*", "/", "^", "%", "=", "solve", "equation", "math", "calculate",
            "add", "subtract", "multiply", "divide", "minimum", "maximum", "min", "max", "total", "range", "std", "standard deviation"
        ]
        if any(kw in content for kw in math_keywords):
            return True
        # Contains numbers and operators
        if re.search(r"[0-9]+\s*([+\-*/^%])\s*[0-9]+", content):
            return True
        # Contains comma/space-separated numbers
        if re.match(r"^\s*\d+(,\s*\d+)+(,\s*\d+)*\s*$", content) or re.match(r"^\s*\d+(\s+\d+)+\s*$", content):
            return True
        # Natural language triggers
        if re.search(r"(what is|find|calculate|show|give|tell|sum|average|mean|median|mode|product|min|max|total|range|standard deviation|std)", content):
            return True
        return False

    def safe_eval(self, expr):
        """
        Safely evaluate simple math expressions using ast and math module.
        """
        import math
        allowed_names = {k: v for k, v in math.__dict__.items() if not k.startswith("__")}
        allowed_names["abs"] = abs
        allowed_names["round"] = round
        node = ast.parse(expr, mode='eval')
        def _eval(node):
            if isinstance(node, ast.Expression):
                return _eval(node.body)
            elif isinstance(node, ast.BinOp):
                left = _eval(node.left)
                right = _eval(node.right)
                if isinstance(node.op, ast.Add): return left + right
                if isinstance(node.op, ast.Sub): return left - right
                if isinstance(node.op, ast.Mult): return left * right
                if isinstance(node.op, ast.Div): return left / right
                if isinstance(node.op, ast.Pow): return left ** right
                if isinstance(node.op, ast.Mod): return left % right
                raise ValueError("Unsupported operator")
            elif isinstance(node, ast.UnaryOp):
                operand = _eval(node.operand)
                if isinstance(node.op, ast.UAdd): return +operand
                if isinstance(node.op, ast.USub): return -operand
                raise ValueError("Unsupported unary operator")
            elif isinstance(node, ast.Num):
                return node.n
            elif isinstance(node, ast.Call):
                func = node.func.id
                if func in allowed_names:
                    args = [_eval(arg) for arg in node.args]
                    return allowed_names[func](*args)
                raise ValueError(f"Function {func} not allowed")
            elif isinstance(node, ast.Name):
                if node.id in allowed_names:
                    return allowed_names[node.id]
                raise ValueError(f"Name {node.id} is not allowed")
            else:
                raise ValueError("Unsupported expression")
        return _eval(node)

    async def generate_response(self, message):
        content = message.get("content", "")
        numbers = self.parse_numbers_from_text(content)
        c = content.lower()
        bullets = []
        op_detected = False

        # 1. Direct statistics/calculation logic
        if numbers:
            if "average" in c or "mean" in c:
                avg = sum(numbers) / len(numbers)
                bullets.append(f"- The average is: {avg}")
                op_detected = True
            if "median" in c:
                med = statistics.median(numbers)
                bullets.append(f"- The median is: {med}")
                op_detected = True
            if "mode" in c:
                try:
                    mode = statistics.mode(numbers)
                    bullets.append(f"- The mode is: {mode}")
                except statistics.StatisticsError:
                    bullets.append("- No unique mode found.")
                op_detected = True
            if "sum" in c or "add" in c or "total" in c:
                bullets.append(f"- The sum is: {sum(numbers)}")
                op_detected = True
            if "min" in c or "minimum" in c:
                bullets.append(f"- The minimum is: {min(numbers)}")
                op_detected = True
            if "max" in c or "maximum" in c:
                bullets.append(f"- The maximum is: {max(numbers)}")
                op_detected = True
            if "product" in c or "multiply" in c:
                prod = 1
                for n in numbers:
                    prod *= n
                bullets.append(f"- The product is: {prod}")
                op_detected = True
            if "range" in c:
                bullets.append(f"- The range is: {max(numbers) - min(numbers)}")
                op_detected = True
            if "std" in c or "standard deviation" in c:
                if len(numbers) > 1:
                    std = statistics.stdev(numbers)
                    bullets.append(f"- The standard deviation is: {std}")
                else:
                    bullets.append("- Standard deviation requires at least two numbers.")
                op_detected = True
            # If no operation keyword, default to sum
            if not op_detected:
                bullets.append(f"- The numbers you provided: {', '.join(map(str, numbers))}")
                bullets.append(f"- The sum of these numbers is: {sum(numbers)}")
            response = "**MathCalcyBot Answer:**\n" + "\n".join(bullets)
            # If the user asks "how" or for an explanation, use LLM for a step-by-step explanation
            if "how" in c or "explain" in c or "step" in c:
                prompt = (
                    f"You are a helpful math tutor. The user asked: '{content}'. "
                    "Provide a step-by-step explanation for the calculation above, in markdown, with clear bullet points."
                )
                try:
                    llm_response = self.llm.invoke(prompt).content
                    response += "\n\n**Step-by-step Explanation:**\n" + llm_response
                except Exception as e:
                    response += f"\n\n- (Could not generate explanation: {e})"
            return response

        # 2. Try to extract and evaluate a math expression
        expr_match = re.search(r"([0-9\s+\-*/^%.()]+)", content)
        expr = expr_match.group(1).strip() if expr_match else None
        if expr:
            try:
                result = self.safe_eval(expr)
                bullets = [
                    f"- The expression you provided: `{expr}`",
                    f"- The result is: {result}"
                ]
                response = "**MathCalcyBot Answer:**\n" + "\n".join(bullets)
                if "how" in c or "explain" in c or "step" in c:
                    prompt = (
                        f"You are a helpful math tutor. The user asked: '{content}'. "
                        f"Show a step-by-step solution for the expression `{expr}`."
                    )
                    try:
                        llm_response = self.llm.invoke(prompt).content
                        response += "\n\n**Step-by-step Explanation:**\n" + llm_response
                    except Exception as e:
                        response += f"\n\n- (Could not generate explanation: {e})"
                return response
            except Exception:
                pass  # Fall back to LLM for complex/invalid expressions

        # 3. For anything else, use OpenAI LLM for a smart, conversational answer
        prompt = (
            "You are a helpful, advanced math assistant. "
            "Always answer in markdown with a bold heading '**MathCalcyBot Answer:**' and bullet points for each step/result, each on a new line. "
            "If the user asks for statistics (average, median, mode, min, max, product, range, std deviation), show step-by-step solutions. "
            "If the user asks for unit conversion, show the conversion and the result. "
            "If the user asks 'how' or for an explanation, provide a detailed, step-by-step answer. "
            f"\n\n{content}"
        )
        try:
            response = self.llm.invoke(prompt).content
            if not response.strip().startswith("**MathCalcyBot Answer:**"):
                response = f"**MathCalcyBot Answer:**\n- {response.strip()}"
            return response
        except Exception as e:
            return f"**MathCalcyBot Answer:**\n- ❌ Sorry, I couldn't process your math question. Error: {e}"

    def should_respond_to(self, message):
        if isinstance(message, dict):
            content = message.get("content", "").lower()
        else:
            content = str(message).lower()
        if "<!--mathcalcybot-->" in content:
            return False
        return "@math" in content

    def show_custom_help(self):
        self.print_message("MathCalcyBot can help with:")
        self.print_message("- Basic arithmetic: 2 + 2, 5 * 7, etc.")
        self.print_message("- Scientific calculations: sin(0.5), log(10), sqrt(16), etc.")
        self.print_message("- Statistical queries: average, mean, median, etc.")
        self.print_message("- Natural language math questions (using AI)")
        self.print_message("Mention me or type a math question to get started!")

# Run the bot
if __name__ == "__main__":
    bot = MathCalcyBot()
    bot.start()
    bot.join()
    bot.cleanup()
