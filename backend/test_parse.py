import re

v = """SCORE: 10/10 | 9/10 | 6/10 | 10/10 | 9/10 | 10/10 | 10/10 | 10/10
SCORE FINAL: 9.25/10
STATUS: APROVADO

PROBLEMAS:
*   **Concretude:** Embora descreva os problemas de forma clara, o post poderia se beneficiar de exemplos mais específicos de ferramentas, erros ou números (além de "cinco, dez deploys" ou "3 ou 4 serviços") para reforçar ainda mais a autenticidade e a experiência vivida, conforme o estilo de referência "Concreto: ferramenta real, erro real, número real — nunca genérico".

RESULTADO:
POST APROVADO com ajustes pontuais. O gancho e o CTA são excelentes e não necessitam de alterações. Apenas um ajuste sutil na concretude foi sugerido para elevar ainda mais a qualidade, mantendo o post dentro do limite de caracteres e no estilo desejado.

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
        if line.startswith('*') or line.startswith('-') or line.startswith('•'):
            result['pontos_melhoria'].append(line.lstrip('*-• ').strip())
        elif line:
            result['pontos_melhoria'].append(line)

# Extract RESULTADO for pontos_fortes and sugestoes
resultado_match = re.search(r'RESULTADO:?\s*\n(.*?)(?:\n\s*(?:POST REESCRITO|POST APROVADO)|$)', v, re.IGNORECASE | re.DOTALL)
if resultado_match:
    result_text = resultado_match.group(1).strip()
    for line in result_text.split('\n'):
        line = line.strip()
        if line:
            if any(kw in line.lower() for kw in ['suger', 'ajust', 'melhor', 'recomend', 'poderia', 'deveria']):
                result['sugestoes'].append(line.lstrip('*-• ').strip())
            else:
                result['pontos_fortes'].append(line.lstrip('*-• ').strip())

print('Result:', result)