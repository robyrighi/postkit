import { APP_NAME, CONTACT_EMAIL, REPO_URL } from '../lib/config'

export function Privacy() {
  return (
    <article className="module prose">
      <h1>Privacy e sicurezza</h1>
      <p className="lead">In breve: le tue foto non lasciano mai il tuo dispositivo. Raccogliamo solo il minimo indispensabile.</p>

      <h2>Le tue foto</h2>
      <ul>
        <li>
          Tutte le elaborazioni (ritaglio, filtri, testo, riconoscimento della persona) avvengono <strong>nel tuo browser</strong>.
        </li>
        <li>
          Le foto <strong>non vengono mai caricate</strong> su un server, né salvate su questo sito o altrove. Chiudendo la
          pagina spariscono.
        </li>
        <li>
          Per l’effetto “testo dietro la persona” il browser scarica un modello di intelligenza artificiale (MediaPipe, di
          Google). Il modello lavora sul tuo dispositivo: la foto non viene inviata a Google né a noi.
        </li>
      </ul>

      <h2>Cosa raccogliamo</h2>
      <ul>
        <li>
          <strong>Nome ed email</strong>: solo quando scarichi la prima immagine. Servono a sapere chi usa {APP_NAME} ed
          eventualmente ad avvisarti di novità importanti. Non li vendiamo né li cediamo a nessuno.
        </li>
        <li>
          <strong>Statistiche d’uso anonime</strong>: quale strumento apri, quante immagini esporti, tipo di dispositivo
          (iPhone, Android, computer) e lingua del browser. Nessun contenuto delle foto, nessun testo che scrivi.
        </li>
        <li>
          <strong>Valutazioni</strong>: la faccina e il commento, se decidi di lasciarli.
        </li>
      </ul>

      <h2>Cosa resta sul tuo dispositivo</h2>
      <p>
        Il browser memorizza un codice casuale anonimo (per riconoscere il dispositivo alle visite successive) e il nome/email
        inseriti, così non te li chiediamo di nuovo. Nessun cookie pubblicitario, nessun tracciamento di terze parti, nessun
        “fingerprinting”. Puoi cancellare tutto quando vuoi dalle impostazioni del browser (dati dei siti).
      </p>

      <h2>Dove sono i dati</h2>
      <p>
        I dati sono conservati presso Supabase in un data center a <strong>Zurigo (Svizzera)</strong>. Il database non è
        leggibile pubblicamente: il sito può solo <em>aggiungere</em> dati tramite funzioni controllate, mai leggere quelli
        di altri utenti.
      </p>

      <h2>I tuoi diritti</h2>
      <p>
        In base alla legge svizzera sulla protezione dei dati (nLPD) e, se applicabile, al GDPR, puoi chiedere in ogni
        momento di vedere, correggere o cancellare i tuoi dati.{' '}
        {CONTACT_EMAIL ? (
          <>
            Scrivi a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </>
        ) : (
          <>
            Apri una richiesta su <a href={`${REPO_URL}/issues`}>GitHub</a>.
          </>
        )}
      </p>

      <h2>Codice aperto</h2>
      <p>
        {APP_NAME} è open source: puoi verificare tu stesso cosa fa il codice su <a href={REPO_URL}>GitHub</a>.
      </p>
      <p className="muted small">Ultimo aggiornamento: novembre 2026</p>
    </article>
  )
}
