import yaml
from pathlib import Path
from typing import Dict, Any
from app.core.config import get_settings

settings = get_settings()

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

PROMPT_FILES = {
    "topic_suggest": "topic_suggestor.yaml",
    "topic_research": "topic_researcher.yaml",
    "post_generation": "post_generator.yaml",
    "hashtag_generation": "hashtag_suggestor.yaml",
    "review": "post_reviewer.yaml",
    "hook_generation": "hook_generator.yaml",
    "visual_suggestion": "visual_suggestor.yaml",
    "topic_creation": "topic_creator.yaml",
}

PROMPT_TEMPLATES: Dict[str, Dict[str, Any]] = {}


def load_prompts() -> None:
    global PROMPT_TEMPLATES
    for key, filename in PROMPT_FILES.items():
        path = PROMPTS_DIR / filename
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                PROMPT_TEMPLATES[key] = yaml.safe_load(f)
        else:
            raise FileNotFoundError(f"Prompt file not found: {path}")


def get_prompt(key: str) -> Dict[str, Any]:
    if not PROMPT_TEMPLATES:
        load_prompts()
    return PROMPT_TEMPLATES.get(key, {})


MAP_ESTILO = {
    "Técnico": "técnico, direto, com foco em arquitetura, performance e boas práticas",
    "Storytelling": "narrativo, com gancho emocional, jornada pessoal e lições aprendidas",
    "Opinião/Controverso": "provocativo, com opinião forte, contrarian, gerador de debate",
    "Educacional": "didático, passo a passo, com exemplos práticos e analogias",
    "Carreira/Soft Skills": "reflexivo, focado em crescimento, liderança, comunicação",
    "Humor/Tecnologia": "leve, irônico, memes dev, situações relatable do dia a dia",
    "Minimalista": "curto, direto, uma ideia central, formatação limpa",
    "Case Study": "baseado em dados, problema-solução-resultado, métricas reais",
    "Trends/Novidades": "jornalístico, 'o que há de novo', impacto prático, urgência",
    "Pessoal/Autobiográfico": "íntimo, vulnerável, jornada de carreira, erros e acertos",
}

INSTRUCOES_ESTRUTURA = {
    "Listicle (5 dicas, 3 erros...)": "Estruture como lista numerada com 5-7 itens. Cada item: título forte + 1-2 frases de explicação prática. Use emojis como bullets.",
    "Storytelling (História pessoal)": "Comece com um gancho narrativo (momento de tensão/descoberta). Desenvolva a jornada com começo/meio/fim. Termine com lição aplicável.",
    "Antes/Depois (Transformação)": "Cenário inicial (dor/problema) → Ação/Descoberta → Resultado mensurável. Use contraste visual com 'Antes' e 'Depois'.",
    "Pergunta Aberta (Engajamento)": "Apresente contexto curto + pergunta provocativa no final. Deixe espaço para comentários. Não dê a resposta.",
    "Opinião Forte (Controversa)": "Afirmação polarizadora na 1ª linha. Argumente com 3 pontos técnicos. Antecipe contra-argumentos. Convide discordância.",
    "Mini Tutorial (Passo a passo)": "Objetivo claro → Pré-requisitos → Passos numerados (3-5) → Resultado esperado → Próximos passos.",
}