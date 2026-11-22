// Configurazione pubblica. La chiave "publishable" di Supabase può stare nel
// codice: la sicurezza è garantita dalle policy RLS e dalle funzioni RPC.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://ztgehpjliohcqtsuzdbq.supabase.co'
export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_FSqohYS9spPqI_2oEbVENA_YzHhI4-7'

export const APP_NAME = 'PeakKit'
// Contatto del sito (pagina privacy e area admin)
export const CONTACT_EMAIL = 'robyrighi@outlook.com'
// Titolare del trattamento dei dati (nLPD)
export const OWNER = 'Roby Righi, Cama (GR), Svizzera'

export const FORMATS = {
  story: { w: 1080, h: 1920, label: 'Storia 9:16' },
  post: { w: 1080, h: 1350, label: 'Post 4:5' },
  square: { w: 1080, h: 1080, label: 'Quadrato 1:1' },
} as const
export type FormatKey = keyof typeof FORMATS
