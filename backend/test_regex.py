import re

v = """SCORE: 10/10 | 9/10 | 6/10 | 10/10 | 9/10 | 10/10 | 10/10 | 10/10
SCORE FINAL: 9.25/10
STATUS: APROVADO

PROBLEMAS:
*   **Concretude:** Embora descreva os problemas de forma clara, o post poderia se beneficiar de exemplos mais especificos de ferramentas, erros ou numeros (alem de "cinco, dez deploys" ou "3 ou 4 servicos") para reforcar ainda mais a autenticidade e a experiencia vivida, conforme o estilo de referencia "Concreto: ferramenta real, erro real, numero real — nunca generico".

RESULTADO:
POST APROVADO com ajustes pontuais. O gancho e o CTA sao excelentes e nao necessitam de alteracoes. Apenas um ajuste sutil na concretude foi sugerido para elevar ainda mais a qualidade, mantendo o post dentro do limite de caracteres e no estilo desejado.

---"""

# Test PROBLEMAS regex
problemas_match = re.search(r'PROBLEMAS:?\s*\n(.*?)(?:\n\s*(?:RESULTADO|POST REESCRITO|POST APROVADO)|$)', v, re.IGNORECASE | re.DOTALL)
if problemas_match:
    print('PROBLEMAS match:', repr(problemas_match.group(1)[:200]))
else:
    print('PROBLEMAS no match')

# Test RESULTADO regex
resultado_match = re.search(r'RESULTADO:?\s*\n(.*?)(?:\n\s*(?:POST REESCRITO|POST APROVADO)|$)', v, re.IGNORECASE | re.DOTALL)
if resultado_match:
    print('RESULTADO match:', repr(resultado_match.group(1)[:200]))
else:
    print('RESULTADO no match')