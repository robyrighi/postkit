import { useI18n, type Lang } from '../i18n'
import { CONTACT_EMAIL, OWNER } from '../lib/config'

interface Section {
  h: string
  p?: string
  li?: string[]
}
interface Doc {
  title: string
  lead: string
  sections: Section[]
  contact: string
  updated: string
}

const DOCS: Record<Lang, Doc> = {
  it: {
    title: 'Privacy e sicurezza',
    lead: 'In breve: le tue foto non lasciano mai il tuo dispositivo. Raccogliamo solo il minimo indispensabile.',
    sections: [
      { h: 'Titolare del trattamento', p: `${OWNER} · ${CONTACT_EMAIL}` },
      {
        h: 'Le tue foto',
        li: [
          'Tutte le elaborazioni (ritaglio, filtri, testo, riconoscimento della persona, lettura dei file GPX/FIT) avvengono nel tuo browser.',
          'Le foto non vengono mai caricate su un server, né salvate su questo sito o altrove. Chiudendo la pagina spariscono.',
          'Per l’effetto “testo dietro la persona” il browser scarica un modello di intelligenza artificiale (MediaPipe, di Google) che lavora sul tuo dispositivo: la foto non viene inviata a Google né a noi.',
        ],
      },
      {
        h: 'Cosa raccogliamo',
        li: [
          'Nome ed email: solo dal secondo download in poi (la prima immagine è libera). Servono a sapere chi usa PizKit. Non li vendiamo né li cediamo a nessuno.',
          'Email di novità: solo se spunti la casella facoltativa (al massimo qualche email all’anno). Puoi revocare il consenso in ogni momento scrivendo all’indirizzo qui sotto.',
          'Statistiche d’uso: quale strumento apri, quali opzioni scegli, quante immagini crei e salvi, tipo di dispositivo, lingua e da dove sei arrivato (solo il nome del canale, es. “instagram” o “google”). Mai il contenuto delle foto o il testo che scrivi.',
          'Valutazioni: la faccina e il commento, se decidi di lasciarli.',
        ],
      },
      {
        h: 'Cosa resta sul tuo dispositivo',
        p: 'Il browser memorizza un codice casuale anonimo (per riconoscere il dispositivo alle visite successive), la lingua scelta e il nome/email inseriti, così non te li chiediamo di nuovo. Nessun cookie pubblicitario, nessun tracciamento di terze parti, nessun “fingerprinting”. Puoi cancellare tutto quando vuoi dalle impostazioni del browser.',
      },
      {
        h: 'Dove sono i dati',
        p: 'I dati sono conservati presso Supabase in un data center a Zurigo (Svizzera). Il database non è leggibile pubblicamente: il sito può solo aggiungere dati tramite funzioni controllate, mai leggere quelli di altri utenti.',
      },
      {
        h: 'I tuoi diritti',
        p: 'In base alla legge svizzera sulla protezione dei dati (nLPD) e, se applicabile, al GDPR, puoi chiedere in ogni momento di vedere, correggere o cancellare i tuoi dati.',
      },
    ],
    contact: 'Contatto:',
    updated: 'Ultimo aggiornamento: novembre 2026',
  },
  en: {
    title: 'Privacy and security',
    lead: 'In short: your photos never leave your device. We collect only the bare minimum.',
    sections: [
      { h: 'Data controller', p: `${OWNER} · ${CONTACT_EMAIL}` },
      {
        h: 'Your photos',
        li: [
          'All processing (cropping, filters, text, person detection, reading GPX/FIT files) happens in your browser.',
          'Photos are never uploaded to a server or stored on this site or anywhere else. They disappear when you close the page.',
          'For the “text behind the person” effect, your browser downloads an AI model (MediaPipe, by Google) that runs on your device: the photo is not sent to Google or to us.',
        ],
      },
      {
        h: 'What we collect',
        li: [
          'Name and email: only from your second download on (the first image is free). They help us know who uses PizKit. We never sell or share them.',
          'Update emails: only if you tick the optional box (a few emails a year at most). You can withdraw your consent at any time by writing to the address below.',
          'Usage statistics: which tool you open, which options you choose, how many images you create and save, device type, language and where you came from (only the channel name, e.g. “instagram” or “google”). Never the content of your photos or the text you write.',
          'Ratings: the face and comment, if you choose to leave them.',
        ],
      },
      {
        h: 'What stays on your device',
        p: 'Your browser stores a random anonymous code (to recognise the device on later visits), your chosen language and the name/email you entered, so we don’t ask again. No advertising cookies, no third-party tracking, no fingerprinting. You can delete everything at any time in your browser settings.',
      },
      {
        h: 'Where the data is stored',
        p: 'Data is stored with Supabase in a data centre in Zurich (Switzerland). The database cannot be read publicly: the site can only add data through controlled functions, never read other users’ data.',
      },
      {
        h: 'Your rights',
        p: 'Under the Swiss Federal Act on Data Protection (FADP) and, where applicable, the GDPR, you can ask at any time to access, correct or delete your data.',
      },
    ],
    contact: 'Contact:',
    updated: 'Last updated: November 2026',
  },
  de: {
    title: 'Datenschutz und Sicherheit',
    lead: 'Kurz gesagt: Deine Fotos verlassen nie dein Gerät. Wir erfassen nur das Nötigste.',
    sections: [
      { h: 'Verantwortlicher', p: `${OWNER} · ${CONTACT_EMAIL}` },
      {
        h: 'Deine Fotos',
        li: [
          'Die gesamte Bearbeitung (Zuschnitt, Filter, Text, Personenerkennung, Lesen von GPX/FIT-Dateien) findet in deinem Browser statt.',
          'Fotos werden nie auf einen Server hochgeladen und weder auf dieser Website noch anderswo gespeichert. Beim Schliessen der Seite sind sie weg.',
          'Für den Effekt «Text hinter der Person» lädt dein Browser ein KI-Modell (MediaPipe von Google), das auf deinem Gerät läuft: Das Foto wird weder an Google noch an uns gesendet.',
        ],
      },
      {
        h: 'Was wir erfassen',
        li: [
          'Name und E-Mail: erst ab dem zweiten Download (das erste Bild ist frei). So wissen wir, wer PizKit nutzt. Wir verkaufen oder teilen sie nie.',
          'E-Mails zu Neuigkeiten: nur wenn du das optionale Kästchen ankreuzt (höchstens ein paar E-Mails pro Jahr). Du kannst die Einwilligung jederzeit widerrufen, indem du an die Adresse unten schreibst.',
          'Nutzungsstatistiken: welches Werkzeug du öffnest, welche Optionen du wählst, wie viele Bilder du erstellst und speicherst, Gerätetyp, Sprache und woher du kommst (nur der Name des Kanals, z. B. „instagram“ oder „google“). Nie der Inhalt deiner Fotos oder der Text, den du schreibst.',
          'Bewertungen: das Gesicht und der Kommentar, falls du sie hinterlässt.',
        ],
      },
      {
        h: 'Was auf deinem Gerät bleibt',
        p: 'Dein Browser speichert einen zufälligen anonymen Code (um das Gerät bei späteren Besuchen wiederzuerkennen), die gewählte Sprache und den eingegebenen Namen/die E-Mail, damit wir nicht erneut fragen. Keine Werbe-Cookies, kein Tracking durch Dritte, kein Fingerprinting. Du kannst alles jederzeit in den Browser-Einstellungen löschen.',
      },
      {
        h: 'Wo die Daten liegen',
        p: 'Die Daten werden bei Supabase in einem Rechenzentrum in Zürich (Schweiz) gespeichert. Die Datenbank ist nicht öffentlich lesbar: Die Website kann nur über kontrollierte Funktionen Daten hinzufügen, nie die Daten anderer Nutzer lesen.',
      },
      {
        h: 'Deine Rechte',
        p: 'Gemäss dem Schweizer Datenschutzgesetz (DSG) und gegebenenfalls der DSGVO kannst du jederzeit Auskunft, Berichtigung oder Löschung deiner Daten verlangen.',
      },
    ],
    contact: 'Kontakt:',
    updated: 'Letzte Aktualisierung: November 2026',
  },
  fr: {
    title: 'Confidentialité et sécurité',
    lead: 'En bref : tes photos ne quittent jamais ton appareil. Nous collectons le strict minimum.',
    sections: [
      { h: 'Responsable du traitement', p: `${OWNER} · ${CONTACT_EMAIL}` },
      {
        h: 'Tes photos',
        li: [
          'Tous les traitements (recadrage, filtres, texte, détection de la personne, lecture des fichiers GPX/FIT) se font dans ton navigateur.',
          'Les photos ne sont jamais envoyées sur un serveur, ni enregistrées sur ce site ou ailleurs. Elles disparaissent quand tu fermes la page.',
          'Pour l’effet « texte derrière la personne », ton navigateur télécharge un modèle d’intelligence artificielle (MediaPipe, de Google) qui fonctionne sur ton appareil : la photo n’est envoyée ni à Google ni à nous.',
        ],
      },
      {
        h: 'Ce que nous collectons',
        li: [
          'Nom et e-mail : seulement à partir du deuxième téléchargement (la première image est libre). Ils nous permettent de savoir qui utilise PizKit. Nous ne les vendons ni ne les cédons jamais.',
          'E-mails de nouveautés : seulement si tu coches la case facultative (quelques e-mails par an au maximum). Tu peux retirer ton consentement à tout moment en écrivant à l’adresse ci-dessous.',
          'Statistiques d’utilisation : quel outil tu ouvres, quelles options tu choisis, combien d’images tu crées et enregistres, type d’appareil, langue et d’où tu viens (seulement le nom du canal, p. ex. « instagram » ou « google »). Jamais le contenu de tes photos ni le texte que tu écris.',
          'Évaluations : le visage et le commentaire, si tu choisis de les laisser.',
        ],
      },
      {
        h: 'Ce qui reste sur ton appareil',
        p: 'Ton navigateur mémorise un code anonyme aléatoire (pour reconnaître l’appareil lors des visites suivantes), la langue choisie et le nom/e-mail saisis, pour ne pas te les redemander. Aucun cookie publicitaire, aucun pistage tiers, aucun « fingerprinting ». Tu peux tout effacer à tout moment dans les réglages de ton navigateur.',
      },
      {
        h: 'Où sont les données',
        p: 'Les données sont conservées chez Supabase dans un centre de données à Zurich (Suisse). La base de données n’est pas lisible publiquement : le site peut seulement ajouter des données via des fonctions contrôlées, jamais lire celles des autres utilisateurs.',
      },
      {
        h: 'Tes droits',
        p: 'Selon la loi suisse sur la protection des données (nLPD) et, le cas échéant, le RGPD, tu peux demander à tout moment d’accéder à tes données, de les corriger ou de les supprimer.',
      },
    ],
    contact: 'Contact :',
    updated: 'Dernière mise à jour : novembre 2026',
  },
}

export function Privacy() {
  const { lang } = useI18n()
  const d = DOCS[lang]
  return (
    <article className="module prose">
      <h1>{d.title}</h1>
      <p className="lead">{d.lead}</p>
      {d.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p && <p>{s.p}</p>}
          {s.li && (
            <ul>
              {s.li.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <p>
        {d.contact} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <p className="muted small">{d.updated}</p>
    </article>
  )
}
