from langchain_core.prompts import load_prompt
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain_community.tools.tavily_search import TavilySearchResults
from PromptManager import PromptManager
import os
import unicodedata
from dotenv import load_dotenv

load_dotenv()

TIPOS_VALIDOS = {"STORYTELLING", "EDUCATIVO", "OPINIAO", "INFORMATIVO"}


def normalize_tipo(tipo):
    if not tipo:
        return "STORYTELLING"
    nfkd = unicodedata.normalize('NFKD', tipo)
    sem_acento = ''.join(c for c in nfkd if not unicodedata.combining(c))
    resultado = sem_acento.strip().upper()
    if resultado in TIPOS_VALIDOS:
        return resultado
    return "STORYTELLING"


INSTRUCOES_ESTRUTURA = {
    "STORYTELLING": (
        "• Gancho: 1-2 linhas — uma dor, um erro, uma semana difícil. Para o scroll.\n"
        "• Contexto rápido: o que você estava tentando fazer.\n"
        "• O problema real que apareceu.\n"
        "• A virada: o que mudou seu entendimento.\n"
        "• 3 aprendizados concretos usando '->' no início de cada linha.\n"
        "• 1 linha filosófica de fechamento (ex: 'Garbage in, garbage out').\n"
        "• CTA: pergunta aberta e real para incentivar comentários."
    ),
    "EDUCATIVO": (
        "• Abertura: contexto do problema técnico em 2 linhas de forma direta e prática.\n"
        "• Por que a abordagem óbvia/comum não funciona (explicando a causa raiz).\n"
        "• O fluxo passo a passo que resolveu o problema, usando obrigatoriamente '->' para cada etapa.\n"
        "• O que isso poupou ou qual foi o ganho real e mensurável (ex: performance, tempo, legibilidade).\n"
        "• 3 pontos chave aprendidos no processo em formato de parágrafos curtos em prosa (sem usar '->').\n"
        "• CTA: pergunta técnica aos leitores sobre a experiência deles com esse problema específico."
    ),
    "OPINIAO": (
        "• Afirmação forte e direta que vai contra o senso comum na área técnica (1 linha, sem rodeios).\n"
        "• Explicação de por que a maioria dos desenvolvedores chega na conclusão errada.\n"
        "• O argumento técnico fundamentado com um exemplo prático específico da vida real.\n"
        "• Conclusão objetiva em no máximo 2 linhas.\n"
        "• CTA provocativo: instigue o leitor a debater, discordar ou complementar nos comentários."
    ),
    "INFORMATIVO": (
        "• Abertura direta: apresente o conceito ou ferramenta em 1-2 linhas, como se fosse a primeira frase de uma documentação técnica bem escrita.\n"
        "• O QUE É: explique o conceito/ferramenta de forma objetiva e precisa, sem rodeios. Como uma referência técnica.\n"
        "• COMO FUNCIONA: descreva o mecanismo interno ou o fluxo de funcionamento usando '->' para cada etapa.\n"
        "• QUANDO USAR (e quando NÃO usar): cenários práticos com exemplos reais de aplicação e contra-indicações.\n"
        "• EXEMPLO PRÁTICO: um trecho de código, comando CLI ou configuração real que o leitor pode copiar e usar.\n"
        "• CTA: pergunta técnica pedindo ao leitor para compartilhar como ele usa essa ferramenta/conceito no dia a dia."
    ),
}

EXEMPLOS_VOZ = {
    "STORYTELLING": (
        "\"Estava integrando uma API Python com LangChain no n8n e esbarrei num problema clássico.\n"
        "Meu n8n não rodava local — estava em cloud. E minha API estava na minha máquina em desenvolvimento.\n"
        "A solução foi o ngrok. Em dois minutos tinha uma URL pública apontando pro meu localhost.\""
    ),
    "EDUCATIVO": (
        "\"O Thread Pool do Kestrel zerou e a API .NET parou de responder com apenas 15% de CPU.\n"
        "A abordagem óbvia foi envelopar a chamada síncrona do SDK antigo em Task.Run().\n"
        "Mas isso só mudou o gargalo de lugar:\n"
        "-> O Task.Run roubava thread do pool principal para fazê-la esperar a rede de forma síncrona.\n"
        "-> O pool esgotou do mesmo jeito, pois não havia assincronismo real de I/O.\n"
        "-> A solução correta foi refatorar a chamada para usar HttpClient assíncrono nativo.\n"
        "Economizamos 80% de threads sob carga intensa e estabilizamos o tempo de resposta da aplicação.\""
    ),
    "OPINIAO": (
        "\"Marcar método com 'async' sem ter um 'await' real dentro dele é apenas desperdício de recurso.\n"
        "A maioria faz isso achando que a máquina de estados do compilador faz mágica assíncrona sozinha.\n"
        "Na prática, você adiciona overhead de alocação de memória e processamento para rodar código síncrono.\n"
        "Se não há I/O assíncrono real, mantenha o método síncrono ou use multithreading real apenas para CPU-bound.\n"
        "Qual a sua opinião sobre o uso indiscriminado de async/await no seu time?\""
    ),
    "INFORMATIVO": (
        "\"O IAsyncEnumerable<T> foi introduzido no C# 8.0 e permite consumir sequências assíncronas sem carregar tudo na memória.\n"
        "Funciona assim:\n"
        "-> O produtor gera itens sob demanda usando 'yield return' dentro de um método 'async'.\n"
        "-> O consumidor processa cada item conforme chega, sem esperar a coleção inteira.\n"
        "-> O runtime gerencia o fluxo de backpressure automaticamente entre produtor e consumidor.\n"
        "Use quando: streaming de dados do banco, leitura de arquivos grandes linha a linha, APIs que retornam páginas.\n"
        "Não use quando: a coleção inteira cabe na memória e você precisa de operações como .Count() ou .OrderBy().\n"
        "Como você lida com streaming de dados grandes nos seus projetos?\""
    ),
}


def get_instrucoes_estrutura(tipo):
    return INSTRUCOES_ESTRUTURA.get(normalize_tipo(tipo), INSTRUCOES_ESTRUTURA["STORYTELLING"])


def get_exemplo_voz(tipo):
    return EXEMPLOS_VOZ.get(normalize_tipo(tipo), EXEMPLOS_VOZ["STORYTELLING"])


topic_researcher_prompt  = load_prompt(PromptManager.TOPIC_RESEARCHER)
post_generator_prompt    = load_prompt(PromptManager.POST_GENERATOR)
hashtag_suggestor_prompt = load_prompt(PromptManager.HASHTAG_SUGGESTOR)
post_reviewer_prompt     = load_prompt(PromptManager.POST_REVIEWER)

llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.9,
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


def prepare_post_input(contexto):
    tipo = "Storytelling"
    return {
        "contexto": contexto,
        "tipo": tipo,
        "instrucoes_estrutura": get_instrucoes_estrutura(tipo),
        "exemplo_voz": get_exemplo_voz(tipo)
    }


post_chain = (
    RunnableLambda(prepare_post_input)
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


def prepare_review_input(posts_gerados):
    return {
        "posts_gerados": posts_gerados,
        "tipo": "Storytelling"
    }


reviewer_chain = (
    RunnableLambda(prepare_review_input)
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
    topic = "Diferença entre Task, async e await (explicado simples)"
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