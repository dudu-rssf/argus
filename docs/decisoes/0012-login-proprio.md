# 0012 — Login próprio (jose + bcryptjs) no lugar do Auth.js

**Status:** aceita · 2026-10-04 · altera o "como" da decisão 0004, não o "quê"

## Contexto
A decisão 0004 previa Auth.js para o login de usuário único. Com uma senha só, sem provedores externos nem banco de usuários, o Auth.js traz muito código e configuração que não seriam usados.

## Decisão
Login próprio, aprovado pelo Eduardo em 2026-10-04:
- senha conferida contra hash bcrypt em `ARGUS_SENHA_HASH` (`bcryptjs`);
- sessão em cookie `httpOnly`, `secure`, `SameSite=Lax`, assinado com `AUTH_SECRET` (JWT HS256, `jose`), válida por 30 dias;
- middleware em todas as rotas, exceto `/login` e os arquivos estáticos;
- **falha fechada:** se `ARGUS_SENHA_HASH` ou `AUTH_SECRET` faltarem (ou o segredo tiver menos de 32 caracteres), tudo é bloqueado;
- limite de tentativas no login.

## Consequências
- Cerca de 80 linhas de código próprio, com testes automáticos (incluindo a falha fechada).
- Continua valendo o resto da 0004: site inteiro atrás de senha, usuário único.
