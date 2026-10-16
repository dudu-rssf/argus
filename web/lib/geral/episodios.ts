/**
 * Contexto histórico da economia brasileira por período (curadoria Argus), usado para
 * situar os períodos parecidos. Só fatos amplamente documentados (decisões do Copom,
 * choques conhecidos); sem juízo sobre acerto de política. Ordem cronológica; sem lacunas
 * entre 2002 e hoje, para todo mês ter um contexto.
 */
export type Episodio = { de: string; ate: string; titulo: string; texto: string };

export const EPISODIOS: Episodio[] = [
  { de: "2002-01", ate: "2003-06", titulo: "Choque de confiança de 2002",
    texto: "Incerteza eleitoral levou o dólar perto de R$ 4 e o IPCA de 12 meses a passar de 17% em 2003; o Copom subiu a Selic até 26,5%." },
  { de: "2003-07", ate: "2004-08", titulo: "Desinflação e cortes de 2003-04",
    texto: "Com o câmbio de volta e a inflação caindo, a Selic recuou de 26,5% para 16%." },
  { de: "2004-09", ate: "2005-08", titulo: "Aperto de 2004-05",
    texto: "Economia aquecida e expectativas acima da meta; a Selic subiu até 19,75%." },
  { de: "2005-09", ate: "2008-08", titulo: "Real forte e boom de commodities",
    texto: "Crescimento com real valorizado e inflação em geral abaixo da meta; cortes graduais até 11,25% em 2007 e novo aperto a partir de abr/2008." },
  { de: "2008-09", ate: "2009-12", titulo: "Crise financeira global",
    texto: "Quebra do Lehman Brothers, recessão curta e cortes rápidos da Selic em 2009, até 8,75%." },
  { de: "2010-01", ate: "2011-07", titulo: "Recuperação e aperto de 2010-11",
    texto: "PIB cresceu 7,5% em 2010; inflação acima da meta e Selic subindo até 12,5%." },
  { de: "2011-08", ate: "2013-03", titulo: "Cortes até 7,25%",
    texto: "Cortes a partir de ago/2011 com a crise europeia; Selic na mínima de 7,25% e redução de tarifas de energia em 2013." },
  { de: "2013-04", ate: "2014-12", titulo: "Aperto de 2013-14 e preços represados",
    texto: "Inflação perto do teto da meta com preços administrados contidos; Selic subiu de 7,25% para 11,75%." },
  { de: "2015-01", ate: "2016-09", titulo: "Recessão de 2015-16 e realinhamento de preços",
    texto: "Energia e combustíveis reajustados de uma vez, IPCA acima de 10% em 2015, forte recessão e Selic em 14,25%." },
  { de: "2016-10", ate: "2018-02", titulo: "Desinflação de 2017",
    texto: "Safra recorde e economia fraca levaram o IPCA abaixo do piso da meta; a Selic caiu de 14,25% para 6,75%." },
  { de: "2018-03", ate: "2019-07", titulo: "Greve dos caminhoneiros e Selic parada",
    texto: "Choque de oferta em mai/2018, eleição e recuperação lenta; Selic estável em 6,5%." },
  { de: "2019-08", ate: "2020-12", titulo: "Cortes até 2% e pandemia",
    texto: "Inflação baixa, reforma da Previdência e depois a pandemia; Selic na mínima histórica de 2%." },
  { de: "2021-01", ate: "2022-08", titulo: "Choque de commodities e aperto de 2021-22",
    texto: "Reabertura, alta global de commodities e câmbio fraco; IPCA acima de 12% e Selic de 2% para 13,75%. Corte de impostos sobre combustíveis em jun/2022." },
  { de: "2022-09", ate: "2023-07", titulo: "Selic parada em 13,75%",
    texto: "Juro alto mantido por quase um ano enquanto a inflação recuava." },
  { de: "2023-08", ate: "2024-08", titulo: "Ciclo de cortes de 2023-24",
    texto: "Selic de 13,75% para 10,5% com a desinflação." },
  { de: "2024-09", ate: "2025-12", titulo: "Novo aperto de 2024-25",
    texto: "Dólar alto e expectativas acima da meta; Selic subiu até 15% e ficou parada no patamar. Meta contínua de 3% desde jan/2025." },
  { de: "2026-01", ate: "2099-12", titulo: "Período atual",
    texto: "Período recente; veja a aba Política Monetária para as decisões." },
];

export function episodioDe(mes: string): Episodio | null {
  return EPISODIOS.find((e) => mes >= e.de && mes <= e.ate) ?? null;
}
