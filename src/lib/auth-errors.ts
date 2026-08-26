import { isAuthError } from '@supabase/supabase-js'
import { strings } from '@/i18n/pt-BR'

/**
 * Taxonomia de erro (§9): cada caso ganha mensagem específica e humana.
 * Códigos conforme ErrorCode de @supabase/auth-js.
 */
const MESSAGE_BY_CODE: Record<string, string> = {
  invalid_credentials: strings.authErrors.invalidCredentials,
  email_not_confirmed: strings.authErrors.emailNotConfirmed,
  user_already_exists: strings.authErrors.userAlreadyExists,
  email_exists: strings.authErrors.userAlreadyExists,
  weak_password: strings.authErrors.weakPassword,
  over_request_rate_limit: strings.authErrors.rateLimited,
  over_email_send_rate_limit: strings.authErrors.rateLimited,
  email_address_invalid: strings.authErrors.invalidEmail,
  signup_disabled: strings.authErrors.signupDisabled,
}

export function authErrorMessage(error: unknown): string {
  if (!navigator.onLine) return strings.errors.offline

  if (isAuthError(error)) {
    if (error.code && MESSAGE_BY_CODE[error.code]) {
      return MESSAGE_BY_CODE[error.code]
    }
    // Sem código (falha antes da resposta HTTP) normalmente é rede/DNS.
    if (!error.status) return strings.errors.offline
  }

  return strings.errors.unexpected
}
