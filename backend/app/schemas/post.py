from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class EstiloEnum(str, Enum):
    TECNICO = "Técnico"
    STORYTELLING = "Storytelling"
    OPINIAO = "Opinião/Controverso"
    EDUCACIONAL = "Educacional"
    CARREIRA = "Carreira/Soft Skills"
    HUMOR = "Humor/Tecnologia"
    MINIMALISTA = "Minimalista"
    CASE_STUDY = "Case Study"
    TRENDS = "Trends/Novidades"
    PERSONAL = "Pessoal/Autobiográfico"


class PublicoEnum(str, Enum):
    JUNIORES = "Desenvolvedores Júnior"
    PLENOS = "Desenvolvedores Pleno"
    SENIORES = "Desenvolvedores Sênior"
    TECH_LEADS = "Tech Leads / Arquitetos"
    GESTORES = "Gestores / CTOs"
    FULLSTACK = "Full Stack"
    BACKEND = "Backend"
    FRONTEND = "Frontend"
    DEVOPS = "DevOps / SRE"
    DATA = "Data / IA"
    MOBILE = "Mobile"
    GERAL = "Geral / Todos"


class ExperienciaEnum(str, Enum):
    INICIANTE = "Iniciante (0-2 anos)"
    INTERMEDIARIO = "Intermediário (2-5 anos)"
    AVANCADO = "Avançado (5-10 anos)"
    EXPERT = "Expert (10+ anos)"


class ObjetivoEnum(str, Enum):
    ENGAJAMENTO = "Engajamento / Comentários"
    AUTORIDADE = "Autoridade / Personal Branding"
    LEADS = "Geração de Leads / Vendas"
    NETWORKING = "Networking / Conexões"
    EDUCAR = "Educar / Compartilhar Conhecimento"
    CONTRATACAO = "Atrair Oportunidades / Contratação"


class FormatoEnum(str, Enum):
    LISTICLE = "Listicle (5 dicas, 3 erros...)"
    STORYTELLING = "Storytelling (História pessoal)"
    ANTES_DEPOIS = "Antes/Depois (Transformação)"
    PERGUNTA = "Pergunta Aberta (Engajamento)"
    OPINIAO = "Opinião Forte (Controversa)"
    TUTORIAL = "Mini Tutorial (Passo a passo)"


class GeneratePostRequest(BaseModel):
    tema: str = Field(..., min_length=1, max_length=500)
    estilo: EstiloEnum
    publico: PublicoEnum
    experiencia: ExperienciaEnum
    objetivo: ObjetivoEnum
    formato: FormatoEnum
    incluir_codigo: bool = False
    incluir_visual: bool = False
    guidelines: Optional[str] = None
    quantidade: int = Field(default=3, ge=1, le=5)


class GeneratePostResponse(BaseModel):
    task_id: str
    status: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    current_step: Optional[str] = None
    progress: int = 0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class PostHistoryBase(BaseModel):
    id: int
    tema: str
    estilo: str
    publico: str
    experiencia: str
    objetivo: str
    formato: str
    incluir_codigo: bool
    incluir_visual: bool
    status: str
    favorito: bool
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PostHistoryDetail(PostHistoryBase):
    posts_data: Optional[List[Dict[str, Any]]] = None
    topicos_pesquisados: Optional[List[str]] = None
    hashtags: Optional[List[Dict[str, Any]]] = None
    hooks: Optional[List[Dict[str, Any]]] = None
    review: Optional[Dict[str, Any]] = None
    visual_sugestao: Optional[Dict[str, Any]] = None


class PostHistoryListResponse(BaseModel):
    items: List[PostHistoryBase]
    total: int
    page: int
    page_size: int


class ToggleFavoriteRequest(BaseModel):
    favorito: bool


class UpdateTagsRequest(BaseModel):
    tags: List[str]


class CodeFromPostRequest(BaseModel):
    post: str = Field(..., min_length=1)


class CodeFromPostResponse(BaseModel):
    code: str
    language: str
    title: str


class SuggestTopicsRequest(BaseModel):
    contexto: Optional[str] = None
    quantidade: int = Field(default=5, ge=1, le=10)


class SuggestTopicsResponse(BaseModel):
    topics: List[Dict[str, Any]]


class HealthResponse(BaseModel):
    status: str
    version: str