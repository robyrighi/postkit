const TOOLS = [
  {
    href: '#/carosello',
    emoji: '🎞️',
    title: 'Carosello senza cuciture',
    text: 'Una foto panoramica divisa in slide perfette. Chi scorre su Instagram la vede continuare.',
    cta: 'Crea carosello',
    art: 'art-carousel',
  },
  {
    href: '#/testo',
    emoji: '✍️',
    title: 'Testo da professionisti',
    text: 'Stili tipografici curati e l’effetto rivista: il testo dietro la persona, con un tocco.',
    cta: 'Scrivi sulla foto',
    art: 'art-text',
  },
  {
    href: '#/sport',
    emoji: '🏃',
    title: 'Card della tua uscita',
    text: 'Corsa, sci di fondo, bici: la tua foto con i numeri impaginati come si deve.',
    cta: 'Crea card sport',
    art: 'art-sport',
  },
]

export function Home() {
  return (
    <div className="home">
      <section className="hero">
        <p className="eyebrow">Gratis · Nessuna app da installare</p>
        <h1>
          Foto pronte per i social,
          <br />
          <span className="grad">in 30 secondi.</span>
        </h1>
        <p className="lead">Scegli cosa vuoi creare, carica una foto, salva. Funziona sul telefono e sul computer.</p>
      </section>

      <section className="tools">
        {TOOLS.map((t) => (
          <a key={t.href} href={t.href} className="tool">
            <div className={'tool-art ' + t.art} aria-hidden="true">
              <span>{t.emoji}</span>
            </div>
            <div className="tool-body">
              <h2>{t.title}</h2>
              <p>{t.text}</p>
              <span className="btn primary">{t.cta} →</span>
            </div>
          </a>
        ))}
      </section>

      <section className="trust">
        <div>
          <span className="trust-icon">🔒</span>
          <h3>Le tue foto restano tue</h3>
          <p>Tutto viene elaborato sul tuo dispositivo. Le foto non vengono mai caricate né salvate da nessuna parte.</p>
        </div>
        <div>
          <span className="trust-icon">✉️</span>
          <h3>Nome ed email solo per scaricare</h3>
          <p>Puoi provare tutto liberamente. Te li chiediamo una volta sola, quando salvi la prima immagine.</p>
        </div>
        <div>
          <span className="trust-icon">📲</span>
          <h3>Dritto nella galleria</h3>
          <p>Sul telefono le immagini vanno nelle Foto, già nel formato giusto per storie e post.</p>
        </div>
      </section>
    </div>
  )
}
