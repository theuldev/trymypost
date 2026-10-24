import asyncio
import logging
from typing import Optional

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool

from app.core.config import get_settings
from app.services.llm_retry import invoke_with_rate_limit_retry

logger = logging.getLogger(__name__)


def _resolve_api_key(api_key: Optional[str]) -> str:
    """API key priority: explicit argument (app settings) > env TAVILY_API_KEY."""
    return (api_key or "").strip() or get_settings().tavily_api_key.strip()


def _format_results(response: dict) -> str:
    """Format Tavily search results into a text block for prompts/tools."""
    lines = []

    answer = response.get("answer")
    if answer:
        lines.append(f"Summary: {answer}")

    for item in response.get("results", []) or []:
        title = item.get("title", "")
        url = item.get("url", "")
        content = (item.get("content") or "").strip()
        if len(content) > 500:
            content = content[:500] + "..."
        lines.append(f"- {title} ({url})\n  {content}")

    return "\n".join(lines).strip()


def _tavily_search(api_key: str, query: str, max_results: int = 5) -> str:
    from tavily import TavilyClient

    client = TavilyClient(api_key=api_key)
    response = client.search(
        query,
        search_depth="basic",
        topic="general",
        max_results=max_results,
        include_answer=True,
    )
    formatted = _format_results(response)
    logger.info(
        f"Tavily search for '{query}' returned {len(response.get('results', []) or [])} results"
    )
    return formatted


def create_web_search_tool(api_key: Optional[str] = None):
    """Create a LangChain web_search tool backed by Tavily for tool-calling loops."""
    key = _resolve_api_key(api_key)

    @tool
    async def web_search(query: str) -> str:
        """Search the web for current information, news, trends and real-world data about
        a topic. Use it to ground your answer in real, up-to-date sources. You may call it
        multiple times with refined queries to find the best available results."""
        if not key:
            return "Web search is unavailable (no Tavily API key configured). Answer from your own knowledge."
        try:
            result = await asyncio.to_thread(_tavily_search, key, query)
            return result or "No relevant results found for this query."
        except Exception as exc:
            logger.warning(f"web_search tool failed for '{query}': {exc}")
            return f"Search failed: {exc}. Answer from your own knowledge."

    return web_search

''
def _content_to_str(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            str(part.get("text", "")) if isinstance(part, dict) else str(part)
            for part in content
        )
    return str(content)


async def run_with_web_search(
    llm: BaseChatModel,
    prompt_text: str,
    api_key: Optional[str] = None,
    max_tool_calls: int = 5,
    config: Optional[dict] = None,
) -> str:
    """Run a prompt with the LLM, exposing web_search as a tool it can call freely.

    The LLM may call the tool multiple times with refined queries (up to
    max_tool_calls) to research before producing the final answer. If no Tavily
    key is configured, falls back to a plain LLM call without tools.
    """
    key = _resolve_api_key(api_key)
    if not key:
        result = await invoke_with_rate_limit_retry(
            lambda: llm.ainvoke(prompt_text, config=config),
            description="LLM call (no web search)",
        )
        return _content_to_str(result.content)

    search_tool = create_web_search_tool(key)
    llm_with_tools = llm.bind_tools([search_tool])

    system = (
        "You have access to a web_search tool. Use it to research real, current "
        "information about the topic before answering. Call it as many times as "
        "needed with refined queries to collect the best available results, then "
        "base your final answer on what you found."
    )
    messages = [SystemMessage(content=system), HumanMessage(content=prompt_text)]

    for _ in range(max_tool_calls):
        response = await invoke_with_rate_limit_retry(
            lambda: llm_with_tools.ainvoke(messages, config=config),
            description="LLM call (web search loop)",
        )
        messages.append(response)

        if not response.tool_calls:
            return _content_to_str(response.content)

        for tool_call in response.tool_calls:
            tool_result = await search_tool.ainvoke(tool_call["args"])
            messages.append(
                ToolMessage(content=tool_result, tool_call_id=tool_call["id"])
            )

    logger.warning(f"web_search tool-call budget ({max_tool_calls}) exhausted")
    collected = "\n\n".join(
        m.content for m in messages if isinstance(m, ToolMessage)
    )
    final_prompt = (
        f"{prompt_text}\n\n"
        f"--- Search results already collected ---\n{collected}\n\n"
        "Write the final answer now, based only on the search results above."
    )
    final = await invoke_with_rate_limit_retry(
        lambda: llm.ainvoke(final_prompt, config=config),
        description="LLM call (final answer)",
    )
    return _content_to_str(final.content)
