/** Marca do Argus: o olho de Argos, o gigante de cem olhos que nunca dormia. */
export function Marca({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M3 16c3.8-6 8.1-9 13-9s9.2 3 13 9c-3.8 6-8.1 9-13 9s-9.2-3-13-9z"
          fill="none" stroke="var(--cor-ouro)" strokeWidth="2" />
        <circle cx="16" cy="16" r="4.5" fill="var(--cor-ouro)" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[0.18em] text-texto">ARGUS</span>
    </span>
  );
}
