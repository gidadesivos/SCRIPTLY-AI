import type { GeminiSchema } from '../gemini.ts'

/** Quem atendeu a chamada. Não é o modelo — é a porta. */
export type ProviderName = 'gemini' | 'openrouter' | 'groq'

export interface CallOptions {
  systemInstruction: string
  userPrompt: string
  responseSchema: GeminiSchema
  temperature: number
  maxOutputTokens: number
  thinkingLevel?: 'low'
  /**
   * Modelos escolhidos pelo workspace para o OpenRouter, em ordem.
   *
   * Vazio ou ausente = usa a lista padrão da variável de ambiente. A escolha é
   * opcional: quem não configurar nada continua funcionando como antes.
   */
  openRouterModels?: string[]
  groqModels?: string[]
  /**
   * Idem para o Gemini. Estava faltando: gemini.ts e callExplicit já liam e
   * escreviam este campo, e só não quebrou porque o deploy do Supabase empacota
   * com esbuild, que apaga tipo sem conferir.
   */
  geminiModels?: string[]
}

export interface ProviderResult {
  text: string
  inputTokens: number | null
  outputTokens: number | null
  provider: ProviderName
  /** Modelo que de fato respondeu. O OpenRouter pode trocar dentro da cadeia. */
  model: string
}

/**
 * Por que a falha aconteceu. É isto que decide se vale tentar o próximo
 * provedor ou se insistir só repetiria o mesmo erro.
 */
export type FailureKind =
  /** Cota do fornecedor acabou. Trocar de provedor resolve; esperar não. */
  | 'quota'
  /** Excesso momentâneo. Esperar resolve, trocar também. */
  | 'rate_limit'
  /** Fornecedor fora do ar. Trocar resolve. */
  | 'upstream'
  /** Modelo lento demais. Nem esperar nem trocar garante nada, mas trocar tenta. */
  | 'timeout'
  /** Chave errada, modelo inexistente, requisição malformada. Trocar NÃO resolve. */
  | 'config'
  /** Resposta veio, mas vazia ou cortada. Problema de conteúdo, não de porta. */
  | 'empty'

export class ProviderError extends Error {
  provider: ProviderName
  kind: FailureKind
  status: number | null

  constructor(provider: ProviderName, kind: FailureKind, message: string, status: number | null) {
    super(message)
    this.name = 'ProviderError'
    this.provider = provider
    this.kind = kind
    this.status = status
  }

  /**
   * Vale tentar o próximo provedor?
   *
   * 'config' fica de fora de propósito: chave errada ou requisição malformada
   * daria o mesmo erro em qualquer porta, e mascarar isso com fallback faria
   * um bug de instalação parecer instabilidade do fornecedor.
   */
  get shouldFallover(): boolean {
    return this.kind !== 'config'
  }
}

export interface Provider {
  name: ProviderName
  /** Sem chave configurada, o provedor simplesmente não entra na cadeia. */
  isConfigured(): boolean
  call(options: CallOptions): Promise<ProviderResult>
}
