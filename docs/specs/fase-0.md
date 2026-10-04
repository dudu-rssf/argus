# Fase 0 — Aprendizado, fundação e validador

**Duração estimada:** 3–4 semanas · **Status:** em andamento · fundação, configuração e validador prontos

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
- [ ] Neon: projeto `argus`, região São Paulo, string de conexão com pooling
- [ ] Vercel: conta ligada ao GitHub
- [ ] FRED: chave de API
- [ ] FMP: chave de API (plano grátis)
- [ ] Segredos cadastrados nos GitHub Secrets do repositório

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
- [ ] Mapear as 14 pendências do MVP
- [ ] Cadastrar `FRED_API_KEY` nos GitHub Secrets e validar as séries dos EUA

## Critério de pronto

1. Nenhuma série com fase `MVP` no catálogo está como `Confirmar` ou `A mapear`.
2. Relatório `docs/catalogo/validacao.md` lista título oficial, última observação e resultado de cada série do MVP.
3. Eduardo consegue clonar o repositório no próprio computador e explicar o que cada pasta contém.

## Fora do escopo

Banco de dados criado com tabelas, adapters de produção e qualquer tela. Isso é Fase 1 e 2.
