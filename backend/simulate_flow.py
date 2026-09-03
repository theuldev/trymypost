"""Simula o fluxo completo de geracao, escrevendo as respostas que o backend enviaria.

Usado para validar a logica do frontend sem precisar do GOOGLE_API_KEY real.
Roda com: python backend/simulate_flow.py
"""
import json
import sys
from pathlib import Path

FRONTEND_SRC = Path(__file__).resolve().parents[1] / "frontend" / "src"

# 1. POST /api/v1/posts/generate
POST_RESPONSE = {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "processing",
}

# 2. GET /api/v1/posts/generate/{task_id} -- em processamento
POLL_PROCESSING = {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "processing",
    "current_step": "Gerando posts",
    "progress": 35,
    "result": None,
    "error": None,
}

# 3. GET /api/v1/posts/generate/{task_id} -- concluido
POLL_COMPLETED = {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "completed",
    "current_step": "Concluido",
    "progress": 100,
    "result": {
        "topicos_pesquisados": ["topico 1", "topico 2"],
        "posts_data": [
            {
                "variacao": 1,
                "conteudo": "Voce ja parou pra pensar nisso?\n\nEste e o post de teste.",
            },
            {
                "variacao": 2,
                "conteudo": "Hot take: o problema raramente e a tecnologia.",
            },
        ],
        "hashtags": [
            {"tag": "tech", "relevancia": "Alta", "volume_estimado": "100K"},
        ],
        "hooks": [
            {
                "tipo": "Provocacao",
                "texto": "Voce nao precisa de mais um framework.",
                "por_que_funciona": "Vai contra o hype.",
            },
        ],
        "review": json.dumps({
            "score": 8,
            "pontos_fortes": ["Abertura forte"],
            "pontos_melhoria": ["Metrica"],
            "sugestoes": ["CTA"],
        }, ensure_ascii=False),
        "visual_sugestao": {
            "tipo_conteudo": "Carrossel",
            "descricao_visual": "Slide 1 com pergunta.",
            "codigo_exemplo": "<Carousel</Carousel>",
            "codigo_linguagem": "tsx",
            "ferramentas_sugeridas": ["Figma"],
            "dicas_composicao": ["Bold"],
        },
    },
    "error": None,
}

# 4. GET /api/v1/posts/generate/{task_id} -- falha
POLL_FAILED = {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "failed",
    "current_step": "Erro",
    "progress": 35,
    "result": None,
    "error": "Timeout na chamada ao LLM",
}

SCENARIOS = {
    "happy_path": [POST_RESPONSE, POLL_PROCESSING, POLL_PROCESSING, POLL_COMPLETED],
    "failure_path": [POST_RESPONSE, POLL_PROCESSING, POLL_FAILED],
}

if __name__ == "__main__":
    scenario = sys.argv[1] if len(sys.argv) > 1 else "happy_path"
    print(json.dumps(SCENARIOS.get(scenario, []), indent=2, ensure_ascii=False))
