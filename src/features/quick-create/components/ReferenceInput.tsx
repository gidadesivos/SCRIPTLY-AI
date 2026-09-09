import { useRef } from 'react'
import { FileText, Film, Loader2, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { strings } from '@/i18n/pt-BR'
import {
  TRANSCRIPT_ACCEPT_ATTR,
  readTranscriptFile,
} from '@/features/quick-create/transcript-files'
import { VIDEO_ACCEPT_ATTR, formatBytes } from '@/features/quick-create/reference-rules'
import type {
  ReferenceMode,
  ReferenceStatus,
} from '@/features/quick-create/schemas/quickScript'

const t = strings.quickCreate

export interface ReferenceState {
  mode: ReferenceMode
  status: ReferenceStatus
  file: { name: string; size: number } | null
  error: string
  transcript: string
}

interface ReferenceInputProps {
  state: ReferenceState
  disabled: boolean
  onModeChange: (mode: ReferenceMode) => void
  onPickVideo: (file: File) => void
  onRemoveVideo: () => void
  onTranscriptChange: (text: string) => void
  onTranscriptError: (message: string) => void
}

export function ReferenceInput({
  state,
  disabled,
  onModeChange,
  onPickVideo,
  onRemoveVideo,
  onTranscriptChange,
  onTranscriptError,
}: ReferenceInputProps) {
  const inputVideo = useRef<HTMLInputElement>(null)
  const inputTranscricao = useRef<HTMLInputElement>(null)

  const modos: Array<{ value: ReferenceMode; label: string; icon: typeof Film }> = [
    { value: 'none', label: t.referenceNone, icon: X },
    { value: 'video', label: t.referenceVideo, icon: Film },
    { value: 'transcript', label: t.referenceTranscript, icon: FileText },
  ]

  async function aoEscolherTranscricao(file: File) {
    const resultado = await readTranscriptFile(file)
    if ('error' in resultado) onTranscriptError(resultado.error)
    else onTranscriptChange(resultado.text)
  }

  return (
    <section className="rounded-xl border border-[#1E1E28] bg-[#0E0E14] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5E5E75]">
          {t.reference}
        </span>
        <span className="text-[11px] text-[#5E5E75]">({t.referenceOptional})</span>
      </div>

      <div role="radiogroup" aria-label={t.reference} className="mb-3 flex flex-wrap gap-1.5">
        {modos.map((modo) => {
          const ativo = state.mode === modo.value
          return (
            <button
              key={modo.value}
              type="button"
              role="radio"
              aria-checked={ativo}
              disabled={disabled}
              onClick={() => onModeChange(modo.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4AFF]',
                'disabled:cursor-not-allowed disabled:opacity-50',
                ativo
                  ? 'border-[#6D4AFF]/60 bg-[#6D4AFF]/15 text-[#B9A6FF]'
                  : 'border-[#1E1E28] bg-[#14141C] text-[#8C8CA0] hover:text-[#EDEDF2]',
              )}
            >
              <modo.icon className="h-3.5 w-3.5" aria-hidden />
              {modo.label}
            </button>
          )
        })}
      </div>

      {state.mode !== 'none' && (
        <p className="mb-3 text-[12px] leading-relaxed text-[#5E5E75]">{t.referenceHint}</p>
      )}

      {state.mode === 'video' && (
        <div>
          <input
            ref={inputVideo}
            type="file"
            accept={VIDEO_ACCEPT_ATTR}
            className="sr-only"
            // Limpa o valor para reescolher o MESMO arquivo disparar o evento —
            // sem isso, remover e reenviar o mesmo vídeo não faz nada.
            onClick={(event) => {
              ;(event.target as HTMLInputElement).value = ''
            }}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onPickVideo(file)
            }}
          />

          {state.file ? (
            <CartaoArquivo state={state} onRemove={onRemoveVideo} disabled={disabled} />
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => inputVideo.current?.click()}
              className="h-auto w-full justify-start gap-3 border-dashed border-[#2A2A38] bg-[#14141C] py-4 text-[#8C8CA0] hover:text-[#EDEDF2]"
            >
              <Upload className="h-4 w-4" aria-hidden />
              <span className="flex flex-col items-start gap-0.5 text-left">
                <span className="text-[13px]">{t.videoPick}</span>
                <span className="text-[11px] text-[#5E5E75]">{t.videoLimits}</span>
              </span>
            </Button>
          )}

          <p className="mt-2 text-[11px] leading-relaxed text-[#5E5E75]">{t.videoModelNote}</p>
        </div>
      )}

      {state.mode === 'transcript' && (
        <div className="flex flex-col gap-2">
          <label htmlFor="quick-transcript" className="sr-only">
            {t.referenceTranscript}
          </label>
          <Textarea
            id="quick-transcript"
            rows={6}
            disabled={disabled}
            placeholder={t.transcriptPlaceholder}
            value={state.transcript}
            onChange={(event) => onTranscriptChange(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputTranscricao}
              type="file"
              accept={TRANSCRIPT_ACCEPT_ATTR}
              className="sr-only"
              onClick={(event) => {
                ;(event.target as HTMLInputElement).value = ''
              }}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void aoEscolherTranscricao(file)
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => inputTranscricao.current?.click()}
              className="text-[12px] text-[#8C8CA0] hover:text-[#EDEDF2]"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden />
              {t.transcriptFile}
            </Button>
            {state.transcript.trim() && (
              <span className="text-[11px] text-[#5E5E75]">
                {state.transcript.trim().length.toLocaleString('pt-BR')} caracteres
              </span>
            )}
          </div>
        </div>
      )}

      {state.error && (
        <p role="alert" className="mt-2 text-[12px] text-destructive">
          {state.error}
        </p>
      )}
    </section>
  )
}

/**
 * O cartão distingue "terminou de subir" de "a IA terminou de entender".
 * São dois momentos, e juntá-los faria a tela mentir sobre o segundo.
 */
function CartaoArquivo({
  state,
  onRemove,
  disabled,
}: {
  state: ReferenceState
  onRemove: () => void
  disabled: boolean
}) {
  const emAndamento = state.status === 'uploading' || state.status === 'analyzing'

  const situacao =
    state.status === 'uploading'
      ? t.videoUploading
      : state.status === 'analyzing'
        ? t.videoAnalyzing
        : state.status === 'ready'
          ? t.videoReady
          : state.status === 'error'
            ? state.error || t.referenceNone
            : t.videoUploaded

  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#1E1E28] bg-[#14141C] p-3">
      <Film className="mt-0.5 h-4 w-4 shrink-0 text-[#B9A6FF]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-[#EDEDF2]">{state.file?.name}</p>
        <p className="text-[11px] text-[#5E5E75]">{formatBytes(state.file?.size ?? 0)}</p>
        <p
          className={cn(
            'mt-1 inline-flex items-center gap-1.5 text-[12px]',
            state.status === 'ready'
              ? 'text-[#6EE7A8]'
              : state.status === 'error'
                ? 'text-destructive'
                : 'text-[#8C8CA0]',
          )}
          // Estado que muda sozinho precisa ser anunciado, senão quem usa
          // leitor de tela não descobre que a análise terminou.
          aria-live="polite"
        >
          {emAndamento && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          {state.status === 'ready' && <span aria-hidden>✓</span>}
          {situacao}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-[#5E5E75] hover:text-destructive"
        aria-label={`${t.videoRemove} ${state.file?.name ?? ''}`}
        disabled={disabled && !emAndamento}
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
