"""Referência independente do hiato (statsmodels), para os testes do site.

Não é dependência do projeto: rode à parte (pip install statsmodels numpy):
    python gerar_hiato_referencia.py <apisidra_1621_pib_todo.json> hiato_referencia.json
"""
import json, sys
import numpy as np
import statsmodels, statsmodels.api as sm
from statsmodels.tsa.filters.hp_filter import hpfilter

d = json.load(open(sys.argv[1], encoding="utf-8"))
obs = []
for ln in d[1:]:
    p = int(ln["D3C"]); ano, q = divmod(p, 100)
    obs.append([f"{ano}-{3*(q-1)+1:02d}-01", float(ln["V"])])
y = 100 * np.log(np.array([v for _, v in obs]))
ciclo, _ = hpfilter(y, lamb=1600)
tr = {}
for i in range(19, len(y)):
    c, _ = hpfilter(y[: i + 1], lamb=1600)
    tr[obs[i][0]] = float(c[-1])
h, p = 8, 4
X, Y, idx = [], [], []
for t in range(p - 1, len(y) - h):
    X.append([y[t - j] for j in range(p)]); Y.append(y[t + h]); idx.append(t + h)
res = sm.OLS(np.array(Y), sm.add_constant(np.array(X))).fit()
ham = {obs[i][0]: float(r) for i, r in zip(idx, res.resid)}
out = {
    "fonte": "IBGE SIDRA t1621 v584 c11255=90707 (apisidra, gravado 2026-10-15)",
    "referencia": f"statsmodels {statsmodels.__version__}: hpfilter(λ=1600), hpfilter em janelas crescentes (mín. 20), OLS h=8 p=4",
    "pib": obs,
    "hp": {obs[i][0]: float(c) for i, c in enumerate(ciclo)},
    "hpTempoReal": tr,
    "hamilton": ham,
    "hamiltonBeta": [float(b) for b in res.params],
}
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(obs), statsmodels.__version__, obs[-1], out["hp"][obs[-1][0]], tr[obs[-1][0]], ham[obs[-1][0]])
