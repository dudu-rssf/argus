# Catálogo de dados

| Arquivo | Conteúdo |
| --- | --- |
| `Argus_Catalogo_de_Dados.xlsx` | Versão para leitura e edição, com filtros e resumo |
| `brasil.csv`, `eua.csv` | Uma linha por série: aba, bloco, fonte, código, frequência, unidade, tipo, fase, status |
| `central.csv` | Blocos da aba Central e do agregador de notícias |
| `fontes.csv` | Registro de fontes: acesso, autenticação, limites, risco |

Os CSVs são a fonte que o pipeline lê. Ao editar o xlsx, regenere os CSVs.

**Status das séries:** `Verificado` (conferido contra a fonte), `Confirmar` (código conhecido, não conferido), `A mapear` (código não localizado), `Sem API`, `Pago`, `Derivado`, `Curado`. Só `Verificado`, `Derivado` e `Curado` entram em produção (decisão 0006).
