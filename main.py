from langchain_core.prompts import load_prompt
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain_community.tools.tavily_search import TavilySearchResults
from PromptManager import PromptManager
import os
from dotenv import load_dotenv

load_dotenv()

topic_researcher_prompt  = load_prompt(PromptManager.TOPIC_RESEARCHER)
post_generator_prompt    = load_prompt(PromptManager.POST_GENERATOR)
hashtag_suggestor_prompt = load_prompt(PromptManager.HASHTAG_SUGGESTOR)
post_reviewer_prompt     = load_prompt(PromptManager.POST_REVIEWER)

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
)
output_parser = StrOutputParser()

search_tool = TavilySearchResults(
    max_results=5,
    tavily_api_key=os.getenv("TAVILY_API_KEY"),
)

def search_trends(input_data: dict) -> dict:
    tema = input_data["tema"]
    query = f"{tema} tendências 2026 LinkedIn desenvolvimento software"
    results = search_tool.invoke({"query": query})
    tendencias = "\n".join(
        f"- {r['url']}: {r['content']}" for r in results
    )
    return {
        "tema": tema,
        "tendencias_web": tendencias,
    }

research_chain = (
    RunnableLambda(search_trends)
    | topic_researcher_prompt
    | llm
    | output_parser
)

post_chain = (
    {"contexto": RunnablePassthrough()} 
    | post_generator_prompt
    | llm
    | output_parser
)

hashtag_chain = (
    {"conteudo_post": RunnablePassthrough()}
    | hashtag_suggestor_prompt
    | llm
    | output_parser
)

reviewer_chain = (
    {"posts_gerados": RunnablePassthrough()}
    | post_reviewer_prompt
    | llm
    | output_parser
)

post_analysis_chain = (
    post_chain 
    | RunnableParallel(
        post=RunnablePassthrough(),
        hashtags=hashtag_chain,
        revisao=reviewer_chain,
    )
)

chain = research_chain | post_analysis_chain

if __name__ == "__main__":
    topic = "Migração WebForms para MVC"
    result = chain.invoke({"tema": topic})

    print("=" * 60)
    print("POSTS GERADOS")
    print("=" * 60)
    print(result["post"])

    print("\n" + "=" * 60)
    print("HASHTAGS")
    print("=" * 60)
    print(result["hashtags"])

    print("\n" + "=" * 60)
    print("REVISÃO E SUGESTÕES")
    print("=" * 60)
    print(result["revisao"])