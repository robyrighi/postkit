import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import type { Lang } from '../i18n/strings'
import { track } from '../lib/api'

// Novità mostrate una volta a chi aveva già usato l'app (solo funzioni per l'utente, niente dettagli tecnici).
// Per una nuova versione: aggiungere una voce IN CIMA con un id nuovo.
interface Release {
  id: string
  items: Record<Lang, string[]>
}
export const RELEASES: Release[] = [
  {
    id: '2026-11-26',
    items: {
      it: [
        '🎨 Nuovo look: più sportivo, più leggibile',
        '⚡ Carichi la foto direttamente dalla home, e con uno screenshot di Strava o Garmin i numeri si compilano da soli',
      ],
      en: [
        '🎨 New look: sportier and easier to read',
        '⚡ Load your photo straight from the home page, and a Strava or Garmin screenshot fills in your stats',
      ],
      de: [
        '🎨 Neuer Look: sportlicher und besser lesbar',
        '⚡ Lade dein Foto direkt von der Startseite, und ein Strava- oder Garmin-Screenshot füllt die Daten aus',
      ],
      fr: [
        '🎨 Nouveau look : plus sportif, plus lisible',
        '⚡ Charge ta photo directement depuis l’accueil, et une capture Strava ou Garmin remplit tes données',
      ],
    },
  },
  {
    id: '2026-11-25b',
    items: {
      it: [
        '🗺️ Tracciato da screenshot: carica lo screenshot della mappa di Garmin o Strava, tocca la linea e il percorso finisce sulla tua foto',
        '🎁 Download liberi e illimitati: niente più richiesta di nome ed email. Se vuoi le novità, trovi «Novità via email» in fondo alla pagina',
      ],
      en: [
        '🗺️ Route from screenshot: load a screenshot of your Garmin or Strava map, tap the line and the route lands on your photo',
        '🎁 Free, unlimited downloads: no more name and email request. Want updates? Find “Updates by email” at the bottom of the page',
      ],
      de: [
        '🗺️ Strecke aus Screenshot: Lade einen Screenshot der Garmin- oder Strava-Karte, tippe auf die Linie und die Strecke landet auf deinem Foto',
        '🎁 Freie, unbegrenzte Downloads: keine Abfrage von Name und E-Mail mehr. Lust auf Neuigkeiten? «Neuigkeiten per E-Mail» unten auf der Seite',
      ],
      fr: [
        '🗺️ Parcours depuis une capture : charge une capture de ta carte Garmin ou Strava, touche la ligne et le parcours arrive sur ta photo',
        '🎁 Téléchargements libres et illimités : plus de demande de nom et d’e-mail. Envie des nouveautés ? « Nouveautés par e-mail » en bas de la page',
      ],
    },
  },
  {
    id: '2026-11-24b',
    items: {
      it: [
        '📷 Leggi da screenshot: carica gli screenshot di Garmin o Strava e la card sport si compila da sola (tempo, frequenza, calorie, zone)',
      ],
      en: [
        '📷 Read from screenshot: load your Garmin or Strava screenshots and the sport card fills itself in (time, heart rate, calories, zones)',
      ],
      de: [
        '📷 Aus Screenshot lesen: Lade Screenshots von Garmin oder Strava und die Sport-Card füllt sich selbst aus (Zeit, Herzfrequenz, Kalorien, Zonen)',
      ],
      fr: [
        '📷 Lire une capture d’écran : charge tes captures Garmin ou Strava et la carte sport se remplit toute seule (temps, fréquence, calories, zones)',
      ],
    },
  },
  {
    id: '2026-11-24',
    items: {
      it: [
        '🎬 Video! Card sport e testo anche sui tuoi video (fino a 60 secondi)',
        '🪄 Gomma magica: cancella persone o oggetti dallo sfondo con un dito',
        '📸 Sfondo sfocato o colorato dietro la persona, come la modalità ritratto',
        '✨ Migliora automatico: luce e colori sistemati in un tocco',
        '❤️ Zone cardiache e Training Effect sulla card sport (anche dal file FIT di Garmin)',
        '👆 Pulsante "Crea" sempre a portata di pollice e "Guarda un esempio" in home',
      ],
      en: [
        '🎬 Videos! Sport cards and text on your videos too (up to 60 seconds)',
        '🪄 Magic eraser: remove people or objects from the background with one finger',
        '📸 Blurred or coloured background behind the person, like portrait mode',
        '✨ Auto enhance: light and colours fixed in one tap',
        '❤️ Heart rate zones and Training Effect on the sport card (also from Garmin FIT files)',
        '👆 "Create" button always within thumb reach and "See an example" on the home page',
      ],
      de: [
        '🎬 Videos! Sport-Card und Text jetzt auch auf deinen Videos (bis 60 Sekunden)',
        '🪄 Zauber-Radierer: Personen oder Gegenstände im Hintergrund mit einem Finger entfernen',
        '📸 Unscharfer oder farbiger Hintergrund hinter der Person, wie im Porträtmodus',
        '✨ Automatisch verbessern: Licht und Farben mit einem Tipp',
        '❤️ Herzfrequenzzonen und Training Effect auf der Sport-Card (auch aus Garmin-FIT-Dateien)',
        '👆 «Erstellen» immer in Daumennähe und «Beispiel ansehen» auf der Startseite',
      ],
      fr: [
        '🎬 Vidéos ! Carte sport et texte aussi sur tes vidéos (jusqu’à 60 secondes)',
        '🪄 Gomme magique : efface des personnes ou objets de l’arrière-plan d’un doigt',
        '📸 Arrière-plan flou ou coloré derrière la personne, comme le mode portrait',
        '✨ Amélioration auto : lumière et couleurs corrigées en un geste',
        '❤️ Zones cardiaques et Training Effect sur la carte sport (aussi depuis les fichiers FIT Garmin)',
        '👆 Bouton « Créer » toujours sous le pouce et « Voir un exemple » sur l’accueil',
      ],
    },
  },
]

const KEY = 'pk_seen_news'
// Letto all'avvio, prima che l'app crei l'identificativo del visitatore: serve a distinguere chi torna da chi arriva ora
let returning = false
try {
  returning = !!localStorage.getItem('pk_vid') || !!localStorage.getItem('pk_profile')
} catch {
  /* storage non disponibile */
}

export function NewsModal({ forceOpen, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const { t, lang } = useI18n()
  const latest = RELEASES[0]
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<string[]>([])
  const listFor = (seen: string | null) => {
    const idx = RELEASES.findIndex((r) => r.id === seen)
    // tutte le novità non ancora viste (al massimo le ultime 2 versioni)
    const unseen = RELEASES.slice(0, idx === -1 ? 2 : Math.max(1, idx))
    return unseen.flatMap((r) => r.items[lang] ?? r.items.it)
  }

  useEffect(() => {
    if (forceOpen) {
      setItems(listFor(null))
      setOpen(true)
      return
    }
    try {
      const seen = localStorage.getItem(KEY)
      if (seen === latest.id) return
      localStorage.setItem(KEY, latest.id)
      // chi arriva per la prima volta vede l'app così com'è, senza elenco di novità
      if (returning && seen !== latest.id) {
        setItems(listFor(seen))
        setOpen(true)
        track('app', 'news_shown', { id: latest.id })
      }
    } catch {
      /* storage non disponibile */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen, latest.id])

  if (!open) return null
  const close = () => {
    setOpen(false)
    onClose?.()
  }
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="news-title" onClick={close}>
      <div className="modal news" onClick={(e) => e.stopPropagation()}>
        <h2 id="news-title">🎉 {t('news.title')}</h2>
        <p className="muted small">{t('news.lead')}</p>
        <ul className="news-list">
          {items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
        <div className="row wrap">
          <a
            href="#/sport"
            className="btn primary"
            onClick={() => {
              track('app', 'news_try')
              close()
            }}
          >
            {t('news.try')}
          </a>
          <button className="btn ghost" onClick={close}>
            {t('news.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
