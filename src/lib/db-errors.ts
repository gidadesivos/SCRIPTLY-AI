import { strings } from '@/i18n/pt-BR'

/**
 * Erros de Postgres/PostgREST traduzidos para algo acionável.
 * O caso mais comum durante a instalação é tabela ou função inexistente —
 * a mensagem precisa dizer QUAL migration falta, não "algo deu errado".
 */

interface PostgrestLikeError {
  code?: string
  message?: string
}

/** Qual migration cria cada objeto, para a mensagem apontar o arquivo certo. */
const MIGRATION_BY_OBJECT: Array<{ match: RegExp; migration: string }> = [
  { match: /profiles|workspaces|workspace_members|create_workspace_with_owner/, migration: '0001_init.sql' },
  { match: /brands/, migration: '0002_brands.sql' },
  { match: /products/, migration: '0003_products.sql' },
  { match: /brand-assets|avatars|storage/, migration: '0004_storage.sql' },
  { match: /scripts|script_scenes|ai_generations/, migration: '0005_scripts.sql' },
  {
    match: /script_versions|script_variations|create_script_version|reorder_script_scenes|restore_script_version/,
    migration: '0006_versions.sql',
  },
]

function migrationFor(message: string): string | null {
  return MIGRATION_BY_OBJECT.find((entry) => entry.match.test(message))?.migration ?? null
}

export function dbErrorMessage(error: unknown): string {
  if (!navigator.onLine) return strings.errors.offline

  const err = error as PostgrestLikeError
  const message = err?.message ?? ''

  // 42P01 = undefined_table, 42883 = undefined_function
  if (err?.code === '42P01' || err?.code === '42883' || /does not exist/i.test(message)) {
    const migration = migrationFor(message)
    return migration
      ? `O banco ainda não tem essa estrutura. Rode a migration ${migration} no SQL Editor do Supabase.`
      : 'O banco ainda não tem essa estrutura. Verifique se todas as migrations foram rodadas.'
  }

  // 42501 = insufficient_privilege; PGRST301 = JWT inválido/ausente
  if (err?.code === '42501' || err?.code === 'PGRST301') {
    return strings.errors.forbidden
  }

  if (err?.code === 'PGRST116') return strings.errors.notFound

  // 23505 = unique_violation
  if (err?.code === '23505') {
    return 'Já existe um registro com esses dados.'
  }

  // 23503 = foreign_key_violation
  if (err?.code === '23503') {
    return 'Esse item está vinculado a outro registro e não pode ser removido.'
  }

  return strings.errors.unexpected
}
