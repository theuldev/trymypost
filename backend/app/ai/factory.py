from langchain_core.language_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

from app.models.app_settings import AppSettings


class LLMFactory:

    @staticmethod
    def create(settings: AppSettings) -> BaseChatModel:
        provider = settings.provider.upper()

        if provider == "GOOGLE":
            return ChatGoogleGenerativeAI(
                model=settings.model_name,
                temperature=settings.temperature,
                google_api_key=settings.api_key,
            )

        if provider == "OPENAI":
            return ChatOpenAI(
                model=settings.model_name,
                temperature=settings.temperature,
                api_key=settings.api_key,
            )

        if provider == "ANTHROPIC":
            return ChatAnthropic(
                model=settings.model_name,
                temperature=settings.temperature,
                api_key=settings.api_key,
            )

        if provider == "OPENROUTER":
            return ChatOpenAI(
                model=settings.model_name,
                temperature=settings.temperature,
                api_key=settings.api_key,
                base_url="https://openrouter.ai/api/v1",
            )

        if provider == "HUGGINGFACE":
            # Endpoint OpenAI-compatible do HuggingFace Inference Providers
            return ChatOpenAI(
                model=settings.model_name,
                temperature=settings.temperature,
                api_key=settings.api_key,
                base_url="https://router.huggingface.co/v1",
            )

        raise ValueError(
            f"Unsupported AI provider: {settings.provider}"
        )