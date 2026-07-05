from flask import Flask, render_template, request, jsonify, Response
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_community.tools.tavily_search import TavilySearchResults
from PromptManager import PromptManager
import os
import json
import yaml
import unicodedata
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

TIPOS_VALIDOS = {"STORYTELLING", "EDUCATIVO", "OPINIAO", "INFORMATIVO", "COMPARATIVO", "EXPLICATIVO"}


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
        "- Abre com uma situação real — uma linha só, sem contexto extra. "
        "O leitor tem que se reconhecer naquilo antes de saber do que se trata.\n"
        "- Conta o que estava tentando fazer e o que apareceu de errado, em prosa corrida. "
        "Escreva como quem está recontando pra um colega de trabalho, não como quem documenta.\n"
        "- Explica a causa raiz de forma simples — como se fosse a primeira vez que você entendeu de verdade. "
        "Pode usar analogia se ajudar, mas não force.\n"
        "- Traz o que mudou o entendimento: um detalhe técnico, uma leitura, uma tentativa que falhou antes de funcionar.\n"
        "- Encerra com uma frase que captura a lógica por trás do erro — direta, seca, sem tom motivacional. "
        "Uma frase que o leitor vai lembrar.\n"
        "- CTA: uma pergunta curta e genuína sobre a experiência do leitor com esse tipo de problema."
    ),
    "EDUCATIVO": (
        "- SEMPRE parte de um problema real que apareceu primeiro — uma dor concreta vivida antes de existir solução. "
        "Abre com isso em uma frase, como ele aparece na prática, não como título de artigo.\n"
        "- Explica por que a solução óbvia não funciona, como se estivesse contando o raciocínio que você mesmo "
        "teve antes de entender direito.\n"
        "- Descreve o que resolveu em prosa, falando diretamente com o leitor ('você', 'a gente'). "
        "Use '->' só se as etapas forem realmente sequenciais e fizerem sentido assim.\n"
        "- Traz o ganho concreto: número, comportamento observável, algo que o leitor consegue imaginar acontecendo.\n"
        "- Fecha com o que esse problema ensina de mais amplo — sem virar lição de vida. "
        "Uma observação técnica que conecta com problemas parecidos.\n"
        "- CTA: pergunta técnica direta sobre como o leitor lida com esse cenário no dia a dia."
    ),
    "OPINIAO": (
        "- Primeira linha: a tese limpa. Sem qualificação, sem 'mas depende'. "
        "Uma afirmação que alguém pode discordar de cara.\n"
        "- Explica por que a maioria chega na conclusão errada — com empatia, não com superioridade. "
        "Pode reconhecer que essa visão errada é comum e compreensível, sem precisar se incluir nela.\n"
        "- Traz o argumento técnico com um exemplo real e específico: ferramenta real, erro real, número real. "
        "Nada genérico, nada hipotético.\n"
        "- Conclusão em uma frase. Sem expandir, sem repetir o que já disse.\n"
        "- CTA provocativo: convide quem discorda ou quem quer complementar — não quem vai só concordar."
    ),
    "INFORMATIVO": (
        "- NÃO existe problema disparador nem comparação com outra tecnologia — é puramente explicativo. "
        "Abre com uma situação prática onde o conceito aparece, descrita na 3ª pessoa ou de forma impessoal "
        "(ex: 'Quando uma API precisa lidar com milhares de eventos por segundo...'), sem usar 'eu' ou relato pessoal.\n"
        "- Explica o que é a tecnologia/conceito em prosa coloquial e direta, como quem explica pra alguém que nunca ouviu falar. "
        "Pode falar com o leitor via 'você' quando fizer sentido pedagógico, mas sem narrar experiência própria — "
        "é explicação, não memória.\n"
        "- Mostra como funciona por dentro, em prosa: o mecanismo, o fluxo, as peças que interagem. "
        "Use '->' só se as etapas forem realmente sequenciais e dependentes de ordem — não como formatação.\n"
        "- Quando faz sentido usar essa tecnologia e quando não faz, com exemplos reais de cenário — "
        "sem comparar com uma alternativa específica (isso é função do Comparativo).\n"
        "- Fecha com o erro mais comum cometido ao usar esse conceito, descrito de forma impessoal "
        "(ex: 'o erro mais comum é usar X sem precisar do Y que ele resolve'). Uma frase seca, sem tom de lista.\n"
        "- CTA: pergunta direta ao leitor sobre como ele usa isso no dia a dia ou se já caiu em alguma armadilha parecida. "
        "A pessoalidade fica reservada ao CTA — o corpo do texto é sempre explicativo e impessoal."
    ),
    "COMPARATIVO": (
        "- Abre nomeando as duas opções em conflito direto — uma linha, sem enrolação. "
        "Algo como 'X ou Y: a escolha errada custa caro' ou citando as duas ferramentas/abordagens já na primeira frase.\n"
        "- Explica o critério que a maioria usa pra decidir (geralmente errado ou raso — "
        "'mais rápido', 'mais moderno', 'todo mundo usa') antes de mostrar o critério que realmente importa.\n"
        "- Compara as duas opções em prosa, ponto a ponto, com exemplo real de cada uma "
        "(comportamento observado, número, caso de uso real). Evite tabela — o leitor tem que sentir a diferença lendo, não escaneando.\n"
        "- Aponta quando cada uma vence — sem ficar em cima do muro. "
        "Pode (e deve) dizer que uma das opções é melhor na maioria dos casos do tema do post.\n"
        "- Fecha com a armadilha mais comum: escolher pelo critério errado ou usar a opção errada fora do contexto certo.\n"
        "- CTA: pergunte qual das duas o leitor usa e por quê — formato que convida quem usa a outra a defender a escolha."
    ),
    "EXPLICATIVO": (
        "- Abre com uma pergunta direta sobre o conceito, do tipo 'O que é X que aparece em Y?' "
        "ou 'Já parou pra pensar no que [conceito] realmente faz?'. É uma definição perguntada, não uma história.\n"
        "- NUNCA narre experiência pessoal. Não use 'eu', 'comigo', 'quando eu vi isso'. "
        "O texto fala COM o leitor (pode usar 'você'), mas nunca FALA SOBRE o autor.\n"
        "- Apresente o nome completo/sigla do conceito em uma frase curta e direta, sem rodeio.\n"
        "- Construa uma ANALOGIA do cotidiano (restaurante, trânsito, fila de banco, correio, etc) "
        "e mapeie cada peça do conceito técnico pra uma peça da analogia, de forma explícita "
        "(ex: 'O Garçom é o mensageiro que leva seu pedido'). A analogia carrega a explicação inteira.\n"
        "- Depois da analogia, traduza de volta pro termo técnico real, mostrando o conceito acontecendo "
        "na prática com um exemplo bem simples e comum (não avançado, não de sistema gigante).\n"
        "- Pode citar uma consequência prática curiosa do conceito (um erro comum, um código de status, "
        "um comportamento que o leitor já viu sem saber o porquê).\n"
        "- Fecha reforçando a definição em uma frase simples, sem tom de aula nem moral da história.\n"
        "- CTA: pergunta que convida o leitor a relacionar o conceito com algo que ele já viu ou usou, "
        "sempre na 2ª pessoa ('você já...', 'você sabia...'), nunca contando o que o autor viveu."
    ),
}

EXEMPLOS_VOZ = {
    "STORYTELLING": (
        "\"Início de carreira tem um 'ritual' quase obrigatório:\n"
        "você implementa algo, não funciona... e começa a duvidar de tudo.\n\n"
        "Do código. Da configuração. Da documentação.\n"
        "E, em algum momento, até de você mesmo.\n\n"
        "'Será que o token tá errado?'\n"
        "'A secret key está passando?'\n"
        "'Ou só não nasci pra isso mesmo?'\n\n"
        "Foi exatamente assim quando implementei autenticação JWT em uma API .NET.\n"
        "Tudo parecia certo: geração do token, validação, claims...\n"
        "Mas toda requisição voltava 401.\n"
        "Foram 2 horas entre documentação, vídeos, Stack Overflow e debug...\n"
        "até chegar na causa.\n\n"
        "A ordem importa.\n\n"
        "Isso me marcou tanto que hoje, quando vejo um 401 sem explicação, "
        "a primeira coisa que faço é abrir o Program.cs.\n"
        "E você? já perdeu horas em um bug que tinha uma solução absurdamente simples?\""
    ),
    "EDUCATIVO": (
        "\"Algumas semanas atrás fiz um post onde abordei tipos por valor e por referência. "
        "Pensando melhor sobre o tema, achei que faria sentido complementar com algo mais prático: "
        "quando usar struct, class e record no dia a dia?\n\n"
        "Em C#, você tem três formas principais de modelar seus dados:\n"
        "- Class -> tipo por referência. Quando você passa um objeto de classe pra outro lugar, "
        "você tá passando o endereço de memória. Dois lugares apontando pro mesmo objeto = um muda, o outro sente.\n"
        "- Struct -> tipo por valor. Cada variável tem sua própria cópia dos dados.\n"
        "- Record -> aqui as coisas ficam interessantes. Por padrão é um tipo por referência, "
        "mas foi feito pra dados imutáveis.\n\n"
        "Cada um tem seu lugar. O erro mais comum que vejo é usar class pra tudo por hábito, "
        "às vezes um record simples já resolve com muito menos boilerplate.\n"
        "Você costuma usar records no seu dia a dia?\""
    ),
    "OPINIAO": (
        "\"Desenhar a arquitetura antes de escrever a primeira linha de código não é burocracia. "
        "É a etapa que a maioria pula — e é exatamente onde os problemas futuros nascem.\n\n"
        "Construir um sistema de IA em produção não é só escolher um LLM e sair integrando. "
        "É uma decisão arquitetural com trade-offs reais que vão acompanhar o time por meses.\n\n"
        "O erro mais comum: arquitetura que funciona no demo mas não escala. "
        "Tudo num arquivo só, sem separação de camadas, sem tratamento de falha.\n\n"
        "Sistema de IA bem arquitetado é aquele que dá pra explicar num diagrama "
        "antes de abrir o editor.\n"
        "Como você estrutura seus sistemas hoje?\""
    ),
    "INFORMATIVO": (
        "\"Quando uma tabela tem 500 mil registros e cada um precisa ser processado antes de passar pro próximo, "
        "carregar tudo na memória de uma vez deixa de ser opção.\n\n"
        "É exatamente esse cenário que o IAsyncEnumerable<T> resolve.\n\n"
        "Ele chegou no C# 8.0 pra permitir consumir uma sequência assíncrona item a item, "
        "sem esperar tudo carregar. O produtor gera cada item com yield return dentro de um método async, "
        "o consumidor processa conforme os itens chegam, e o runtime gerencia o fluxo entre os dois automaticamente.\n\n"
        "Faz sentido em streaming de dados do banco, leitura de arquivos grandes linha a linha, "
        "ou consumo de APIs paginadas. Não faz sentido quando a coleção inteira cabe na memória e em algum momento "
        "vai ser necessário usar Count() ou OrderBy() — nesses casos, uma lista resolve melhor.\n\n"
        "O erro mais comum é usar IAsyncEnumerable só por parecer mais moderno, sem existir streaming de verdade "
        "por trás. Isso adiciona complexidade sem trazer ganho nenhum.\n\n"
        "Como você lida com volumes grandes de dados que não podem ir todos pra memória de uma vez?\""
    ),
    "COMPARATIVO": (
        "\"REST ou GraphQL: a escolha errada aqui não trava o projeto no dia 1 — trava no mês 6.\n\n"
        "O critério que a maioria usa é 'GraphQL é mais moderno, então é melhor'. "
        "Na prática, isso ignora o problema que cada um foi feito pra resolver.\n\n"
        "REST brilha quando os recursos são previsíveis: endpoints fixos, cache de CDN funcionando de graça, "
        "qualquer dev novo entendendo a API em 10 minutos só lendo as rotas.\n\n"
        "GraphQL ganha quando o cliente precisa de combinações variáveis de dados — um app mobile "
        "que busca perfil, posts e notificações numa tela só, sem fazer 5 requisições ou trazer campos que não vai usar.\n\n"
        "Pra um CRUD simples com poucos clientes consumindo, GraphQL costuma adicionar mais complexidade "
        "de infraestrutura (resolvers, N+1 query problem, cache mais difícil) do que resolve.\n\n"
        "A armadilha mais comum: escolher GraphQL pelo hype e descobrir só depois de pago o custo de manter "
        "um schema enorme pra um caso de uso que um REST simples resolveria em uma tarde.\n\n"
        "Você usa qual dos dois no seu stack atual — e o que te fez escolher?\""
    ),"EXPLICATIVO": (
        "\"O que é o 'HTTP' que aparece em todo site que você acessa?\n\n"
        "Sempre que você digita um endereço no navegador, essas quatro letras estão lá trabalhando "
        "nos bastidores. Mas o que elas realmente fazem?\n\n"
        "HTTP significa Hypertext Transfer Protocol. Para entender como ele funciona na prática, "
        "imagine que a internet é um grande restaurante.\n\n"
        "Você (o navegador) é o cliente sentado à mesa querendo ver o cardápio. "
        "O garçom é o HTTP — o mensageiro que leva seu pedido e traz sua comida. "
        "A cozinha é o servidor, onde o site que você quer acessar está guardado.\n\n"
        "Quando você clica em um link, você faz um pedido (request). O garçom corre até a cozinha, "
        "pega os arquivos da página, e traz de volta pra sua tela — essa é a resposta (response).\n\n"
        "É por isso que existem os famosos códigos de erro: se você pede uma página que não existe mais, "
        "o garçom volta de mãos vazias com o clássico Erro 404.\n\n"
        "No fim, HTTP é só o conjunto de regras que garante que esse pedido e essa entrega aconteçam "
        "sempre da mesma forma, entre qualquer navegador e qualquer servidor do mundo.\n\n"
        "Você já tinha parado pra pensar no que acontece entre digitar o endereço e a página aparecer?\""
    ),
}


def get_instrucoes_estrutura(tipo):
    return INSTRUCOES_ESTRUTURA.get(normalize_tipo(tipo), INSTRUCOES_ESTRUTURA["STORYTELLING"])


def get_exemplo_voz(tipo):
    return EXEMPLOS_VOZ.get(normalize_tipo(tipo), EXEMPLOS_VOZ["STORYTELLING"])


def load_yaml_prompt(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
    config.pop("_type", None)
    return PromptTemplate(**config)


topic_researcher_prompt  = load_yaml_prompt(PromptManager.TOPIC_RESEARCHER)
post_generator_prompt    = load_yaml_prompt(PromptManager.POST_GENERATOR)
hashtag_suggestor_prompt = load_yaml_prompt(PromptManager.HASHTAG_SUGGESTOR)
post_reviewer_prompt     = load_yaml_prompt(PromptManager.POST_REVIEWER)
topic_suggestor_prompt   = load_yaml_prompt(PromptManager.TOPIC_SUGGESTOR)

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
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


def extract_angulos(research_result: str) -> list[str]:
    """
    Extrai os 5 ângulos pré-distribuídos do briefing do researcher.
    Procura pela seção '6. ÂNGULOS PRÉ-DISTRIBUÍDOS' e retorna as 5 linhas numeradas.
    Se não encontrar, gera ângulos genéricos como fallback.
    """
    angulos_genericos = [
        "o erro que você comete antes de entender o conceito de verdade",
        "por que a solução óbvia não funciona nesse caso",
        "o número ou comportamento que surpreende quem não conhece",
        "a pegadinha de produção que a documentação não conta",
        "por que a maioria usa isso errado e como corrigir",
    ]

    try:
        linhas = research_result.splitlines()
        dentro_angulos = False
        angulos = []

        for linha in linhas:
            linha_strip = linha.strip()
            if "ÂNGULOS PRÉ-DISTRIBUÍDOS" in linha_strip.upper() or linha_strip.startswith("6."):
                dentro_angulos = True
                continue
            if dentro_angulos:
                # Para ao encontrar próxima seção numerada
                if linha_strip and linha_strip[0].isdigit() and linha_strip[1] in ".)" and not linha_strip.startswith(("1.", "2.", "3.", "4.", "5.")):
                    break
                # Captura linhas que começam com número de 1-5
                if linha_strip and linha_strip[0] in "12345" and len(linha_strip) > 2:
                    texto = linha_strip.lstrip("12345.-) ").strip()
                    if texto:
                        angulos.append(texto)
                if len(angulos) == 5:
                    break

        return angulos if len(angulos) == 5 else angulos_genericos
    except Exception:
        return angulos_genericos


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
    {"conteudo_post": lambda x: x}
    | hashtag_suggestor_prompt
    | llm
    | output_parser
)

reviewer_chain = (
    post_reviewer_prompt
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

    if not area:
        return jsonify({"error": "O campo área é obrigatório."}), 400

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

    if not tema:
        return jsonify({"error": "O tema é obrigatório."}), 400

    tipo_normalizado = normalize_tipo(tipo)

    def event_stream():
        try:
            # 1. Research
            yield f"data: {json.dumps({'step': 'research', 'status': 'active'})}\n\n"
            research_result = research_chain.invoke({"tema": tema})
            yield f"data: {json.dumps({'step': 'research', 'status': 'done'})}\n\n"

            # 2. Extrair ângulos do briefing
            angulos = extract_angulos(research_result)

            # 3. Gerar 5 posts individualmente, um por ângulo
            posts = []
            for i, angulo in enumerate(angulos, start=1):
                yield f"data: {json.dumps({'step': 'post', 'status': 'active', 'index': i, 'total': 5})}\n\n"

                post_result = post_chain.invoke({
                    "contexto": research_result,
                    "tipo": tipo,
                    "instrucoes_estrutura": get_instrucoes_estrutura(tipo_normalizado),
                    "exemplo_voz": get_exemplo_voz(tipo_normalizado),
                    "angulo": angulo,
                })
                posts.append({"angulo": angulo, "post": post_result})
                yield f"data: {json.dumps({'step': 'post', 'status': 'done', 'index': i})}\n\n"

            # 4. Hashtags (baseadas no conjunto de posts)
            yield f"data: {json.dumps({'step': 'hashtags', 'status': 'active'})}\n\n"
            posts_concatenados = "\n\n---\n\n".join(p["post"] for p in posts)
            hashtags_result = hashtag_chain.invoke(posts_concatenados)
            yield f"data: {json.dumps({'step': 'hashtags', 'status': 'done'})}\n\n"

            # 5. Revisar cada post individualmente
            revisoes = []
            for i, item in enumerate(posts, start=1):
                yield f"data: {json.dumps({'step': 'review', 'status': 'active', 'index': i, 'total': 5})}\n\n"

                review_result = reviewer_chain.invoke({
                    "post": item["post"],
                    "tipo": tipo,
                    "angulo": item["angulo"],
                })
                revisoes.append({"angulo": item["angulo"], "revisao": review_result})
                yield f"data: {json.dumps({'step': 'review', 'status': 'done', 'index': i})}\n\n"

            # 6. Resultado final
            resultado = {
                "posts": posts,
                "hashtags": hashtags_result,
                "revisoes": revisoes,
            }
            yield f"data: {json.dumps({'step': 'complete', 'result': resultado})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'step': 'error', 'error': str(e)})}\n\n"

    return Response(event_stream(), mimetype="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)