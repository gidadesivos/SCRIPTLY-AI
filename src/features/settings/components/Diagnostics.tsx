import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type CheckStatus = 'ok' | 'missing' | 'error'

interface CheckResult {
  label: string
  status: CheckStatus
  detail: string
}

const TABLE_CHECKS: Array<{ table: string; label: string; migration: string }> = [
  { table: 'profiles', label: 'profiles', migration: '0001_init.sql' },
  { table: 'workspaces', label: 'workspaces', migration: '0001_init.sql' },
  { table: 'workspace_members', label: 'workspace_members', migration: '0001_init.sql' },
  { table: 'brands', label: 'brands', migration: '0002_brands.sql' },
  { table: 'products', label: 'products', migration: '0003_products.sql' },
  { table: 'scripts', label: 'scripts', migration: '0005_scripts.sql' },
  { table: 'script_scenes', label: 'script_scenes', migration: '0005_scripts.sql' },
  { table: 'ai_generations', label: 'ai_generations', migration: '0005_scripts.sql' },
  { table: 'script_versions', label: 'script_versions', migration: '0006_versions.sql' },
  { table: 'script_variations', label: 'script_variations', migration: '0006_versions.sql' },
]

/**
 * Checa cada peça da instalação e diz exatamente o que falta.
 * Existe para transformar "o app não funciona" em "falta rodar a migration X".
 */
export function Diagnostics() {
  const [results, setResults] = useState<CheckResult[] | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  async function run() {
    setIsRunning(true)
    const found: CheckResult[] = []

    found.push({
      label: 'Variáveis de ambiente',
      status: isSupabaseConfigured ? 'ok' : 'missing',
      detail: isSupabaseConfigured
        ? 'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY definidas.'
        : 'Faltam VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY.',
    })

    for (const check of TABLE_CHECKS) {
      // head:true não traz linhas — só confirma que a tabela responde.
      const { error } = await supabase
        .from(check.table as 'profiles')
        .select('*', { count: 'exact', head: true })
        .limit(1)

      if (!error) {
        found.push({ label: `Tabela ${check.label}`, status: 'ok', detail: 'Existe e responde.' })
      } else if (error.code === '42P01' || /does not exist/i.test(error.message)) {
        found.push({
          label: `Tabela ${check.label}`,
          status: 'missing',
          detail: `Não existe. Rode a migration ${check.migration}.`,
        })
      } else {
        found.push({
          label: `Tabela ${check.label}`,
          status: 'error',
          detail: `${error.code ?? 'erro'}: ${error.message}`,
        })
      }
    }

    // Edge Function: uma chamada inválida de propósito. Se a function existe,
    // ela responde 400 (invalid_request). Se não existe, o erro é de rede/404.
    try {
      const { error } = await supabase.functions.invoke('ai-generate', {
        body: { operation: '__diagnostics__' },
      })
      const context = (error as { context?: Response } | null)?.context
      if (!error) {
        found.push({
          label: 'Edge Function ai-generate',
          status: 'ok',
          detail: 'Respondeu.',
        })
      } else if (context && context.status >= 400 && context.status < 500) {
        found.push({
          label: 'Edge Function ai-generate',
          status: 'ok',
          detail: `Publicada e respondendo (${context.status} para requisição inválida, como esperado).`,
        })
      } else {
        found.push({
          label: 'Edge Function ai-generate',
          status: 'missing',
          detail:
            'Não respondeu. Publique com: supabase functions deploy ai-generate — e configure o secret GEMINI_API_KEY.',
        })
      }
    } catch (error) {
      found.push({
        label: 'Edge Function ai-generate',
        status: 'error',
        detail: (error as Error).message,
      })
    }

    setResults(found)
    setIsRunning(false)
  }

  const problems = results?.filter((r) => r.status !== 'ok') ?? []

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold leading-none tracking-tight">Diagnóstico</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Verifica o que já está instalado e o que falta configurar.
          </p>
        </div>
        <Button variant="outline" className="h-11" onClick={run} disabled={isRunning}>
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isRunning ? 'Verificando…' : 'Verificar instalação'}
        </Button>
      </div>

      {results && (
        <>
          <p
            className={cn(
              'rounded-md border p-3 text-sm',
              problems.length === 0
                ? 'border-success/40 bg-success/10'
                : 'border-warning/40 bg-warning/10',
            )}
          >
            {problems.length === 0
              ? 'Tudo certo. Todas as tabelas existem e a Edge Function responde.'
              : `${problems.length} ${problems.length === 1 ? 'item precisa' : 'itens precisam'} de atenção.`}
          </p>

          <ul className="flex flex-col divide-y divide-border">
            {results.map((result) => (
              <li key={result.label} className="flex items-start gap-3 py-2.5">
                {result.status === 'ok' && (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                )}
                {result.status === 'missing' && (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                )}
                {result.status === 'error' && (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{result.label}</span>
                  <span className="block break-words text-xs text-muted-foreground">
                    {result.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}
