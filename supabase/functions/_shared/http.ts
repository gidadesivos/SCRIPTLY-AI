export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Códigos estáveis para o cliente traduzir (§9 taxonomia de erro).
 * A mensagem em pt-BR é escolhida no frontend, não aqui.
 */
export type ErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'invalid_request'
  | 'rate_limited'
  | 'ai_unavailable'
  | 'invalid_ai_output'
  | 'unexpected'

export function errorResponse(code: ErrorCode, status: number, detail?: string) {
  return jsonResponse({ error: { code, detail } }, status)
}
