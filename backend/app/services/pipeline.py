import uuid
import json
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools.tavily_search import TavilySearchResults
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.models.post import PostHistory, PostStatus, GenerationTask
from app.services.prompts import get_prompt, MAP_ESTILO, INSTRUCOES_ESTRUTURA


settings = get_settings()


@dataclass
class GenerationState:
    task_id: str
    post_history_id: Optional[int] = None
    status: PostStatus = PostStatus.PENDING
    current_step: str = ""
    progress: int = 0
    result: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    input_data: Dict[str, Any] = field(default_factory=dict)


class AIPipeline:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            temperature=settings.gemini_temperature,
            google_api_key=settings.google_api_key,
        )
        # Tavily é opcional - só cria se tiver API key
        if settings.tavily_api_key:
            self.search = TavilySearchResults(
                max_results=5,
                tavily_api_key=settings.tavily_api_key,
            )
        else:
            self.search = None
        self._setup_chains()

    def _setup_chains(self):
        self.topic_suggest_chain = self._create_chain("topic_suggest")
        self.research_chain = self._create_chain("topic_research")
        self.post_chain = self._create_chain("post_generation")
        self.hashtag_chain = self._create_chain("hashtag_generation")
        self.review_chain = self._create_chain("review")
        
        # hook e visual são opcionais (não existiam no commit original)
        try:
            self.hook_chain = self._create_chain("hook_generation")
        except FileNotFoundError:
            self.hook_chain = None
            
        try:
            self.visual_chain = self._create_chain("visual_suggestion")
        except FileNotFoundError:
            self.visual_chain = None

    def _create_chain(self, prompt_key: str):
        prompt_data = get_prompt(prompt_key)
        template = prompt_data.get("template", "")
        input_vars = prompt_data.get("input_variables", [])
        prompt = PromptTemplate(template=template, input_variables=input_vars)
        # review retorna texto, não JSON
        if prompt_key in ["topic_suggest", "hashtag_generation", "hook_generation", "visual_suggestion"]:
            return prompt | self.llm | JsonOutputParser()
        return prompt | self.llm | StrOutputParser()

    async def run_generation(self, task_id: str, input_data: Dict[str, Any]) -> GenerationState:
        state = GenerationState(task_id=task_id, input_data=input_data)
        
        try:
            await self._update_task(state)
            
            state = await self._step_research(state)
            await self._update_task(state)
            
            state = await self._step_generate_posts(state)
            await self._update_task(state)
            
            state = await self._step_hashtags(state)
            await self._update_task(state)
            
            state = await self._step_hooks(state)
            await self._update_task(state)
            
            if input_data.get("incluir_visual", False):
                state = await self._step_visual(state)
                await self._update_task(state)
            
            state = await self._step_review(state)
            await self._update_task(state)
            
            state = await self._save_to_history(state)
            await self._update_task(state)
            
            state.status = PostStatus.COMPLETED
            state.progress = 100
            state.current_step = "Concluído"
            
        except Exception as e:
            state.status = PostStatus.FAILED
            state.error = str(e)
            state.current_step = "Erro"
        
        await self._update_task(state)
        return state

    async def _step_research(self, state: GenerationState) -> GenerationState:
        state.current_step = "Pesquisando tendências..."
        state.progress = 10
        
        topic = state.input_data["tema"]
        
        if self.search:
            search_results = await self.search.ainvoke(f"tendências 2024 {topic} desenvolvimento software linkedin")
        else:
            search_results = []
        
        research_input = {
            "topic": topic,
            "web_trends": json.dumps(search_results, ensure_ascii=False),
            "quantity": 5,
        }
        research_result = await self.research_chain.ainvoke(research_input)
        
        try:
            topics = json.loads(research_result) if isinstance(research_result, str) else research_result
            state.result["topicos_pesquisados"] = topics.get("topicos", [])
        except:
            state.result["topicos_pesquisados"] = [topic]
        
        return state

    async def _step_generate_posts(self, state: GenerationState) -> GenerationState:
        state.current_step = "Gerando posts..."
        state.progress = 30
        
        input_data = state.input_data
        estilo_desc = MAP_ESTILO.get(input_data["estilo"], input_data["estilo"])
        estrutura = INSTRUCOES_ESTRUTURA.get(input_data["formato"], "")
        angulos = state.result.get("topicos_pesquisados", [])
        angulo_base = angulos[0] if angulos else input_data["tema"]
        
        # Mapeamento de emoji intensidade por estilo
        emoji_map = {
            "Técnico": "Nenhum",
            "Storytelling": "Poucos", 
            "Opinião/Controverso": "Poucos",
            "Educacional": "Médio",
            "Carreira/Soft Skills": "Médio",
            "Humor/Tecnologia": "Muitos",
            "Minimalista": "Nenhum",
            "Case Study": "Poucos",
            "Trends/Novidades": "Médio",
            "Pessoal/Autobiográfico": "Médio",
        }
        
        # Mapeamento de tom por estilo
        tom_map = {
            "Técnico": "técnico e direto",
            "Storytelling": "narrativo e envolvente",
            "Opinião/Controverso": "provocativo e direto",
            "Educacional": "didático e acessível",
            "Carreira/Soft Skills": "reflexivo e empático",
            "Humor/Tecnologia": "leve e irônico",
            "Minimalista": "curto e direto",
            "Case Study": "analítico e factual",
            "Trends/Novidades": "jornalístico e atual",
            "Pessoal/Autobiográfico": "íntimo e vulnerável",
        }
        
        # Mapeamento de CTA por objetivo
        cta_map = {
            "Engajamento / Comentários": "gerar discussão nos comentários",
            "Autoridade / Personal Branding": "posicionar como referência técnica",
            "Geração de Leads / Vendas": "converter para call/demo",
            "Networking / Conexões": "iniciar conversa com pares",
            "Educar / Compartilhar Conhecimento": "compartilhar aprendizado prático",
            "Atrair Oportunidades / Contratação": "demonstrar expertise para recrutadores",
        }
        
        # Mapeamento de comprimento por formato
        comprimento_map = {
            "Listicle (5 dicas, 3 erros...)": "2500",
            "Storytelling (História pessoal)": "2800",
            "Antes/Depois (Transformação)": "2500",
            "Pergunta Aberta (Engajamento)": "2000",
            "Opinião Forte (Controversa)": "2200",
            "Mini Tutorial (Passo a passo)": "2800",
        }
        
        quantidade = input_data.get("quantidade", 3)
        posts = []
        posts_raw_list = []
        
        # Gerar um post por vez (como no código original) para garantir qualidade e quantidade correta
        for i in range(quantidade):
            # Usar ângulos diferentes se disponíveis, senão reusar o principal
            angulo = angulos[i] if i < len(angulos) else angulo_base
            
            state.current_step = f"Gerando post {i + 1} de {quantidade}..."
            state.progress = 30 + int((i / quantidade) * 20)
            await self._update_task(state)
            
            post_input = {
                "topic": input_data["tema"],
                "format": input_data["formato"],
                "context": "\n".join(state.result.get("topicos_pesquisados", [input_data["tema"]])),
                "angle": angulo,
                "objective": input_data["objetivo"],
                "target_audience": input_data["publico"],
                "experience": input_data["experiencia"],
                "tone": tom_map.get(input_data["estilo"], "técnico e direto"),
                "emoji_intensity": emoji_map.get(input_data["estilo"], "Nenhum"),
                "cta_objective": cta_map.get(input_data["objetivo"], "gerar discussão"),
                "length": comprimento_map.get(input_data["formato"], "2500"),
                "target_audience": input_data["publico"],
                "rules": input_data.get("guidelines", ""),
                "format": input_data["formato"],
                "tone": tom_map.get(input_data["estilo"], "técnico e direto"),
                "voice_example": MAP_ESTILO.get(input_data["estilo"], ""),
                "structure_instructions": INSTRUCOES_ESTRUTURA.get(input_data["formato"], ""),
                "rules": input_data.get("guidelines", ""),
                "include_code": (
                    "REGRAS DE CÓDIGO: Você DEVE incluir exemplos de código relevantes no post. "
                    "Use blocos de código markdown (```linguagem) para exemplos práticos. "
                    "O código deve ser simples, real e ilustrar o ponto técnico do post."
                    if input_data.get("incluir_codigo") else
                    "REGRAS DE CÓDIGO: NÃO inclua nenhum código ou bloco de código no post. "
                    "Explique os conceitos apenas em prosa, sem exemplos de código."
                ),
            }
            
            post_text = await self.post_chain.ainvoke(post_input)
            posts_raw_list.append(post_text)
            posts.append({"variacao": i + 1, "conteudo": post_text.strip()})
        
        state.result["posts_raw"] = "\n\n---\n\n".join(posts_raw_list)
        state.result["posts_data"] = posts

        return state

    async def _step_hashtags(self, state: GenerationState) -> GenerationState:
        state.current_step = "Gerando hashtags..."
        state.progress = 50
        
        posts_text = "\n\n".join([p.get("conteudo", "") for p in state.result.get("posts_data", [])])
        
        hashtag_input = {
            "post_content": posts_text,
            "brand": "TryMyPost",
        }
        
        hashtag_result = await self.hashtag_chain.ainvoke(hashtag_input)
        
        try:
            hashtags = hashtag_result
            if isinstance(hashtags, str):
                hashtags = json.loads(hashtags)
            if isinstance(hashtags, dict):
                # Prompt returns: {"populares": [...], "nicho": [...], "marca": [...]}
                # Convert to frontend expected format: [{"tag": "#tag", "relevancia": "...", "volume_estimado": "..."}, ...]
                all_tags = []
                for category, tags in hashtags.items():
                    if isinstance(tags, list):
                        for tag in tags:
                            all_tags.append({
                                "tag": tag.replace("#", ""),
                                "relevancia": category.capitalize(),
                                "volume_estimado": "N/A"
                            })
                state.result["hashtags"] = all_tags
            else:
                state.result["hashtags"] = []
        except:
            state.result["hashtags"] = []
        
        return state

    async def _step_hooks(self, state: GenerationState) -> GenerationState:
        state.current_step = "Criando hooks..."
        state.progress = 60
        
        hook_input = {
            "context": "\n\n".join([p.get("conteudo", "") for p in state.result.get("posts_data", [])]),
            "objective": state.input_data["objetivo"],
            "tone": MAP_ESTILO.get(state.input_data["estilo"], "técnico e direto"),
            "experience": state.input_data["experiencia"],
            "target_audience": state.input_data["publico"],
        }
        
        if self.hook_chain:
            try:
                hook_result = await self.hook_chain.ainvoke(hook_input)
                # LLM returns array directly, not an object with "hooks" key
                hooks = hook_result if isinstance(hook_result, list) else json.loads(hook_result)
                if isinstance(hooks, dict) and "hooks" in hooks:
                    state.result["hooks"] = hooks["hooks"]
                else:
                    state.result["hooks"] = hooks if isinstance(hooks, list) else []
            except:
                state.result["hooks"] = []
        else:
            state.result["hooks"] = []
        
        return state

    async def _step_visual(self, state: GenerationState) -> GenerationState:
        state.current_step = "Sugerindo identidade visual..."
        state.progress = 70
        
        posts_text = "\n\n".join([p.get("conteudo", "") for p in state.result.get("posts_data", [])])
        
        visual_input = {
            "topic": state.input_data["tema"],
            "post_content": "\n\n".join([p.get("conteudo", "") for p in state.result.get("posts_data", [])]),
        }
        
        if self.visual_chain:
            try:
                visual_result = await self.visual_chain.ainvoke(visual_input)
                visual = visual_result if isinstance(visual_result, dict) else json.loads(visual_result)
                state.result["visual_sugestao"] = visual
            except:
                state.result["visual_sugestao"] = {}
        else:
            state.result["visual_sugestao"] = {}
        
        return state

    async def _step_review(self, state: GenerationState) -> GenerationState:
        state.current_step = "Revisando qualidade..."
        state.progress = 85
        
        posts_text = "\n\n".join([p.get("conteudo", "") for p in state.result.get("posts_data", [])])
        
        angulos_list = state.result.get("topicos_pesquisados", [])
        angulo = angulos_list[0] if angulos_list else state.input_data["tema"]
        
        comprimento_map = {
            "Listicle (5 dicas, 3 erros...)": "2500",
            "Storytelling (História pessoal)": "2800",
            "Antes/Depois (Transformação)": "2500",
            "Pergunta Aberta (Engajamento)": "2000",
            "Opinião Forte (Controversa)": "2200",
            "Mini Tutorial (Passo a passo)": "2800",
        }
        
        review_input = {
            "post": "\n\n".join([p.get("conteudo", "") for p in state.result.get("posts_data", [])]),
            "format": state.input_data["formato"],
            "angle": state.result.get("topicos_pesquisados", [state.input_data["tema"]])[0] if state.result.get("topicos_pesquisados") else state.input_data["tema"],
            "length": {
                "Listicle (5 dicas, 3 erros...)": "2500",
                "Storytelling (História pessoal)": "2800",
                "Antes/Depois (Transformação)": "2500",
                "Pergunta Aberta (Engajamento)": "2000",
                "Opinião Forte (Controversa)": "2200",
                "Mini Tutorial (Passo a passo)": "2800",
            }.get(state.input_data["formato"], "2500"),
        }
        
        review_result = await self.review_chain.ainvoke(review_input)
        
        # review_chain usa StrOutputParser, retorna string
        review_text = review_result if isinstance(review_result, str) else str(review_result)
        state.result["review"] = self._parse_review(review_text)
        
        return state
    
    def _parse_review(self, review_text: str) -> Dict[str, Any]:
        """Parse review text into structured dict for Pydantic model"""
        import re
        
        result = {
            "score": 0,
            "pontos_fortes": [],
            "pontos_melhoria": [],
            "sugestoes": []
        }
        
        # Extract SCORE FINAL
        score_match = re.search(r'SCORE FINAL:\s*([\d.]+)/10', review_text)
        if score_match:
            result["score"] = float(score_match.group(1))
        
        # Extract PROBLEMAS -> pontos_melhoria
        problemas_match = re.search(r'PROBLEMAS:?\s*\n(.*?)(?:\n\s*(?:RESULTADO|POST REESCRITO|POST APROVADO)|$)', review_text, re.IGNORECASE | re.DOTALL)
        if problemas_match:
            points = problemas_match.group(1).strip()
            for line in points.split('\n'):
                line = line.strip()
                # Remove markdown formatting and bullet points
                line = re.sub(r'^\s*[\*\-\•]\s*', '', line)
                line = re.sub(r'\*\*(.*?)\*\*', r'\1', line)  # Remove **bold**
                if line:
                    result["pontos_melhoria"].append(line.strip())
        
        # Extract RESULTADO for pontos_fortes and sugestoes
        resultado_match = re.search(r'RESULTADO:?\s*\n(.*?)(?:\n\s*(?:POST REESCRITO|POST APROVADO)|$)', review_text, re.IGNORECASE | re.DOTALL)
        if resultado_match:
            result_text = resultado_match.group(1).strip()
            # Split by sentences or bullet points
            for line in result_text.split('\n'):
                line = line.strip()
                # Remove markdown formatting
                line = re.sub(r'\*\*(.*?)\*\*', r'\1', line)
                line = re.sub(r'^\s*[\*\-\•]\s*', '', line)
                if line:
                    # Check if it's a suggestion (contains suggestion keywords)
                    if any(kw in line.lower() for kw in ['suger', 'ajust', 'melhor', 'recomend', 'poderia', 'deveria']):
                        result["sugestoes"].append(line.strip())
                    else:
                        result["pontos_fortes"].append(line.strip())
        
        return result

    async def _save_to_history(self, state: GenerationState) -> GenerationState:
        state.current_step = "Salvando no histórico..."
        state.progress = 95
        
        input_data = state.input_data
        
        history = PostHistory(
            tema=input_data["tema"],
            estilo=input_data["estilo"],
            publico=input_data["publico"],
            experiencia=input_data["experiencia"],
            objetivo=input_data["objetivo"],
            formato=input_data["formato"],
            incluir_codigo=input_data.get("incluir_codigo", False),
            incluir_visual=input_data.get("incluir_visual", False),
            status=PostStatus.COMPLETED,
            posts_data=state.result.get("posts_data"),
            topicos_pesquisados=state.result.get("topicos_pesquisados"),
            hashtags=state.result.get("hashtags"),
            hooks=state.result.get("hooks"),
            review=state.result.get("review"),
            visual_sugestao=state.result.get("visual_sugestao"),
            completed_at=datetime.utcnow(),
        )
        
        self.db.add(history)
        await self.db.commit()
        await self.db.refresh(history)
        
        state.post_history_id = history.id
        state.result["history_id"] = history.id
        
        return state

    async def _update_task(self, state: GenerationState):
        task = await self.db.get(GenerationTask, state.task_id)
        if task:
            task.status = state.status
            task.current_step = state.current_step
            task.progress = state.progress
            task.result = state.result
            task.error = state.error
            await self.db.commit()


async def start_generation_task(db: AsyncSession, input_data: Dict[str, Any]) -> str:
    task_id = str(uuid.uuid4())
    
    task = GenerationTask(
        id=task_id,
        status=PostStatus.PENDING,
        current_step="Iniciando...",
        progress=0,
    )
    db.add(task)
    await db.commit()
    
    asyncio.create_task(run_generation_background(task_id, input_data))
    
    return task_id


async def run_generation_background(task_id: str, input_data: Dict[str, Any]):
    from app.db.session import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        pipeline = AIPipeline(db)
        await pipeline.run_generation(task_id, input_data)