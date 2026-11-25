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
    title: 'Statistiche Strava e Garmin su foto e video, gratis | PizKit',
    description:
      'I dati di corsa, bici e sci di fondo sulla tua foto o video, pronti per la storia Instagram o lo stato WhatsApp. Anche da screenshot. Gratis, senza filigrana.',
    ogTitle: 'PizKit — statistiche Strava e Garmin su foto e video',
    ogDescription:
      'Dati di corsa, bici e sci di fondo sulla tua foto o video, per storie Instagram e stati WhatsApp. Gratis, senza filigrana, senza login Strava.',
    ogAlt: 'PizKit: foto con le statistiche di corsa pronta per la storia Instagram',
    noscriptH1: 'PizKit — statistiche Strava e Garmin su foto e video, gratis',
    noscriptP:
      'Metti i dati della tua corsa, uscita in bici o sci di fondo su una foto o un video: tempo, distanza, ritmo, dislivello, zone cardio. Li leggi da uno screenshot di Strava o Garmin, da un file GPX/FIT o li scrivi a mano, senza collegare account. In più testo sulle foto e panoramiche divise per il carosello Instagram. Gratis, senza registrazione, senza filigrana e senza abbonamento; le foto restano sul tuo dispositivo. Attiva JavaScript per usare l’app.',
    faqTitle: 'Domande frequenti',
  },
  de: {
    htmlLang: 'de',
    ogLocale: 'de_CH',
    title: 'Strava- & Garmin-Daten auf Foto und Video, gratis | PizKit',
    description:
      'Deine Lauf-, Velo- und Langlaufdaten auf Foto oder Video, bereit für Instagram Story oder WhatsApp Status. Auch aus Screenshot. Kostenlos, ohne Wasserzeichen.',
    ogTitle: 'PizKit — Strava- und Garmin-Daten auf Foto und Video',
    ogDescription:
      'Lauf-, Velo- und Langlaufdaten auf deinem Foto oder Video, für Instagram Stories und WhatsApp Status. Gratis, ohne Wasserzeichen, ohne Strava-Login.',
    ogAlt: 'PizKit: Foto mit Laufdaten, bereit für die Instagram Story',
    noscriptH1: 'PizKit — Strava- und Garmin-Daten auf Foto und Video, gratis',
    noscriptP:
      'Bring die Daten deines Laufs, deiner Velotour oder deiner Langlaufrunde auf ein Foto oder Video: Zeit, Distanz, Pace, Höhenmeter, Herzfrequenzzonen. Aus einem Strava- oder Garmin-Screenshot, einer GPX/FIT-Datei oder von Hand, ohne Konto zu verbinden. Dazu Text auf Fotos und Panoramen für das Instagram-Karussell. Kostenlos, ohne Anmeldung, ohne Wasserzeichen und ohne Abo; deine Fotos bleiben auf deinem Gerät. Aktiviere JavaScript, um die App zu nutzen.',
    faqTitle: 'Häufige Fragen',
  },
  fr: {
    htmlLang: 'fr',
    ogLocale: 'fr_CH',
    title: 'Stats Strava et Garmin sur photo et vidéo, gratuit | PizKit',
    description:
      'Tes données de course, vélo et ski de fond sur ta photo ou vidéo, prêtes pour la story Instagram ou le statut WhatsApp. Même depuis une capture. Gratuit, sans filigrane.',
    ogTitle: 'PizKit — stats Strava et Garmin sur photo et vidéo',
    ogDescription:
      'Données de course, vélo et ski de fond sur ta photo ou vidéo, pour stories Instagram et statuts WhatsApp. Gratuit, sans filigrane, sans connexion Strava.',
    ogAlt: 'PizKit : photo avec les stats de course, prête pour la story Instagram',
    noscriptH1: 'PizKit — stats Strava et Garmin sur photo et vidéo, gratuit',
    noscriptP:
      'Mets les données de ta course, sortie vélo ou ski de fond sur une photo ou une vidéo : temps, distance, allure, dénivelé, zones cardiaques. Depuis une capture d’écran Strava ou Garmin, un fichier GPX/FIT ou à la main, sans connecter de compte. En plus : texte sur photo et panoramas découpés pour le carrousel Instagram. Gratuit, sans inscription, sans filigrane et sans abonnement ; tes photos restent sur ton appareil. Active JavaScript pour utiliser l’app.',
    faqTitle: 'Questions fréquentes',
  },
  en: {
    htmlLang: 'en',
    ogLocale: 'en_GB',
    title: 'Strava & Garmin stats on photos and videos, free | PizKit',
    description:
      'Put your run, ride or cross-country ski stats on a photo or video, ready for Instagram Stories or WhatsApp Status. Even from a screenshot. Free, no watermark.',
    ogTitle: 'PizKit — Strava and Garmin stats on photos and videos',
    ogDescription:
      'Run, ride and XC ski stats on your photo or video, for Instagram Stories and WhatsApp Status. Free, no watermark, no Strava login, works on Android.',
    ogAlt: 'PizKit: photo with running stats, ready for an Instagram Story',
    noscriptH1: 'PizKit — Strava and Garmin stats on photos and videos, free',
    noscriptP:
      'Put the stats of your run, ride or cross-country ski on a photo or video: time, distance, pace, elevation, heart rate zones. Read them from a Strava or Garmin screenshot, a GPX/FIT file or type them in, without connecting any account. Plus text on photos and panoramas split for Instagram carousels. Free, no sign-up, no watermark and no subscription; your photos stay on your device. Enable JavaScript to use the app.',
    faqTitle: 'Frequently asked questions',
  },
}

export const FAQ: Record<SeoLang, { q: string; a: string }[]> = {
  it: [
    {
      q: 'Come metto le statistiche di Strava o Garmin su una foto per la storia Instagram?',
      a: 'Apri «Card sport», carica la foto e poi uno screenshot dell’attività con «Leggi da screenshot», oppure il file GPX/FIT, oppure scrivi i numeri a mano. Scegli lo stile e scarica l’immagine in formato storia (9:16) o post.',
    },
    {
      q: 'Posso usarlo per lo stato WhatsApp?',
      a: 'Sì: l’immagine o il video in formato storia (9:16) va bene così com’è anche per lo stato di WhatsApp, per Facebook e per Strava.',
    },
    {
      q: 'Serve collegare l’account Strava o Garmin?',
      a: 'No. Usi uno screenshot, il file GPX/FIT esportato o scrivi i numeri: nessun accesso al tuo account. PizKit non è collegato né approvato da Strava o Garmin.',
    },
    {
      q: 'Quali dati posso mettere sulla foto?',
      a: 'Tempo, distanza, ritmo o velocità, dislivello, frequenza cardiaca media, calorie, zone cardio Z1–Z5, Training Effect e il percorso (da GPX/FIT). Sport: corsa, trail, bici, MTB, sci di fondo, escursione, spinning.',
    },
    {
      q: 'Funziona anche con i video?',
      a: 'Sì: dati e testo si possono mettere anche sui video, fino a 60 secondi, con l’audio originale.',
    },
    {
      q: 'Come scrivo un testo su una foto per Instagram?',
      a: 'Apri «Testo sulle foto», carica la foto, scegli uno dei 7 stili e trascina il testo dove vuoi. Puoi anche metterlo dietro la persona.',
    },
    {
      q: 'Come divido una panoramica per il carosello Instagram?',
      a: 'Con «Dividi la panoramica» la foto viene tagliata in 2–10 parti che, scorrendo, si uniscono senza stacchi.',
    },
    {
      q: 'PizKit è gratis? Serve registrarsi?',
      a: 'È gratis e senza registrazione: niente abbonamento, niente filigrana, niente pubblicità, download illimitati. Se vuoi, puoi lasciare l’email per sapere quando arrivano funzioni nuove; è facoltativo e non la diamo a nessuno.',
    },
    {
      q: 'Le mie foto vengono caricate su un server?',
      a: 'No. Tutto avviene sul tuo telefono o computer, anche la lettura degli screenshot e il ritocco con l’IA (gomma magica, sfondo sfocato).',
    },
    {
      q: 'Funziona su iPhone e Android?',
      a: 'Sì, nel browser, senza installare nulla. Se vuoi puoi aggiungerla alla schermata Home come un’app.',
    },
  ],
  de: [
    {
      q: 'Wie bringe ich Strava- oder Garmin-Daten auf ein Foto für die Instagram Story?',
      a: 'Öffne «Sport-Card», lade dein Foto und dann einen Screenshot der Aktivität mit «Aus Screenshot lesen», die GPX/FIT-Datei oder tippe die Zahlen ein. Stil wählen und das Bild im Story-Format (9:16) oder als Post herunterladen.',
    },
    {
      q: 'Kann ich es für den WhatsApp Status nutzen?',
      a: 'Ja: Bild oder Video im Story-Format (9:16) passt direkt auch für den WhatsApp Status, Facebook und Strava.',
    },
    {
      q: 'Muss ich mein Strava- oder Garmin-Konto verbinden?',
      a: 'Nein. Screenshot, exportierte GPX/FIT-Datei oder Zahlen von Hand: kein Zugriff auf dein Konto. PizKit ist weder mit Strava noch mit Garmin verbunden oder von ihnen genehmigt.',
    },
    {
      q: 'Welche Daten kann ich aufs Foto bringen?',
      a: 'Zeit, Distanz, Pace oder Tempo, Höhenmeter, durchschnittliche Herzfrequenz, Kalorien, Herzfrequenzzonen Z1–Z5, Training Effect und die Strecke (aus GPX/FIT). Sportarten: Laufen, Trail, Velo, MTB, Langlauf, Wandern, Spinning.',
    },
    {
      q: 'Funktioniert es auch mit Videos?',
      a: 'Ja: Daten und Text gehen auch auf Videos bis 60 Sekunden, mit dem Originalton.',
    },
    {
      q: 'Wie schreibe ich Text auf ein Foto für Instagram?',
      a: 'Öffne «Text auf Fotos», lade dein Foto, wähle einen der 7 Stile und zieh den Text an die gewünschte Stelle – auch hinter die Person.',
    },
    {
      q: 'Wie teile ich ein Panorama für ein Instagram-Karussell?',
      a: 'Mit «Panorama teilen» wird das Bild in 2–10 Teile geschnitten, die beim Wischen nahtlos ineinander übergehen.',
    },
    {
      q: 'Ist PizKit kostenlos? Muss ich mich anmelden?',
      a: 'Kostenlos und ohne Anmeldung: kein Abo, kein Wasserzeichen, keine Werbung, unbegrenzte Downloads. Wenn du willst, kannst du deine E-Mail für Neuigkeiten hinterlassen; das ist freiwillig und wir geben sie niemandem weiter.',
    },
    {
      q: 'Werden meine Fotos auf einen Server geladen?',
      a: 'Nein. Alles passiert auf deinem Handy oder Computer, auch das Lesen der Screenshots und die KI-Retusche (Zauber-Radierer, unscharfer Hintergrund).',
    },
    {
      q: 'Funktioniert es auf iPhone und Android?',
      a: 'Ja, im Browser, ohne Installation. Wenn du willst, kannst du es wie eine App auf den Home-Bildschirm legen.',
    },
  ],
  fr: [
    {
      q: 'Comment mettre mes stats Strava ou Garmin sur une photo pour la story Instagram ?',
      a: 'Ouvre « Carte sport », charge ta photo puis une capture d’écran de l’activité avec « Lire une capture d’écran », ou le fichier GPX/FIT, ou saisis les chiffres. Choisis le style et télécharge l’image au format story (9:16) ou post.',
    },
    {
      q: 'Je peux l’utiliser pour le statut WhatsApp ?',
      a: 'Oui : l’image ou la vidéo au format story (9:16) convient telle quelle au statut WhatsApp, à Facebook et à Strava.',
    },
    {
      q: 'Faut-il connecter mon compte Strava ou Garmin ?',
      a: 'Non. Capture d’écran, fichier GPX/FIT exporté ou chiffres à la main : aucun accès à ton compte. PizKit n’est ni lié ni approuvé par Strava ou Garmin.',
    },
    {
      q: 'Quelles données puis-je mettre sur la photo ?',
      a: 'Temps, distance, allure ou vitesse, dénivelé, fréquence cardiaque moyenne, calories, zones cardiaques Z1–Z5, Training Effect et le parcours (depuis GPX/FIT). Sports : course, trail, vélo, VTT, ski de fond, randonnée, spinning.',
    },
    {
      q: 'Ça marche aussi avec les vidéos ?',
      a: 'Oui : données et texte aussi sur les vidéos jusqu’à 60 secondes, avec le son d’origine.',
    },
    {
      q: 'Comment écrire du texte sur une photo pour Instagram ?',
      a: 'Ouvre « Texte sur photo », charge ta photo, choisis l’un des 7 styles et fais glisser le texte où tu veux, même derrière la personne.',
    },
    {
      q: 'Comment découper un panorama pour un carrousel Instagram ?',
      a: 'Avec « Diviser le panorama », l’image est coupée en 2 à 10 parties qui s’enchaînent sans coupure en faisant défiler.',
    },
    {
      q: 'PizKit est-il gratuit ? Faut-il s’inscrire ?',
      a: 'Gratuit et sans inscription : sans abonnement, sans filigrane, sans publicité, téléchargements illimités. Si tu veux, tu peux laisser ton e-mail pour être prévenu des nouveautés ; c’est facultatif et on ne le donne à personne.',
    },
    {
      q: 'Mes photos sont-elles envoyées sur un serveur ?',
      a: 'Non. Tout se fait sur ton téléphone ou ordinateur, y compris la lecture des captures et la retouche par IA (gomme magique, arrière-plan flou).',
    },
    {
      q: 'Ça marche sur iPhone et Android ?',
      a: 'Oui, dans le navigateur, sans rien installer. Tu peux aussi l’ajouter à l’écran d’accueil comme une app.',
    },
  ],
  en: [
    {
      q: 'How do I put my Strava or Garmin stats on a photo for an Instagram Story?',
      a: 'Open “Sport card”, load your photo, then a screenshot of the activity with “Read from screenshot”, or the GPX/FIT file, or type the numbers. Pick a style and download the image in story (9:16) or post format.',
    },
    {
      q: 'Can I use it for my WhatsApp Status?',
      a: 'Yes: the story-format (9:16) image or video works as it is for WhatsApp Status, Facebook and Strava too.',
    },
    {
      q: 'Do I need to connect my Strava or Garmin account?',
      a: 'No. Use a screenshot, the exported GPX/FIT file or type the numbers: no account access. PizKit is not affiliated with or endorsed by Strava or Garmin.',
    },
    {
      q: 'Which stats can I put on the photo?',
      a: 'Time, distance, pace or speed, elevation, average heart rate, calories, heart rate zones Z1–Z5, Training Effect and the route (from GPX/FIT). Sports: running, trail, bike, MTB, cross-country skiing, hiking, spinning.',
    },
    { q: 'Does it work with videos too?', a: 'Yes: stats and text work on videos up to 60 seconds, with the original sound.' },
    {
      q: 'How do I add text to a photo for Instagram?',
      a: 'Open “Text on photos”, load your photo, pick one of the 7 styles and drag the text where you want it, even behind the person.',
    },
    {
      q: 'How do I split a panorama for an Instagram carousel?',
      a: '“Split panorama” cuts the image into 2–10 parts that join seamlessly as you swipe.',
    },
    {
      q: 'Is PizKit free? Do I need to sign up?',
      a: 'Free and no sign-up: no subscription, no watermark, no ads, unlimited downloads. If you like, you can leave your email to hear about new features; it’s optional and we never share it.',
    },
    {
      q: 'Are my photos uploaded to a server?',
      a: 'No. Everything happens on your phone or computer, screenshot reading and AI retouching included (magic eraser, blurred background).',
    },
    {
      q: 'Does it work on iPhone and Android?',
      a: 'Yes, in the browser, nothing to install. You can add it to your home screen like an app if you want.',
    },
  ],
}
