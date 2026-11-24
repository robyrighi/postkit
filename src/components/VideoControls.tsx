import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { MAX_VIDEO_SEC, frameAt, isVideoFile, openVideo, renderVideo, videoSupported, type RenderJob, type VideoInfo } from '../lib/video'
import type { Framing } from '../lib/image'
import { Slider } from './Controls'

/** Stato e operazioni per lavorare con un video al posto della foto. */
export function useVideo(onPoster: (c: HTMLCanvasElement) => void) {
  const [info, setInfo] = useState<VideoInfo | null>(null)
  const [start, setStart] = useState(0)
  const [len, setLen] = useState(15)
  const [progress, setProgress] = useState<number | null>(null)
  const job = useRef<RenderJob | null>(null)
  const posterCb = useRef(onPoster)
  posterCb.current = onPoster

  /** Apre il file: restituisce il primo fotogramma o lancia 'unsupported'. */
  async function open(f: File): Promise<HTMLCanvasElement> {
    if (!(await videoSupported())) throw new Error('unsupported')
    const i = await openVideo(f)
    setInfo(i)
    setStart(0)
    setLen(Math.max(1, Math.min(MAX_VIDEO_SEC, Math.floor(i.duration * 10) / 10)))
    return frameAt(f, 0)
  }

  function clear() {
    setInfo(null)
  }

  // Aggiorna l'anteprima quando cambia l'inizio del taglio
  useEffect(() => {
    if (!info || start === 0) return
    const id = setTimeout(() => {
      frameAt(info.file, start)
        .then((c) => posterCb.current(c))
        .catch(() => {})
    }, 250)
    return () => clearTimeout(id)
  }, [info, start])

  const maxLen = info ? Math.max(1, Math.min(MAX_VIDEO_SEC, info.duration - start)) : 1
  const length = Math.min(len, maxLen)

  async function render(o: { width: number; height: number; framing: Framing; overlay: HTMLCanvasElement; name: string }) {
    if (!info) throw new Error('no video')
    setProgress(0)
    job.current = renderVideo({ ...o, file: info.file, start, end: start + length, onProgress: (p) => setProgress(p) })
    try {
      return await job.current.done
    } finally {
      job.current = null
      setProgress(null)
    }
  }

  return {
    info,
    isVideo: !!info,
    start,
    setStart,
    len: length,
    setLen,
    maxLen,
    progress,
    open,
    clear,
    render,
    cancel: () => job.current?.cancel(),
    isVideoFile,
  }
}

export type VideoState = ReturnType<typeof useVideo>

/** Cursori per scegliere inizio e durata del video. */
export function VideoTrim({ v, onChange }: { v: VideoState; onChange: () => void }) {
  const { t } = useI18n()
  if (!v.info) return null
  const dur = v.info.duration
  const fmt = (s: number) => `${s.toFixed(1)} s`
  return (
    <div className="video-trim">
      <p className="video-badge">🎬 {t('video.badge', { s: dur.toFixed(1) })}</p>
      {dur > 1.5 && (
        <Slider
          label={t('video.start')}
          value={v.start}
          min={0}
          max={Math.max(0, dur - 1)}
          step={0.1}
          format={fmt}
          onChange={(x) => (v.setStart(x), onChange())}
        />
      )}
      {v.maxLen > 1 && (
        <Slider label={t('video.len')} value={v.len} min={1} max={v.maxLen} step={0.1} format={fmt} onChange={(x) => (v.setLen(x), onChange())} />
      )}
      <p className="muted small">{t('video.note', { max: MAX_VIDEO_SEC })}</p>
    </div>
  )
}
