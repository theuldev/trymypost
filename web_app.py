from flask import Flask, render_template, request, jsonify, Response
from langchain_core.prompts import load_prompt
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain_community.tools.tavily_search import TavilySearchResults
from PromptManager import PromptManager
import os
import json
import yaml
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

def load_yaml_prompt(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
    config.pop("_type", None)
    return PromptTemplate(**config)

from langchain_core.prompts import PromptTemplate

topic_researcher_prompt  = load_yaml_prompt(PromptManager.TOPIC_RESEARCHER)
post_generator_prompt    = load_yaml_prompt(PromptManager.POST_GENERATOR)
hashtag_suggestor_prompt = load_yaml_prompt(PromptManager.HASHTAG_SUGGESTOR)
post_reviewer_prompt     = load_yaml_prompt(PromptManager.POST_REVIEWER)
topic_suggestor_prompt   = load_yaml_prompt(PromptManager.TOPIC_SUGGESTOR)

llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash",
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


def search_topics_for_area(area: str) -> dict:
    query = f"{area} tendências 2026 LinkedIn posts engajamento desenvolvimento"
    results = search_tool.invoke({"query": query})
    tendencias = "\n".join(
        f"- {r['url']}: {r['content']}" for r in results
    )
    return {
        "area": area,
        "tendencias_web": tendencias,
    }


topic_suggest_chain = (
    topic_suggestor_prompt
    | llm
    | output_parser
)

research_chain = (
    RunnableLambda(search_trends)
    | topic_researcher_prompt
    | llm
    | output_parser
)

post_chain = (
    post_generator_prompt
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


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/suggest-topics", methods=["POST"])
def suggest_topics():
    body = request.get_json(silent=True) or {}
    area = (body.get("area") or "").strip()

    if len(area) < 3:
        return jsonify({"error": "A área precisa ter pelo menos 3 caracteres."}), 400

    try:
        context = search_topics_for_area(area)
        raw = topic_suggest_chain.invoke(context)

        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        topics = json.loads(cleaned)
        return jsonify({"topics": topics})
    except json.JSONDecodeError:
        return jsonify({"topics": [], "raw": raw, "error": "Formato inesperado da IA."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/generate", methods=["GET", "POST"])
def generate():
    if request.method == "POST":
        body = request.get_json(silent=True) or {}
        tema = (body.get("tema") or "").strip()
        tipo = (body.get("tipo") or "Storytelling").strip()
    else:
        tema = request.args.get("tema", "").strip()
        tipo = request.args.get("tipo", "Storytelling").strip()

    if len(tema) < 10:
        return jsonify({"error": "O tema precisa ter pelo menos 10 caracteres."}), 400

    def event_stream():
        try:
            yield f"data: {json.dumps({'step': 'research', 'status': 'active'})}\n\n"
            research_result = research_chain.invoke({"tema": tema})
            yield f"data: {json.dumps({'step': 'research', 'status': 'done'})}\n\n"

            yield f"data: {json.dumps({'step': 'post', 'status': 'active'})}\n\n"
            post_result = post_chain.invoke({"contexto": research_result, "tipo": tipo})
            yield f"data: {json.dumps({'step': 'post', 'status': 'done'})}\n\n"

            yield f"data: {json.dumps({'step': 'hashtags', 'status': 'active'})}\n\n"
            hashtags_result = hashtag_chain.invoke(post_result)
            yield f"data: {json.dumps({'step': 'hashtags', 'status': 'done'})}\n\n"

            yield f"data: {json.dumps({'step': 'review', 'status': 'active'})}\n\n"
            review_result = reviewer_chain.invoke(post_result)
            yield f"data: {json.dumps({'step': 'review', 'status': 'done'})}\n\n"

            yield f"data: {json.dumps({'step': 'complete', 'result': {'post': post_result, 'hashtags': hashtags_result, 'revisao': review_result}})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'step': 'error', 'error': str(e)})}\n\n"

    return Response(event_stream(), mimetype="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
