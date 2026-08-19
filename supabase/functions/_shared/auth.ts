import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Cliente admin: ignora RLS. Só para telemetria e checagens explícitas. */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export interface AuthContext {
  userId: string
  workspaceId: string
  admin: SupabaseClient
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: 'unauthorized' | 'forbidden',
  ) {
    super(message)
  }
}

/**
 * Valida o JWT do usuário e confirma que ele é membro do workspace pedido.
 * Sem essa checagem, o workspace_id do body seria confiável — e não é.
 */
export async function authenticate(req: Request, workspaceId: string): Promise<AuthContext> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Sem token de acesso.', 'unauthorized')
  }

  const admin = adminClient()
  const token = authHeader.slice('Bearer '.length)

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) {
    throw new AuthError('Sessão inválida ou expirada.', 'unauthorized')
  }

  const { data: membership, error: membershipError } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (membershipError) {
    throw new AuthError('Não foi possível verificar o acesso.', 'forbidden')
  }
  if (!membership) {
    throw new AuthError('Você não tem acesso a este workspace.', 'forbidden')
  }
  if (!['owner', 'admin', 'editor'].includes(membership.role)) {
    throw new AuthError('Seu papel não permite gerar conteúdo.', 'forbidden')
  }

  return { userId: data.user.id, workspaceId, admin }
}
