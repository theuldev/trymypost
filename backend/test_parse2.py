import re

# Get the actual review from the database
v = """SCORE: 10/10 | 9/10 | 6/10 | 10/10 | 9/10 | 10/10 | 10/10 | 10/10
SCORE FINAL: 9.25/10
STATUS: APROVADO

PROBLEMAS:
*   **Concretude:** Embora descreva os problemas de forma clara, o post poderia se beneficiar de exemplos mais especificos de ferramentas, erros ou numeros (alem de "cinco, dez deploys" ou "3 ou 4 servicos") para reforcar ainda mais a autenticidade e a experiencia vivida, conforme o estilo de referencia "Concreto: ferramenta real, erro real, numero real — nunca generico".

RESULTADO:
POST APROVADO com ajustes pontuais. O gancho e o CTA sao excelentes e nao necessitam de alteracoes. Apenas um ajuste sutil na concretude foi sugerido para elevar ainda mais a qualidade, mantendo o post dentro do limite de caracteres e no estilo desejado.

---"""

result = {
    'score': 0,
    'pontos_fortes': [],
    'pontos_melhoria': [],
    'sugestoes': []
}

# Extract SCORE FINAL
score_match = re.search(r'SCORE FINAL:\s*([\d.]+)/10', v)
if score_match:
    result['score'] = float(score_match.group(1))

# Extract PROBLEMAS -> pontos_melhoria
problemas_match = re.search(r'PROBLEMAS:?\s*\n(.*?)(?:\n\s*(?:RESULTADO|POST REESCRITO|POST APROVADO)|$)', v, re.IGNORECASE | re.DOTALL)
if problemas_match:
    points = problemas_match.group(1).strip()
    for line in points.split('\n'):
        line = line.strip()
        # Remove markdown formatting and bullet points
        line = re.sub(r'^\s*[\*\-\•]\s*', '', line)
        line = re.sub(r'\*\*(.*?)\*\*', r'\1', line)  # Remove **bold**
        if line:
            result['pontos_melhoria'].append(line.strip())

# Extract RESULTADO for pontos_fortes and sugestoes
resultado_match = re.search(r'RESULTADO:?\s*\n(.*?)(?:\n\s*(?:POST REESCRITO|POST APROVADO)|$)', v, re.IGNORECASE | re.DOTALL)
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
                result['sugestoes'].append(line.strip())
            else:
                result['pontos_fortes'].append(line.strip())

print('Result:', result)