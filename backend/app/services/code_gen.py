from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import get_settings


settings = get_settings()


class CodeGenerator:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            temperature=0.3,
            google_api_key=settings.google_api_key,
        )
        self.chain = self._create_chain()

    def _create_chain(self):
        template = """Você é um engenheiro de software sênior. Extraia ou crie um exemplo de código representativo a partir do texto de um post do LinkedIn.

Texto do post:
{post}

Retorne APENAS um JSON válido com:
- code: o código (string, sem markdown, sem formatação extra)
- language: a linguagem (javascript, typescript, python, csharp, java, go, rust, sql, html, css, bash, json, plaintext)
- title: nome do arquivo sugerido (ex: Program.cs, script.py, index.ts)

Regras:
1. Se o post já contém blocos de código, use o mais relevante
2. Se não há código, crie um exemplo didático que ilustre o conceito do post
3. O código deve ser limpo, bem formatado e pronto para usar
4. language deve ser um dos valores válidos acima"""
        
        prompt = PromptTemplate(template=template, input_variables=["post"])
        return prompt | self.llm | JsonOutputParser()

    async def generate(self, post_text: str) -> dict:
        return await self.chain.ainvoke({"post": post_text})