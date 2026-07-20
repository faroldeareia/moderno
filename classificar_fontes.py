#!/usr/bin/env python3
"""
classificar_fontes.py — Classifica os CSVs do IBICT/Oasisbr e da BDTD usando a
MESMA lógica de tema do classificar_torio.py (mesmo prompt, mesmo Gemini).

Diferença pro classificar_torio.py: aquele lê o JSON do INIS; este lê os CSVs
já exportados do Oasisbr/BDTD e mapeia as colunas para o MESMO schema de saída,
acrescentando uma coluna `fonte`. Assim os três (INIS, OASIS, BDTD) ficam com
colunas compatíveis e o cruzar_fontes.py junta tudo sem dor de cabeça.

Como rodar (no servidor, no venv que já tem google-genai):
    cd /opt/analise-torio
    source venv/bin/activate
    export GEMINI_API_KEY="sua_chave"
    python classificar_fontes.py oasis  search_result-394460738-csv.csv
    python classificar_fontes.py bdtd   search_result-577884754-csv.csv

Saídas: torio_oasis.csv  e  torio_bdtd.csv
        (seu INIS continua sendo o torio_completo.csv que você já gerou)

Requisitos: pip install google-genai python-dotenv pandas
"""

import os, re, sys, csv, json, time, logging
import pandas as pd
from google import genai
from dotenv import load_dotenv

# ─── CONFIG (igual ao seu) ────────────────────────────────────────────
load_dotenv()
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
MODELO_IA  = os.getenv("MODELO_IA", "gemini-3.5-flash")
DELAY_SEG  = 2
RESUMO_MAX = 3000

logging.basicConfig(level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("torio")

if not GEMINI_KEY:
    log.error("GEMINI_API_KEY não definida. Use export GEMINI_API_KEY=... ou .env")
    sys.exit(1)
client = genai.Client(api_key=GEMINI_KEY)

CATEGORIAS = [
    "Ciclo do Combustivel Nuclear", "Mineracao e Metalurgia",
    "Radioprotecao e Saude", "Quimica Analitica",
    "Politicas Publicas", "Ruido",
]

# Oasisbr/BDTD usam essa string como "vazio". Tratamos como vazio de verdade.
PLACEHOLDER = "não informado pela instituição"
def limpo(x):
    x = "" if x is None else str(x).strip()
    return "" if x.lower() == PLACEHOLDER else x

def limpar_html(t):
    if not t: return ""
    t = re.sub(r"<[^>]+>", " ", str(t))
    return re.sub(r"\s+", " ", t).strip()

# ─── MAPEAMENTO DE COLUNAS POR FONTE ──────────────────────────────────
# Cada fonte tem cabeçalho diferente; aqui traduzimos para o schema comum.
MAPAS = {
    "oasis": {
        "id":                "ID no Oasisbr",
        "titulo":            "Título do documento",
        "titulo_en":         None,               # Oasis não traz título EN separado
        "ano":               "Ano de publicação",
        "instituicao_bruta": "Título da instituição fonte",
        "autores":           "Todos os autores",
        "tipo":              "Tipo de documento",
        "link":              "Link do documento",
        # resumo: prefere o PT; cai pro genérico se faltar
        "resumo":            ["Resumo em Português", "Resumo"],
    },
    "bdtd": {
        "id":                "Identificador persistente ARK",
        "titulo":            "Título",
        "titulo_en":         None,
        "ano":               "Ano de defesa",
        "instituicao_bruta": "Instituição de defesa",
        "autores":           "Autor(a)",
        "tipo":              "Tipo de documento",
        "link":              "Link de acesso",
        "resumo":            ["Resumo em Português", "Resumo"],
    },
}

def pega(row, chave):
    """Resolve uma coluna (ou lista de fallback) do mapa."""
    if chave is None: return ""
    if isinstance(chave, list):
        for c in chave:
            v = limpo(row.get(c, ""))
            if v: return v
        return ""
    return limpo(row.get(chave, ""))

def extrair_campos(row, fonte, idx):
    m = MAPAS[fonte]
    rid = pega(row, m["id"]) or f"{fonte}-{idx}"   # id sintético se faltar
    return {
        "fonte": fonte.upper(),
        "id": rid,
        "titulo": limpar_html(pega(row, m["titulo"])),
        "titulo_en": limpar_html(pega(row, m["titulo_en"])),
        "ano": pega(row, m["ano"]),
        "instituicao_bruta": pega(row, m["instituicao_bruta"]),
        "autores": pega(row, m["autores"]),
        "tipo": pega(row, m["tipo"]),
        "link": pega(row, m["link"]),
        "resumo": limpar_html(pega(row, m["resumo"])),
    }

# ─── CLASSIFICAÇÃO COM IA (prompt idêntico ao seu) ────────────────────
def classificar(reg, tentativas=3):
    prompt = f"""Você é um analista de inteligência em pesquisa nuclear, ajudando um estudo
sobre a evolução da pesquisa científica sobre o TÓRIO. Classifique o registro abaixo
em UMA das seis categorias, e padronize a instituição.

CATEGORIAS DE TEMA (escolha exatamente UMA):
1. "Ciclo do Combustivel Nuclear": geração de energia com tório (reatores, ciclo Th-U, física de reatores).
2. "Mineracao e Metalurgia": mineração, processamento mineral, metalurgia e rejeitos de minérios com tório; prospecção.
3. "Radioprotecao e Saude": contaminação e impactos do tório no corpo humano, dosimetria, proteção radiológica.
4. "Quimica Analitica": métodos químicos (espectrometria, cromatografia, resinas) para detectar/separar/quantificar tório.
5. "Politicas Publicas": políticas públicas específicas para o tório.
6. "Ruido": fora do foco de energia/mineração. Tório como MEIO (traçador/geocronologia) ou uso industrial alternativo.
   Inclua FALSOS POSITIVOS: "tório" dentro de outra palavra (rela"tório", audi"tório", territ"ório") ou tório não é objeto real.

REGRA ANTI-FALSO-POSITIVO: verifique se o TÓRIO (elemento Th) é de fato o objeto do estudo.
Se aparece só de passagem, como traçador, ou por coincidência linguística, classifique como "Ruido".

PADRONIZAÇÃO DA INSTITUIÇÃO: normalize para um nome canônico. Ex.: "University of São Paulo",
"Universidade de São Paulo" e "USP" viram "Universidade de São Paulo (USP)". Se não der, "Não identificada".

REGISTRO:
Título (PT/EN): {reg['titulo']}
Título original (EN): {reg['titulo_en']}
Ano: {reg['ano']}
Instituição (bruta): {reg['instituicao_bruta']}
Tipo: {reg['tipo']}
Resumo: {reg['resumo'][:RESUMO_MAX]}

Responda com este JSON estrito, sem texto fora dele:
{{
  "tema": uma das strings exatas {CATEGORIAS},
  "instituicao_padrao": "nome canônico da instituição",
  "obs_ia": "1 frase curta explicando POR QUE esse tema (auditoria). NÃO use aspas dentro desta frase."
}}"""
    for t in range(1, tentativas + 1):
        try:
            resp = client.models.generate_content(
                model=MODELO_IA, contents=prompt,
                config={"response_mime_type": "application/json",
                    "response_schema": {"type": "object", "properties": {
                        "tema": {"type": "string", "enum": CATEGORIAS},
                        "instituicao_padrao": {"type": "string"},
                        "obs_ia": {"type": "string"}},
                        "required": ["tema", "instituicao_padrao", "obs_ia"]}})
            data = json.loads(resp.text)
            tema = data.get("tema", "").strip()
            if tema not in CATEGORIAS:
                match = next((c for c in CATEGORIAS if c.lower() == tema.lower()), None)
                tema = match or "Ruido"
            return {"tema": tema,
                    "instituicao_padrao": data.get("instituicao_padrao", "").strip() or "Não identificada",
                    "obs_ia": data.get("obs_ia", "").strip()}
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                log.error("🛑 Cota da API esgotada. Pare, espere e rode de novo mais tarde.")
                raise SystemExit(1)
            log.warning(f"Erro na IA (tentativa {t}/{tentativas}): {e}")
            time.sleep(3)
    return {"tema": "Ruido", "instituicao_padrao": "Não identificada",
            "obs_ia": "[Falha na análise da IA — revisar manualmente]"}

# ─── MAIN ─────────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 3 or sys.argv[1] not in MAPAS:
        print("Uso: python classificar_fontes.py <oasis|bdtd> <arquivo.csv>")
        sys.exit(1)
    fonte, arquivo = sys.argv[1], sys.argv[2]

    # engine='python' + on_bad_lines='skip' porque os resumos têm quebras de linha
    df = pd.read_csv(arquivo, dtype=str, engine="python", on_bad_lines="skip").fillna("")
    log.info(f"{arquivo}: {len(df)} linhas (fonte={fonte})")

    colunas = ["fonte", "id", "titulo", "ano", "instituicao_padrao", "tema", "obs_ia",
               "instituicao_bruta", "autores", "tipo", "link", "titulo_en", "resumo"]
    linhas = []
    for i, (_, row) in enumerate(df.iterrows(), 1):
        campos = extrair_campos(row, fonte, i)
        if not campos["titulo"]:
            continue
        ia = classificar(campos)
        campos.update(ia)
        linhas.append(campos)
        log.info(f"[{i}/{len(df)}] {ia['tema']:<28} | {campos['titulo'][:55]}")
        time.sleep(DELAY_SEG)

    saida = f"torio_{fonte}.csv"
    with open(saida, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=colunas, extrasaction="ignore")
        w.writeheader(); w.writerows(linhas)

    from collections import Counter
    log.info("──────── RESUMO ────────")
    for tema, n in Counter(l["tema"] for l in linhas).most_common():
        log.info(f"  {tema:<28} {n}")
    log.info(f"✅ Gerado: {saida} ({len(linhas)} registros)")

if __name__ == "__main__":
    main()
