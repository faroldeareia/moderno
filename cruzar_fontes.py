#!/usr/bin/env python3
"""
cruzar_fontes.py — Junta os CSVs já classificados (INIS + OASIS + BDTD),
identifica quais registros são a MESMA obra e monta a visão consolidada:
o que existe em cada base, o que é exclusivo, o que se repete.

Estratégia (bloquear barato, arbitrar caro):
  PASSO 1 (determinístico, de graça): casa por título normalizado com
          fuzzy>=90 dentro de janela de ano ±1. Isso resolve PT↔PT muito bem
          (pega até variação de acento/maiúscula e duplicata interna).
  PASSO 2 (ponte INIS↔BR): registros ainda soltos são cruzados por
          SOBRENOME do 1º autor + ano ±2. Se o título casar forte, junta;
          senão, vira "candidato a revisão" (não junta no automático).
  PASSO 3 (opcional, --llm): manda SÓ os candidatos duvidosos pro Gemini
          decidir "mesma obra? sim/não". Poucos pares => barato e reproduzível
          (a decisão da IA fica registrada na coluna de auditoria).

Entradas (o que existir; nomes flexíveis):
    torio_completo.csv   (INIS — o que você já gerou)
    torio_oasis.csv      (do classificar_fontes.py)
    torio_bdtd.csv       (do classificar_fontes.py)

Saídas:
    torio_mestre.csv   -> toda linha original + obra_id + fontes_da_obra
    torio_obras.csv    -> 1 linha por obra: em_inis/em_oasis/em_bdtd, tema, título
    torio_revisar.csv  -> pares na zona cinzenta p/ conferência (ou decididos pela IA)

Como rodar:
    python cruzar_fontes.py                         # determinístico
    python cruzar_fontes.py --llm                   # + arbitragem da IA na zona cinzenta

Requisitos: pip install pandas rapidfuzz unidecode  (google-genai só se usar --llm)
"""

import os, re, sys, csv, json, time, glob
import pandas as pd
from unidecode import unidecode
from rapidfuzz import fuzz
from collections import defaultdict

USAR_LLM = "--llm" in sys.argv

# Arquivos de entrada e como reconhecer a fonte de cada um
ENTRADAS = [
    ("torio_completo.csv", "INIS"),
    ("torio_oasis.csv",    "OASIS"),
    ("torio_bdtd.csv",     "BDTD"),
]

# ─── NORMALIZAÇÃO ─────────────────────────────────────────────────────
STOP = set(("de da do das dos e a o as os um uma no na em para por com sobre "
            "the of and in on to an study estudo").split())

def norm_titulo(t):
    t = unidecode(str(t)).lower()
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    return " ".join(w for w in t.split() if w not in STOP and len(w) > 1)

def ano4(x):
    m = re.search(r"(19|20)\d{2}", str(x))
    return int(m.group(0)) if m else None

def sobrenome(autores):
    """1º autor -> sobrenome minúsculo sem acento. Lida com '||', ';' e 'Sobrenome, Nome'."""
    a = re.split(r"\|\||;", str(autores))[0].strip()
    if not a or a.lower() == "não informado pela instituição":
        return ""
    if "," in a:
        return unidecode(a.split(",")[0]).lower().strip()
    toks = a.split()
    return unidecode(toks[-1]).lower().strip() if toks else ""

# ─── CARGA ────────────────────────────────────────────────────────────
def carregar():
    frames = []
    for arq, fonte in ENTRADAS:
        if not os.path.exists(arq):
            print(f"[aviso] {arq} não encontrado — pulando ({fonte}).")
            continue
        df = pd.read_csv(arq, dtype=str, engine="python", on_bad_lines="skip").fillna("")
        # tolera INIS sem coluna 'fonte'/'resumo'
        if "fonte" not in df.columns:
            df["fonte"] = fonte
        for col in ["resumo", "titulo_en", "instituicao_padrao", "tema", "obs_ia", "link"]:
            if col not in df.columns:
                df[col] = ""
        df["arquivo"] = arq
        print(f"  {arq}: {len(df)} linhas ({fonte})")
        frames.append(df)
    if not frames:
        print("Nenhum CSV de entrada encontrado. Rode antes o classificar_fontes.py.")
        sys.exit(1)
    u = pd.concat(frames, ignore_index=True)
    u["rid"]   = range(len(u))
    u["nt"]    = u["titulo"].map(norm_titulo)
    u["ano4"]  = u["ano"].map(ano4)
    u["sobre"] = u["autores"].map(sobrenome)
    return u

# ─── UNION-FIND ───────────────────────────────────────────────────────
class UF:
    def __init__(self, n): self.p = list(range(n))
    def find(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]; x = self.p[x]
        return x
    def union(self, a, b): self.p[self.find(a)] = self.find(b)

# ─── ARBITRAGEM OPCIONAL PELA IA ──────────────────────────────────────
def adjudicar_llm(u, i, j):
    """Pergunta ao Gemini se dois registros são a mesma obra. Retorna (bool, motivo)."""
    from google import genai
    from dotenv import load_dotenv
    load_dotenv()
    key = os.getenv("GEMINI_API_KEY")
    modelo = os.getenv("MODELO_IA", "gemini-3.5-flash")
    client = genai.Client(api_key=key)
    a, b = u.loc[i], u.loc[j]
    prompt = f"""Dois registros de bases bibliográficas diferentes. Diga se são a MESMA obra
(mesma tese/artigo), lembrando que o título pode estar traduzido (inglês x português),
o autor pode estar abreviado e o ano pode variar 1-2 anos (defesa x publicação).

REGISTRO A ({a['fonte']}): título="{a['titulo']}" | autor="{a['autores'][:60]}" | ano={a['ano']}
REGISTRO B ({b['fonte']}): título="{b['titulo']}" | autor="{b['autores'][:60]}" | ano={b['ano']}

Responda JSON: {{"mesma_obra": true/false, "motivo": "1 frase curta sem aspas"}}"""
    try:
        resp = client.models.generate_content(model=modelo, contents=prompt,
            config={"response_mime_type": "application/json",
                "response_schema": {"type": "object", "properties": {
                    "mesma_obra": {"type": "boolean"},
                    "motivo": {"type": "string"}},
                    "required": ["mesma_obra", "motivo"]}})
        d = json.loads(resp.text)
        return bool(d.get("mesma_obra")), d.get("motivo", "")
    except Exception as e:
        return False, f"[falha IA: {e}]"

# ─── MAIN ─────────────────────────────────────────────────────────────
def main():
    print("Carregando…")
    u = carregar()
    n = len(u)
    uf = UF(n)
    print(f"Total unificado: {n} linhas")

    # índice por ano p/ blocagem
    por_ano = defaultdict(list)
    for i in range(n):
        if u.at[i, "ano4"] is not None:
            por_ano[u.at[i, "ano4"]].append(i)

    revisar = []          # (score, i, j, origem)
    pares_vistos = set()

    # PASSO 1 — título forte + ano ±1  (resolve PT↔PT e duplicata interna)
    auto = 0
    for i in range(n):
        y = u.at[i, "ano4"]
        if y is None: continue
        cands = [k for dy in (-1, 0, 1) for k in por_ano.get(y + dy, [])]
        for j in cands:
            if j <= i: continue
            key = (i, j)
            if key in pares_vistos: continue
            pares_vistos.add(key)
            sc = fuzz.token_sort_ratio(u.at[i, "nt"], u.at[j, "nt"])
            if sc >= 90:
                uf.union(i, j); auto += 1
            elif sc >= 78:
                revisar.append((sc, i, j, "titulo-medio"))
    print(f"Passo 1: {auto} pares casados no automático (título>=90 & ano±1)")

    # PASSO 2 — ponte por autor+ano SÓ para o caso cross-idioma (INIS x Brasil).
    # Entre OASIS e BDTD o título já é confiável (Passo 1); disparar a ponte por
    # autor ali só geraria ruído (obras diferentes do mesmo autor). Por isso a
    # ponte só age quando UM dos lados é INIS (título em inglês, fuzzy não serve).
    por_sobre = defaultdict(list)
    for i in range(n):
        if u.at[i, "sobre"]:
            por_sobre[u.at[i, "sobre"]].append(i)
    ponte_auto = 0
    for sob, grupo in por_sobre.items():
        for a_idx in range(len(grupo)):
            for b_idx in range(a_idx + 1, len(grupo)):
                i, j = grupo[a_idx], grupo[b_idx]
                if uf.find(i) == uf.find(j): continue          # já juntos
                fi, fj = u.at[i, "fonte"], u.at[j, "fonte"]
                if fi == fj: continue                          # ponte é entre bases
                if "INIS" not in (fi, fj): continue            # só cross-idioma
                yi, yj = u.at[i, "ano4"], u.at[j, "ano4"]
                if yi is None or yj is None or abs(yi - yj) > 2: continue
                sc = fuzz.token_sort_ratio(u.at[i, "nt"], u.at[j, "nt"])
                if sc >= 90:
                    uf.union(i, j); ponte_auto += 1            # título coincidiu (raro, mas ótimo)
                else:
                    revisar.append((sc, i, j, "ponte-INIS"))   # mesmo autor+ano, título difere -> arbitrar
    print(f"Passo 2: {ponte_auto} pontes INIS↔BR casadas por título; "
          f"{len([r for r in revisar if r[3]=='ponte-INIS'])} candidatos INIS↔BR p/ revisar")

    # PASSO 3 — arbitragem da IA (opcional) só na zona cinzenta
    decisoes_ia = {}
    if USAR_LLM and revisar:
        print(f"Passo 3: arbitrando {len(revisar)} pares com a IA…")
        for k, (sc, i, j, origem) in enumerate(revisar, 1):
            if uf.find(i) == uf.find(j):  # já unidos por transitividade
                continue
            mesma, motivo = adjudicar_llm(u, i, j)
            decisoes_ia[(i, j)] = (mesma, motivo)
            if mesma:
                uf.union(i, j)
            print(f"  [{k}/{len(revisar)}] {'MESMA' if mesma else 'difere'} "
                  f"| {u.at[i,'titulo'][:40]} ~ {u.at[j,'titulo'][:40]}")
            time.sleep(1.5)

    # ─── MONTA CLUSTERS (obras) ───────────────────────────────────────
    clusters = defaultdict(list)
    for i in range(n):
        clusters[uf.find(i)].append(i)
    obra_id = {}
    for oid, membros in enumerate(sorted(clusters.values(), key=lambda m: -len(m)), 1):
        for m in membros:
            obra_id[m] = f"OBRA{oid:04d}"

    u["obra_id"] = u["rid"].map(obra_id)
    fontes_por_obra = u.groupby("obra_id")["fonte"].agg(lambda s: "+".join(sorted(set(s))))
    u["fontes_da_obra"] = u["obra_id"].map(fontes_por_obra)
    u["n_fontes"] = u["fontes_da_obra"].map(lambda s: len(s.split("+")))

    # ─── SAÍDA 1: mestre (toda linha) ─────────────────────────────────
    cols_mestre = ["obra_id", "fontes_da_obra", "n_fontes", "fonte", "id", "titulo",
                   "ano", "instituicao_padrao", "tema", "obs_ia", "autores", "link"]
    u_out = u[[c for c in cols_mestre if c in u.columns]]
    u_out.to_csv("torio_mestre.csv", index=False, encoding="utf-8-sig")

    # ─── SAÍDA 2: obras (1 linha por obra, visão de cobertura) ─────────
    linhas_obra = []
    for oid, membros in u.groupby("obra_id"):
        fontes = set(membros["fonte"])
        # representante: prefere registro com resumo/título mais longo em PT
        rep = membros.loc[membros["titulo"].str.len().idxmax()]
        temas = [t for t in membros["tema"] if t]
        tema_final = max(set(temas), key=temas.count) if temas else ""
        linhas_obra.append({
            "obra_id": oid,
            "em_inis":  "INIS"  in fontes,
            "em_oasis": "OASIS" in fontes,
            "em_bdtd":  "BDTD"  in fontes,
            "n_fontes": len(fontes),
            "n_registros": len(membros),
            "tema": tema_final,
            "tema_divergente": len(set(temas)) > 1,   # IA discordou entre bases -> olhar
            "ano": rep["ano"],
            "instituicao_padrao": rep["instituicao_padrao"],
            "titulo": rep["titulo"],
            "titulos_todos": " || ".join(sorted(set(membros["titulo"]))),
        })
    obras = pd.DataFrame(linhas_obra).sort_values(
        ["n_fontes", "tema"], ascending=[False, True])
    obras.to_csv("torio_obras.csv", index=False, encoding="utf-8-sig")

    # ─── SAÍDA 3: revisar (zona cinzenta) ─────────────────────────────
    linhas_rev = []
    for sc, i, j, origem in revisar:
        mesma, motivo = decisoes_ia.get((i, j), (None, ""))
        linhas_rev.append({
            "score_titulo": round(sc, 1),
            "origem": origem,
            "decisao_ia": "" if mesma is None else ("mesma" if mesma else "difere"),
            "motivo_ia": motivo,
            "fonte_A": u.at[i, "fonte"], "titulo_A": u.at[i, "titulo"],
            "ano_A": u.at[i, "ano"], "autor_A": u.at[i, "autores"][:50],
            "fonte_B": u.at[j, "fonte"], "titulo_B": u.at[j, "titulo"],
            "ano_B": u.at[j, "ano"], "autor_B": u.at[j, "autores"][:50],
        })
    pd.DataFrame(linhas_rev).to_csv("torio_revisar.csv", index=False, encoding="utf-8-sig")

    # ─── RESUMO ───────────────────────────────────────────────────────
    print("\n──────── RESUMO ────────")
    print(f"Linhas totais:      {n}")
    print(f"Obras únicas:       {obras.shape[0]}")
    print(f"  só INIS:          {((obras.em_inis)&(~obras.em_oasis)&(~obras.em_bdtd)).sum()}")
    print(f"  só OASIS:         {((~obras.em_inis)&(obras.em_oasis)&(~obras.em_bdtd)).sum()}")
    print(f"  só BDTD:          {((~obras.em_inis)&(~obras.em_oasis)&(obras.em_bdtd)).sum()}")
    print(f"  em 2+ bases:      {(obras.n_fontes>=2).sum()}")
    print(f"  INIS ∩ Brasil:    {(obras.em_inis & (obras.em_oasis|obras.em_bdtd)).sum()}")
    print(f"Temas divergentes entre bases (revisar): {obras.tema_divergente.sum()}")
    print(f"Pares na zona de revisão: {len(revisar)}")
    print("\n✅ Gerados: torio_mestre.csv, torio_obras.csv, torio_revisar.csv")

if __name__ == "__main__":
    main()
