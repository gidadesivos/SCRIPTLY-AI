import { formatTimecode, sceneTimings } from '@/lib/duration'
import { labelFor, PLATFORMS } from '@/config/options'
import type { Scene, ScriptWithBrand } from '@/features/scripts/api'

function line(label: string, value: string | null | undefined): string {
  if (!value?.trim()) return ''
  return `${label}: ${value.trim()}\n`
}

/** Roteiro completo em texto puro — serve para TXT, e-mail e colar no WhatsApp. */
export function scriptToText(script: ScriptWithBrand, scenes: Scene[]): string {
  const timings = sceneTimings(
    scenes.map((scene) => scene.voiceover ?? ''),
    script.tone,
  )

  let out = `${script.title}\n${'='.repeat(script.title.length)}\n\n`

  out += line('Marca', script.brand?.name)
  out += line('Plataforma', labelFor(PLATFORMS, script.platform))
  out += `Duração alvo: ${script.duration_seconds}s\n`
  out += line('Framework', script.framework)
  out += line('Hook', script.hook_text)
  out += '\n'

  if (script.strategy_summary) {
    out += `ESTRATÉGIA\n${script.strategy_summary}\n\n`
  }

  scenes.forEach((scene, index) => {
    const timing = timings[index]
    out += `${'-'.repeat(60)}\n`
    out += `CENA ${index + 1}  [${formatTimecode(timing.startSeconds)} - ${formatTimecode(timing.endSeconds)}]`
    out += scene.purpose ? `  ${scene.purpose}\n` : '\n'
    out += `${'-'.repeat(60)}\n`
    out += line('LOCUÇÃO', scene.voiceover)
    out += line('TEXTO EM TELA', scene.on_screen_text)
    out += line('VISUAL', scene.visual)
    out += line('AÇÃO', scene.action)
    out += line('PLANO', scene.shot)
    out += line('B-ROLL', scene.broll)
    out += line('EDIÇÃO', scene.editing_direction)
    out += line('TRANSIÇÃO', scene.transition)
    out += line('SOM', scene.sound_suggestion)
    out += '\n'
  })

  if (script.cta) out += `${'-'.repeat(60)}\nCTA: ${script.cta}\n`

  return out
}

/** Só a locução, na ordem — é o que se manda para quem vai narrar. */
export function voiceoverToText(scenes: Scene[]): string {
  return scenes
    .map((scene) => scene.voiceover?.trim())
    .filter((text): text is string => Boolean(text))
    .join('\n\n')
}

/** Só o texto em tela, para quem monta as legendas na edição. */
export function onScreenTextToText(scenes: Scene[]): string {
  return scenes
    .map((scene, index) => {
      const text = scene.on_screen_text?.trim()
      return text ? `${index + 1}. ${text}` : null
    })
    .filter((entry): entry is string => Boolean(entry))
    .join('\n')
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // Sem o revoke, o blob fica retido na memória da aba até o reload.
  URL.revokeObjectURL(url)
}

/** Nome de arquivo previsível e sem caractere que quebre em Windows/macOS. */
export function safeFilename(title: string, extension: string): string {
  const base = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
  return `${base || 'roteiro'}.${extension}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
