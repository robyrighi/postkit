// Testi per i motori di ricerca e domande frequenti, nelle 4 lingue.
// Usati sia dall'app (sezione FAQ in home) sia dallo script di build che crea /it /de /fr /en.
export type SeoLang = 'it' | 'de' | 'fr' | 'en'
export const SEO_LANGS: SeoLang[] = ['it', 'de', 'fr', 'en']
export const SITE = 'https://pizkit.com'

export interface SeoPage {
  htmlLang: string
  ogLocale: string
  title: string
  description: string
  ogTitle: string
  ogDescription: string
  ogAlt: string
  noscriptH1: string
  noscriptP: string
  faqTitle: string
}

export const SEO: Record<SeoLang, SeoPage> = {
  it: {
    htmlLang: 'it',
    ogLocale: 'it_CH',
    title: 'PizKit – Testo su foto, card corsa e panoramiche per Instagram',
    description:
      'Gratis e senza registrazione: scrivi testo sulle foto, crea card con i dati di corsa, sci e bici da GPX/FIT, dividi le panoramiche. Le foto restano sul tuo telefono.',
    ogTitle: 'PizKit — foto pronte per i social',
    ogDescription: 'Card sport con i tuoi numeri e il percorso, testo sulle foto e sui video, panoramiche divise per Instagram. Gratis e privato.',
    ogAlt: 'PizKit: card sport, testo e panoramiche pronte per i social',
    noscriptH1: 'PizKit — testo su foto, card corsa e panoramiche per Instagram',
    noscriptP:
      'Card sport con i tuoi numeri e il percorso GPX/FIT, testo sulle foto e sui video, panoramiche divise per il carosello di Instagram. Gratis, senza app e senza registrazione: le foto restano sul tuo dispositivo. Attiva JavaScript per usare l’app.',
    faqTitle: 'Domande frequenti',
  },
  de: {
    htmlLang: 'de',
    ogLocale: 'de_CH',
    title: 'PizKit – Text auf Fotos, Lauf-Karten & Panoramen für Instagram',
    description:
      'Kostenlos, ohne Anmeldung: Text auf Fotos, Sport-Karten mit Lauf-, Langlauf- und Velodaten aus GPX/FIT, Panoramen teilen. Deine Fotos bleiben auf dem Handy.',
    ogTitle: 'PizKit — Fotos bereit für Social Media',
    ogDescription: 'Sport-Karten mit deinen Zahlen und der Strecke, Text auf Fotos und Videos, Panoramen für Instagram geteilt. Gratis und privat.',
    ogAlt: 'PizKit: Sport-Karten, Text und Panoramen bereit für Social Media',
    noscriptH1: 'PizKit — Text auf Fotos, Lauf-Karten und Panoramen für Instagram',
    noscriptP:
      'Sport-Karten mit deinen Zahlen und der GPX/FIT-Strecke, Text auf Fotos und Videos, Panoramen für das Instagram-Karussell. Kostenlos, ohne App und ohne Anmeldung: Deine Fotos bleiben auf deinem Gerät. Aktiviere JavaScript, um die App zu nutzen.',
    faqTitle: 'Häufige Fragen',
  },
  fr: {
    htmlLang: 'fr',
    ogLocale: 'fr_CH',
    title: 'PizKit – Texte sur photo, cartes de course et panoramas Instagram',
    description:
      'Gratuit, sans inscription : texte sur tes photos, cartes sport avec données course, ski et vélo depuis GPX/FIT, panoramas découpés. Tes photos restent sur ton téléphone.',
    ogTitle: 'PizKit — photos prêtes pour les réseaux',
    ogDescription: 'Cartes sport avec tes chiffres et le parcours, texte sur photos et vidéos, panoramas découpés pour Instagram. Gratuit et privé.',
    ogAlt: 'PizKit : cartes sport, texte et panoramas prêts pour les réseaux',
    noscriptH1: 'PizKit — texte sur photo, cartes de course et panoramas Instagram',
    noscriptP:
      'Cartes sport avec tes chiffres et le parcours GPX/FIT, texte sur photos et vidéos, panoramas découpés pour le carrousel Instagram. Gratuit, sans app et sans inscription : tes photos restent sur ton appareil. Active JavaScript pour utiliser l’app.',
    faqTitle: 'Questions fréquentes',
  },
  en: {
    htmlLang: 'en',
    ogLocale: 'en_GB',
    title: 'PizKit – Text on photos, running cards & Instagram panoramas',
    description:
      'Free, no sign-up: add text to photos, make sport cards with run, ski and bike stats from GPX/FIT, split panoramas. Your photos never leave your phone.',
    ogTitle: 'PizKit — photos ready for social media',
    ogDescription: 'Sport cards with your stats and route, text on photos and videos, panoramas split for Instagram. Free and private.',
    ogAlt: 'PizKit: sport cards, text and panoramas ready for social media',
    noscriptH1: 'PizKit — text on photos, running cards and Instagram panoramas',
    noscriptP:
      'Sport cards with your stats and GPX/FIT route, text on photos and videos, panoramas split for Instagram carousels. Free, no app and no sign-up: your photos stay on your device. Enable JavaScript to use the app.',
    faqTitle: 'Frequently asked questions',
  },
}

export const FAQ: Record<SeoLang, { q: string; a: string }[]> = {
  it: [
    { q: 'Come scrivo un testo su una foto per Instagram?', a: 'Apri «Testo sulle foto», carica la foto, scegli uno dei 7 stili e trascina il testo dove vuoi. Puoi anche metterlo dietro la persona.' },
    { q: 'Come creo una card con i dati della mia corsa?', a: 'Apri «Card sport», scegli lo sport (corsa, trail, bici, MTB, sci di fondo, escursione, spinning) e inserisci i dati, oppure importa il file GPX o FIT da Garmin o Strava: il percorso e le zone cardiache vengono disegnati sulla foto.' },
    { q: 'Serve collegare l’account Strava o Garmin?', a: 'No. Scrivi i numeri a mano oppure carichi il file GPX/FIT esportato: nessun accesso al tuo account e nessuna app da installare.' },
    { q: 'Come divido una panoramica per il carosello Instagram?', a: 'Con «Dividi la panoramica» la foto viene tagliata in 2–10 parti che, scorrendo, si uniscono senza stacchi.' },
    { q: 'Funziona anche con i video?', a: 'Sì: card sport e testo si possono mettere anche sui video, fino a 60 secondi, con l’audio originale.' },
    { q: 'PizKit è gratis?', a: 'Sì, completamente, senza abbonamento e senza pubblicità.' },
    { q: 'Le mie foto vengono caricate su un server?', a: 'No. Tutto avviene sul tuo telefono o computer, anche il ritocco con l’IA (gomma magica, sfondo sfocato).' },
    { q: 'Funziona su iPhone e Android?', a: 'Sì, nel browser. Puoi anche installarla come app sulla schermata Home.' },
  ],
  de: [
    { q: 'Wie schreibe ich Text auf ein Foto für Instagram?', a: 'Öffne «Text auf Fotos», lade dein Foto, wähle einen der 7 Stile und zieh den Text an die gewünschte Stelle – auch hinter die Person.' },
    { q: 'Wie erstelle ich eine Karte mit meinen Laufdaten?', a: 'Öffne «Sport-Card», wähle die Sportart (Laufen, Trail, Velo, MTB, Langlauf, Wandern, Spinning) und gib die Daten ein oder importiere die GPX- oder FIT-Datei von Garmin oder Strava: Strecke und Herzfrequenzzonen werden aufs Foto gezeichnet.' },
    { q: 'Muss ich mein Strava- oder Garmin-Konto verbinden?', a: 'Nein. Du gibst die Zahlen von Hand ein oder lädst die exportierte GPX/FIT-Datei: kein Zugriff auf dein Konto, keine App nötig.' },
    { q: 'Wie teile ich ein Panorama für ein Instagram-Karussell?', a: 'Mit «Panorama teilen» wird das Bild in 2–10 Teile geschnitten, die beim Wischen nahtlos ineinander übergehen.' },
    { q: 'Funktioniert es auch mit Videos?', a: 'Ja: Sport-Card und Text gehen auch auf Videos bis 60 Sekunden, mit dem Originalton.' },
    { q: 'Ist PizKit kostenlos?', a: 'Ja, komplett, ohne Abo und ohne Werbung.' },
    { q: 'Werden meine Fotos auf einen Server geladen?', a: 'Nein. Alles passiert auf deinem Handy oder Computer, auch die KI-Retusche (Zauber-Radierer, unscharfer Hintergrund).' },
    { q: 'Funktioniert es auf iPhone und Android?', a: 'Ja, im Browser. Du kannst es auch als App auf dem Home-Bildschirm installieren.' },
  ],
  fr: [
    { q: 'Comment écrire du texte sur une photo pour Instagram ?', a: 'Ouvre « Texte sur photo », charge ta photo, choisis l’un des 7 styles et fais glisser le texte où tu veux, même derrière la personne.' },
    { q: 'Comment créer une carte avec les données de ma course ?', a: 'Ouvre « Carte sport », choisis le sport (course, trail, vélo, VTT, ski de fond, randonnée, spinning) et saisis les données, ou importe le fichier GPX ou FIT de Garmin ou Strava : le parcours et les zones cardiaques sont dessinés sur la photo.' },
    { q: 'Faut-il connecter mon compte Strava ou Garmin ?', a: 'Non. Tu saisis les chiffres à la main ou tu charges le fichier GPX/FIT exporté : aucun accès à ton compte, aucune app à installer.' },
    { q: 'Comment découper un panorama pour un carrousel Instagram ?', a: 'Avec « Diviser le panorama », l’image est coupée en 2 à 10 parties qui s’enchaînent sans coupure en faisant défiler.' },
    { q: 'Ça marche aussi avec les vidéos ?', a: 'Oui : carte sport et texte aussi sur les vidéos jusqu’à 60 secondes, avec le son d’origine.' },
    { q: 'PizKit est-il gratuit ?', a: 'Oui, entièrement, sans abonnement et sans publicité.' },
    { q: 'Mes photos sont-elles envoyées sur un serveur ?', a: 'Non. Tout se fait sur ton téléphone ou ordinateur, y compris la retouche par IA (gomme magique, arrière-plan flou).' },
    { q: 'Ça marche sur iPhone et Android ?', a: 'Oui, dans le navigateur. Tu peux aussi l’installer comme application sur l’écran d’accueil.' },
  ],
  en: [
    { q: 'How do I add text to a photo for Instagram?', a: 'Open “Text on photos”, load your photo, pick one of the 7 styles and drag the text where you want it, even behind the person.' },
    { q: 'How do I make a card with my running stats?', a: 'Open “Sport card”, choose the sport (running, trail, bike, MTB, cross-country skiing, hiking, spinning) and type the data or import the GPX or FIT file from Garmin or Strava: the route and heart rate zones are drawn on the photo, like a Strava stats overlay.' },
    { q: 'Do I need to connect my Strava or Garmin account?', a: 'No. Type the numbers or load the exported GPX/FIT file: no account access and no app to install.' },
    { q: 'How do I split a panorama for an Instagram carousel?', a: '“Split panorama” cuts the image into 2–10 parts that join seamlessly as you swipe.' },
    { q: 'Does it work with videos too?', a: 'Yes: sport cards and text work on videos up to 60 seconds, with the original sound.' },
    { q: 'Is PizKit free?', a: 'Yes, completely, with no subscription and no ads.' },
    { q: 'Are my photos uploaded to a server?', a: 'No. Everything happens on your phone or computer, AI retouching included (magic eraser, blurred background).' },
    { q: 'Does it work on iPhone and Android?', a: 'Yes, in the browser. You can also install it as an app on your home screen.' },
  ],
}
