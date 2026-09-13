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
    "code_generator": "code_generator.yaml",
    "topic_creation": "topic_creator.yaml",
    "translation": "translation.yaml",
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


STYLE_MAP = {
    "Technical": "technical, direct, focused on architecture, performance and best practices",
    "Storytelling": "narrative, with emotional hook, personal journey and lessons learned",
    "Opinion/Controversial": "provocative, strong opinion, contrarian, debate generator",
    "Educational": "didactic, step by step, with practical examples and analogies",
    "Career/Soft Skills": "reflective, focused on growth, leadership, communication",
    "Humor/Technology": "light, ironic, dev memes, relatable daily situations",
    "Minimalist": "short, direct, one central idea, clean formatting",
    "Case Study": "data-driven, problem-solution-result, real metrics",
    "Trends/News": "journalistic, 'what's new', practical impact, urgency",
    "Personal/Autobiographical": "intimate, vulnerable, career journey, mistakes and successes",
}

STRUCTURE_INSTRUCTIONS = {
    "Listicle (5 tips, 3 mistakes...)": "Structure as numbered list with 5-7 items. Each item: strong title + 1-2 sentences of practical explanation. Use emojis as bullets.",
    "Storytelling (Personal story)": "Start with narrative hook (moment of tension/discovery). Develop journey with beginning/middle/end. End with applicable lesson.",
    "Before/After (Transformation)": "Initial scenario (pain/problem) → Action/Discovery → Measurable result. Use visual contrast with 'Before' and 'After'.",
    "Open Question (Engagement)": "Present short context + provocative question at the end. Leave room for comments. Don't give the answer.",
    "Strong Opinion (Controversial)": "Polarizing statement in first line. Argue with 3 technical points. Anticipate counter-arguments. Invite disagreement.",
    "Mini Tutorial (Step by step)": "Clear objective → Prerequisites → Numbered steps (3-5) → Expected result → Next steps.",
}