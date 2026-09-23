import { cn } from '@/lib/utils'

/**
 * A marca do Scriptly AI.
 *
 * O símbolo é SVG e a palavra é TEXTO de verdade, não imagem. Texto fica
 * nítido em qualquer densidade de tela, acompanha a fonte do app e o leitor
 * de tela lê — três coisas que um PNG de assinatura não entrega.
 *
 * Trocar a marca é trocar public/icon.svg e, se a palavra mudar, esta linha.
 */

/** Roxo da marca. Mesmo valor do símbolo em public/icon.svg. */
const BRAND_PURPLE = '#6D4AFF'

interface LogoProps {
  /** Altura do símbolo em pixels. A palavra acompanha. */
  size?: number
  /** Só o símbolo, para onde não cabe a assinatura inteira (o rail lateral). */
  iconOnly?: boolean
  /**
   * Fundo claro: a palavra vira navy. Existe para PDF e impresso — a interface
   * é de tema único (escuro).
   */
  onLight?: boolean
  className?: string
}

export function Logo({ size = 28, iconOnly = false, onLight = false, className }: LogoProps) {
  const icone = (
    <img
      src="/icon.svg"
      alt={iconOnly ? 'Scriptly AI' : ''}
      // Quando a palavra aparece ao lado, ela já é o nome: um alt aqui faria o
      // leitor de tela anunciar "Scriptly AI" duas vezes seguidas.
      aria-hidden={iconOnly ? undefined : true}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 select-none"
      draggable={false}
    />
  )

  if (iconOnly) return <span className={cn('inline-flex', className)}>{icone}</span>

  return (
    <span className={cn('inline-flex items-center gap-2 select-none', className)}>
      {icone}
      <span
        className="font-semibold leading-none tracking-[-0.02em]"
        // Proporção presa ao símbolo: crescendo os dois juntos, a assinatura
        // mantém o equilíbrio em qualquer tamanho.
        style={{ fontSize: size * 0.72 }}
      >
        <span className={onLight ? 'text-[#0F1035]' : 'text-[#EDEDF2]'}>scriptly</span>
        <span style={{ color: BRAND_PURPLE }}> AI</span>
      </span>
    </span>
  )
}
