# PostKit

**Foto pronte per i social, in 30 secondi.** Gratis, senza app, e le foto non lasciano mai il tuo dispositivo.

👉 **https://robyrighi.github.io/postkit/**

| Strumento | Cosa fa |
|---|---|
| 🎞️ **Carosello senza cuciture** | Divide una foto panoramica in 2–10 slide (4:5 o 1:1) che su Instagram scorrono come un'unica immagine |
| ✍️ **Testo da professionisti** | 7 stili tipografici curati, formati storia/post/quadrato, e l'effetto *testo dietro la persona* con IA nel browser |
| 🏃 **Card della tua uscita** | Foto + distanza, tempo, passo/velocità, dislivello e FC in 4 impaginazioni (corsa, trail, sci di fondo, bici, escursione) |

Ogni strumento ha 8 filtri (B/N, vivido, caldo, freddo, matte, pellicola…), zoom e posizionamento.

## Privacy e sicurezza

- **Le foto restano sul dispositivo**: tutta l'elaborazione avviene nel browser (Canvas + MediaPipe). Nessun upload, nessun salvataggio lato server.
- **Nome ed email solo per scaricare**: si può provare tutto liberamente. I dati vengono chiesti una volta sola, al primo download, con consenso esplicito.
- **Identificativo anonimo**: un UUID casuale in localStorage/cookie. Nessun fingerprinting, nessun tracker di terze parti.
- **Backend in sola scrittura**: Supabase (Zurigo). Il sito non può leggere nessuna tabella: scrive solo tramite 4 funzioni RPC che validano i dati e limitano lo spam. Le statistiche sono visibili solo al proprietario dalla dashboard Supabase.
- **Content Security Policy** restrittiva sulla build: script solo dal sito, connessioni solo verso Supabase e il modello MediaPipe.
- Font self-hosted (nessuna richiesta a Google Fonts).

## Salvataggio

| Dispositivo | Comportamento |
|---|---|
| iPhone / Android | Menu di condivisione nativo → "Salva immagine/i" nella galleria (anche più immagini insieme, niente zip) |
| Computer | Download diretto; più immagini → ZIP oppure singole |

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:5173/postkit/
npm run build    # output in dist/
```

Stack: Vite + React + TypeScript · Supabase · MediaPipe Tasks Vision (Apache-2.0) · JSZip · Fontsource.

Il deploy su GitHub Pages è automatico a ogni push su `main` (`.github/workflows/deploy.yml`).

## Statistiche (per il proprietario)

Nella dashboard Supabase → **Table Editor** o **SQL Editor**:

| Vista | Contenuto |
|---|---|
| `stats_overview` | Visitatori, registrati, attivi a 7 giorni, immagini create, voto medio |
| `stats_daily` | Eventi per giorno, strumento e tipo |
| `stats_users` | Utenti registrati (nome, email, visite, immagini) |
| `stats_feedback` | Valutazioni con commento |
| `stats_platform` | iPhone / Android / Windows / Mac |
| `stats_ratings` | Media voti per strumento |

Lo schema del database è in `supabase/schema.sql`.

## Licenza

MIT
