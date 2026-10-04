// Respostas falsas do Google Fonts para builds sem internet (testes locais).
// Na Vercel não é usado: lá as fontes vêm do Google normalmente.
const vazio = "/* fonte indisponível no ambiente de teste */";
module.exports = {
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap": vazio,
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap": vazio,
};
