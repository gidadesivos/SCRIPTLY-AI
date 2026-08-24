/**
 * Ponto único de configuração da IA (§7.5).
 * O nome do modelo aparece SÓ aqui — não replicar em prompt nem em operação.
 */

/**
 * gemini-2.5-flash foi descontinuado para contas novas: a API responde
 * "no longer available to new users" e manda usar a 3.6. Trocado depois de
 * ver esse erro na telemetria de ai_generations.
 */
export const AI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash'

export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

/**
 * 30s era curto demais e a telemetria mostrou: generateScript levava 66s em
 * média e completeBrief morria com "Tempo esgotado" em 91,8s — que é o timeout
 * batendo três vezes com backoff no meio. O usuário esperava um minuto e meio
 * para receber erro numa chamada que teria dado certo.
 */
export const REQUEST_TIMEOUT_MS = 75_000

/** Retry só em 429/5xx, com backoff exponencial. */
export const MAX_RETRIES = 2
export const RETRY_BASE_DELAY_MS = 600

/** Uma única tentativa de reparo quando o Zod recusa a saída (§7.2 do pipeline). */
export const MAX_REPAIR_ATTEMPTS = 1

/**
 * Os limites de uso NÃO ficam aqui. Eles são por plano e moram em plan_limits,
 * no banco (migration 0008) — ver _shared/rate-limit.ts. Ter uma constante
 * "RATE_LIMIT" sobrando neste arquivo só faria alguém acreditar nela.
 */

export type OperationName =
  | 'parseFreeformIdea'
  | 'completeBrief'
  | 'generateAngles'
  | 'generateHooks'
  | 'generateScript'
  | 'rewriteSection'
  | 'generateVariations'
  | 'generateAdCopy'

/**
 * Temperatura por operação: extração precisa ser literal, criação precisa variar.
 */
export const TEMPERATURE: Record<OperationName, number> = {
  parseFreeformIdea: 0.1,
  completeBrief: 0.4,
  generateAngles: 0.9,
  generateHooks: 1.0,
  generateScript: 0.7,
  // Cirúrgico: baixa temperatura, para alterar o alvo sem reinventar o resto.
  rewriteSection: 0.5,
  generateVariations: 0.9,
  // Copy de anúncio precisa variar para render, mas sem inventar: a temperatura
  // é alta o suficiente para não sair genérico e baixa o suficiente para o
  // modelo continuar preso ao que o Brand Brain forneceu.
  generateAdCopy: 0.8,
}

export const MAX_OUTPUT_TOKENS: Record<OperationName, number> = {
  parseFreeformIdea: 1024,
  completeBrief: 2048,
  generateAngles: 4096,
  generateHooks: 4096,
  generateScript: 8192,
  rewriteSection: 1024,
  generateVariations: 8192,
  generateAdCopy: 2048,
}

/** Anti-repetição (§7.4): quantos títulos/textos recentes enviar como "evite". */
export const ANTI_REPETITION_SAMPLE = 30

/**
 * Nível de raciocínio antes de responder (gemini-3.6-flash é um modelo de
 * "thinking"). Sai como generationConfig.thinkingConfig.thinkingLevel.
 *
 * Pensar custa tempo de parede: é a maior parcela da espera em operações onde
 * não há o que decidir. Por isso as operações mecânicas — extrair campos de
 * uma frase, completar lacunas, reescrever um trecho com instrução explícita —
 * vão em 'low'. As criativas ficam no padrão do modelo, porque é ali que o
 * raciocínio vira ângulo melhor e hook melhor.
 *
 * undefined = não manda o campo, o modelo decide.
 *
 * generateScript é a espera mais longa do app e o candidato óbvio a virar
 * 'low'. Não fiz por conta própria: só dá para saber se a qualidade cai
 * olhando o roteiro gerado, e essa é uma comparação de conteúdo, não de código.
 */
export const THINKING_LEVEL: Record<OperationName, 'low' | undefined> = {
  parseFreeformIdea: 'low',
  completeBrief: 'low',
  generateAngles: undefined,
  generateHooks: undefined,
  generateScript: undefined,
  rewriteSection: 'low',
  generateVariations: undefined,
  generateAdCopy: undefined,
}
