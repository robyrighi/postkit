// Passaggio di file dalla home agli strumenti (in memoria, nessun upload):
// la home apre la galleria (serve il tocco dell'utente) e lo strumento riceve i file all'apertura.
let pending: { photo?: File; shots?: File[] } = {}

export function handOff(p: { photo?: File; shots?: File[] }) {
  pending = p
}

export function takeHandOff(): { photo?: File; shots?: File[] } {
  const p = pending
  pending = {}
  return p
}
