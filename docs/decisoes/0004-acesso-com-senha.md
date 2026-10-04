# 0004 — Site online com senha, usuário único

**Status:** aceita · 2026-10-04

## Decisão
Site público na internet, inteiro atrás de login (Auth.js, sessão assinada). Middleware falha fechado: sem configuração de senha, bloqueia. Domínio já comprado será reaproveitado.

## Motivo
A primeira tentativa falhava aberta e guardava a senha no cookie.
