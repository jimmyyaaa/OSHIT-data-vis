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
        str: Generated summary or error message
    """
    try:
        # Get API key from environment variable (already loaded in main.py)
        model = os.getenv("AI_TEXT_MODEL")
        api_key = os.getenv("GOOGLE_GENAI_API_KEY")

        if not model:
            raise Exception("AI_TEXT_MODEL environment variable not set")

        if not api_key:
            raise Exception("GOOGLE_GENAI_API_KEY environment variable not set")

        aclient = genai.Client(api_key=api_key).aio

        try:
            response = await aclient.models.generate_content(
                model=model,
                contents=data_context,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                ),
            )

        except Exception as api_err:
            raise Exception(f"API call failed: {api_err}")
        
        try:
            summary = response.text
        except Exception as parse_err:
            raise Exception(f"No text in response: {parse_err}")

        return summary

    except Exception as e:
        return f"Error generating AI summary: {str(e)}"

    finally:
        await aclient.aclose()