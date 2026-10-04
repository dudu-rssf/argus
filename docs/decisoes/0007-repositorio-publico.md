# 0007 — Repositório público, com proteções

**Status:** aceita · 2026-10-04 · substitui a versão anterior ("repositório privado")

## Contexto
A primeira versão desta decisão previa repositório privado. Na prática, o acesso do Claude ao repositório só funcionou depois de torná-lo público e liberar o app do Claude no GitHub. Eduardo decidiu manter público.

## Decisão
`dudu-rssf/argus` é público.

## Riscos e proteções
| Risco | Proteção |
| --- | --- |
| O GitHub desativa workflows agendados de repositórios públicos após 60 dias sem atividade, o que parou a coleta da primeira tentativa | A coleta precisa gerar atividade no repositório (ex.: um workflow que registra o status da última coleta com um commit periódico). Definir na Fase 1 e testar antes do MVP |
| Segredos expostos | Segredos só em GitHub Secrets, Vercel e `.env.local`; `.claude/settings.local.json` no `.gitignore`; varredura de segredos antes de cada commit |
| Dados de terceiros redistribuídos | Nenhum dado baixado é versionado (`data/` no `.gitignore`); o repositório guarda só código, configuração e fixtures pequenas de teste |
| Código incompleto visível | Aceito. O repositório vira portfólio quando o MVP estiver pronto |
