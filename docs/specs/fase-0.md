# Fase 0 — Aprendizado, fundação e validador

**Duração estimada:** 3–4 semanas · **Status:** critérios 1 e 2 cumpridos (2026-10-04); falta o critério 3 (trilha de aprendizado)

## Objetivo

Sair desta fase com: ambiente pronto, contas criadas, catálogo convertido em configuração e **todos os códigos de série do MVP verificados contra a fonte oficial**.

## Entregas

### 0.1 Fundação do repositório — feito
- [x] `CLAUDE.md`, `README.md`, `.gitignore`, `.env.example`
- [x] `docs/plano.md`, `docs/decisoes/`, `docs/licoes-primeira-tentativa.md`
- [x] Catálogo em `docs/catalogo/` (xlsx + CSV)

### 0.2 Trilha de aprendizado (em paralelo, no ritmo do Eduardo)
- [ ] Git e GitHub: repositório, commit, branch, pull request, como voltar atrás
- [ ] Terminal: navegar em pastas, rodar comando, ler erro
- [ ] WSL2 + Ubuntu no Windows; git, `gh`, Node (`fnm`), `uv`
- [ ] Ler um diff e um teste
- [ ] Clonar o repositório no WSL (`~/argus`, nunca em `C:\`)

### 0.3 Contas e chaves
- [x] Neon: projeto `argus`, região São Paulo, string de conexão com pooling (segredo `DATABASE`; conexão testada pelo workflow "Testar conexões")
- [x] Vercel: conta ligada ao GitHub
- [x] FRED: chave de API
- [x] FMP: chave de API (plano grátis)
- [x] Segredos cadastrados nos GitHub Secrets do repositório (`DATABASE`, `FRED_API_KEY`, `FMP_API_KEY`)

### 0.4 Catálogo como configuração
- [x] Definir o schema de série (`pipeline/argus_pipeline/catalog.py`)
- [x] Gerar `config/series/<país>/*.yaml`, um arquivo por subaba, a partir dos CSVs
- [x] Testes de schema; o CI falha se a configuração gerada estiver desatualizada

### 0.5 Validador de códigos
- [x] Validador `argus_pipeline.validate.run` (workflow "Validar catálogo") que, para cada série:
    - busca o título oficial na fonte (SGS: metadados; SIDRA: descrição da tabela/variável; Focus: indicador existente; FRED: `series` endpoint);
    - busca a última observação e sua data;
    - compara título oficial × nome do catálogo e grava relatório em `docs/catalogo/validacao.md`.
- [x] Primeira revisão: 63 séries `Verificado` (ver `docs/catalogo/revisao-2026-10-04.md`)
- [x] Ferramenta de busca (workflow "Buscar séries"); 7 pendências mapeadas e verificadas (70 no total)
- [x] Pendências do MVP resolvidas por sondagem: núcleos EX3/P55 (+ EX-FE), comunicados do Copom, RTN, ComexStat, commodities (FRED) e Ibovespa (B3)
- [x] Cadastrar `FRED_API_KEY` nos GitHub Secrets e validar as séries dos EUA (50 verificadas)

## Critério de pronto

1. Nenhuma série com fase `MVP` no catálogo está como `Confirmar` ou `A mapear`.
2. Relatório `docs/catalogo/validacao.md` lista título oficial, última observação e resultado de cada série do MVP.
3. Eduardo consegue clonar o repositório no próprio computador e explicar o que cada pasta contém.

## Fora do escopo

Banco de dados criado com tabelas, adapters de produção e qualquer tela. Isso é Fase 1 e 2.
