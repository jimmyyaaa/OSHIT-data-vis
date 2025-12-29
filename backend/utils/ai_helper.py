from google import genai
from google.genai import types
import os


async def get_ai_summary(data_context: str, system_instruction: str) -> str:
    """
    Generate AI summary using Google GenAI.

    Args:
        data_context: The data context to analyze
        system_instruction: System instruction for the AI model

    Returns:
        str: Generated summary

    Raises:
        Exception: If API key is not set or API call fails
    """
    # Get API key from environment variable (already loaded in main.py)
    model = os.getenv("AI_TEXT_MODEL")
    api_key = os.getenv("GOOGLE_GENAI_API_KEY")

    if not model:
        raise Exception("AI_TEXT_MODEL environment variable not set")

    if not api_key:
        raise Exception("GOOGLE_GENAI_API_KEY environment variable not set")

    async with genai.Client(api_key=api_key).aio as aclient:
        response = await aclient.models.generate_content(
            model=model,
            contents=data_context,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.5,
            ),
        )

        if response.text:
            return response.text
        else:
            feedback = response.prompt_feedback
            raise Exception("GenAI API refused the request: " + str(feedback.blocked_reasons))
