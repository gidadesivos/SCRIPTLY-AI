import { geminiProvider } from './gemini.ts'
import { openRouterProvider } from './openrouter.ts'
import { ProviderError, type CallOptions, type Provider, type ProviderResult } from './types.ts'

export * from './types.ts'
export { fetchOpenRouterQuota } from './openrouter.ts'

/**
 * A ordem é a política.
 *
 * Gemini primeiro porque é o provedor direto: uma camada a menos entre o app e
 * o modelo, e é onde a conta paga está. OpenRouter é a rede de segurança —
 * entra quando o primeiro acabou a cota, está fora do ar ou demorou demais.
 *
 * Provedor sem chave configurada não entra na lista, então instalar sem
 * OPENROUTER_API_KEY continua funcionando exatamente como antes.
 */
const CHAIN: Provider[] = [geminiProvider, openRouterProvider]

export function configuredProviders(): Provider[] {
  return CHAIN.filter((provider) => provider.isConfigured())
}

export interface ChainAttempt {
  provider: string
  kind: ProviderError['kind']
  message: string
}

export interface ChainResult extends ProviderResult {
  /** O que foi tentado antes de dar certo. Vazio quando o primeiro atendeu. */
  attempts: ChainAttempt[]
}

/**
 * Percorre a cadeia até alguém responder.
 *
 * Falha de 'config' — chave errada, modelo inexistente, requisição malformada —
 * interrompe na hora em vez de seguir para o próximo. Mascarar erro de
 * instalação com fallback faz um bug de configuração parecer instabilidade do
 * fornecedor, e é o tipo de coisa que some por semanas.
 */
export async function callWithFallback(options: CallOptions): Promise<ChainResult> {
  const providers = configuredProviders()

  if (providers.length === 0) {
    throw new ProviderError(
      'gemini',
      'config',
      'Nenhum provedor de IA configurado. Falta GEMINI_API_KEY ou OPENROUTER_API_KEY.',
      null,
    )
  }

  const attempts: ChainAttempt[] = []
  let lastError: ProviderError | null = null

  for (const provider of providers) {
    try {
      const result = await provider.call(options)
      return { ...result, attempts }
    } catch (error) {
      const failure =
        error instanceof ProviderError
          ? error
          : new ProviderError(provider.name, 'upstream', (error as Error).message, null)

      lastError = failure
      attempts.push({
        provider: provider.name,
        kind: failure.kind,
        message: failure.message,
      })

      // Visível nos logs da function: sem isto, uma troca de provedor
      // aconteceria em silêncio e ninguém saberia que o primeiro caiu.
      console.error(`[ia] ${provider.name} falhou (${failure.kind}): ${failure.message}`)

      if (!failure.shouldFallover) break
    }
  }

  throw lastError ?? new ProviderError('gemini', 'upstream', 'Falha desconhecida.', null)
}
