# Catálogo de dados

| Arquivo | Conteúdo |
| --- | --- |
| `Argus_Catalogo_de_Dados.xlsx` | Versão para leitura e edição, com filtros e resumo |
| `brasil.csv`, `eua.csv` | Uma linha por série: aba, bloco, fonte, código, frequência, unidade, tipo, fase, status |
| `central.csv` | Blocos da aba Central e do agregador de notícias |
| `fontes.csv` | Registro de fontes: acesso, autenticação, limites, risco |

Os **CSVs são a fonte da verdade**. Depois de editar um CSV, regenere o resto (a partir de `pipeline/`):

```
uv run python -m argus_pipeline.catalog                       # config/series/*.yaml
uv run --with openpyxl python -m argus_pipeline.catalog_xlsx  # planilha
```

Validação contra as fontes: workflow **Validar catálogo** no GitHub Actions → `validacao.md`.

**Status das séries:** `Verificado` (conferido contra a fonte), `Confirmar` (código conhecido, não conferido), `A mapear` (código não localizado), `Sem API`, `Pago`, `Derivado`, `Curado`. Só `Verificado`, `Derivado` e `Curado` entram em produção (decisão 0006).
