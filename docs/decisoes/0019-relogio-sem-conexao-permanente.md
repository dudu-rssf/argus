# 0019 — Relógio sem conexão permanente com o banco

Data: 2026-11-26. Altera a decisão 0018 (não a revoga).

## Problema

Em 19/11/2026 o site e a coleta caíram. O Relógio mantinha uma conexão aberta com o Neon e consultava `pedidos_atualizacao` a cada minuto, 24 h por dia. O Neon gratuito só suspende a computação depois de 5 minutos sem uso, então o banco ficou ligado o mês inteiro. A cota do plano gratuito (100 CU-hours por projeto por mês, compute de 0,25 CU) acabou em cerca de 17 dias. Esgotada a cota, o Neon suspende o projeto até o próximo mês; os dados não são apagados.

## Decisão

- A checagem dos horários de coleta usa só a API do GitHub, a cada minuto, sem tocar no banco. Banco fora do ar não impede o disparo da Coleta.
- Os pedidos do botão "Atualizar" são lidos numa conexão curta (abre, lê, fecha), no máximo a cada 15 minutos e só das 7h às 23h de Brasília. O intervalo é bem maior que os 5 minutos de inatividade do Neon, então o banco dorme entre as consultas.
- Erro ao ler os pedidos vira aviso no log; o Relógio continua.
- Estimativa de consumo: ~40–50 CU-hours/mês com o Relógio + ~7 das coletas + o uso do site, abaixo dos 100.

## Custo

Sem `GITHUB_TOKEN` na Vercel, o botão pode levar até ~15 minutos para iniciar a coleta (antes, até 1 minuto). Com o token, o botão dispara a coleta na hora e nem passa pela tabela de pedidos.

## Teste que trava a regra

`pipeline/tests/test_relogio.py`: o intervalo dos pedidos precisa ser de pelo menos 15 minutos e fora de 7h–23h não há consulta.
