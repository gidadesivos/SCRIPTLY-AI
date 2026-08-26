import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, ArrowRight, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { getDashboardData } from '@/features/dashboard/api'
import { ContextSwitcher } from '@/components/ContextSwitcher'
import { ModelSelector } from '@/components/ModelSelector'

export function DashboardPage() {
  const { activeWorkspace } = useActiveWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''

  const { data, isPending } = useQuery({
    queryKey: ['dashboard', workspaceId],
    queryFn: () => getDashboardData(workspaceId),
    enabled: Boolean(workspaceId),
  })

  // Data helpers
  const stats = data?.scriptsByStatus || {}
  const scripts = data?.recentScripts || []

  // Format today's date
  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const formattedDate = today.charAt(0).toUpperCase() + today.slice(1)

  return (
    <div className="flex h-full flex-col bg-[#0B0B10]">
      {/* Topbar */}
      <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-[#1E1E28] bg-[#0E0E14] px-4">
        <ContextSwitcher />
        <div className="flex h-8 max-w-[400px] flex-1 items-center gap-2 rounded-lg border border-[#23232F] bg-[#14141C] px-2.5">
          <Search className="h-3.5 w-3.5 text-[#5E5E75]" />
          <span className="flex-1 font-sans text-[13px] text-[#5E5E75]">Buscar ou executar…</span>
          <span className="rounded bg-[#1C1C27] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#8C8CA0]">
            ⌘K
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <ModelSelector />
          <Button
            className="h-8 gap-2 bg-[#6D4AFF] px-3 font-sans text-[13px] font-medium text-white hover:bg-[#6D4AFF]/90"
            asChild
          >
            <Link to="/create">
              <Plus className="h-3.5 w-3.5" />
              Novo roteiro
              <span className="font-mono text-[10px] font-medium opacity-65">⌘N</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1">
        {isPending ? (
          <div className="flex flex-col gap-6 p-5 w-full">
            <Skeleton className="h-20" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-5 text-[#EDEDF2]">
            {/* Header */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="m-0 text-[22px] font-semibold leading-tight tracking-[-0.03em]">
                  {formattedDate}
                </h1>
                <p className="mt-1.5 font-sans text-[13px] text-[#8C8CA0]">
                  Resumo de atividades neste workspace.
                </p>
              </div>
            </div>

            {/* Production Queue */}
            <div className="flex items-stretch overflow-hidden rounded-xl border border-[#1E1E28] bg-[#12121A]">
              <div className="flex flex-1 flex-col gap-1.5 border-r border-[#1E1E28] p-3.5">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#6E6E85]">
                  Ideia
                </span>
                <span className="font-mono text-[22px] font-semibold leading-none">{stats.idea || 0}</span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 border-r border-[#1E1E28] p-3.5">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#6E6E85]">
                  Roteiro
                </span>
                <span className="font-mono text-[22px] font-semibold leading-none">
                  {stats.script || 0}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 border-r border-[#1E1E28] bg-[#FFB84D]/5 p-3.5">
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#FFB84D]">
                  Aprovação
                  <TriangleAlert className="h-[11px] w-[11px]" />
                </span>
                <span className="font-mono text-[22px] font-semibold leading-none text-[#FFB84D]">
                  {stats.approved || 0}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 border-r border-[#1E1E28] p-3.5">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#6E6E85]">
                  Gravação
                </span>
                <span className="font-mono text-[22px] font-semibold leading-none">
                  {stats.recording || 0}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 border-r border-[#1E1E28] p-3.5">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#6E6E85]">
                  Edição
                </span>
                <span className="font-mono text-[22px] font-semibold leading-none">
                  {stats.editing || 0}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#6E6E85]">
                  Publicado
                </span>
                <span className="font-mono text-[22px] font-semibold leading-none text-[#3DDC97]">
                  {stats.published || 0}
                </span>
              </div>
            </div>

            {/* Recent Work */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h2 className="m-0 font-sans text-[14px] font-semibold tracking-[-0.01em]">
                  Trabalho recente
                </h2>
                <Link
                  to="/scripts"
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-[#B9A6FF] hover:underline"
                >
                  ver todos
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#1E1E28] bg-[#12121A]">
                <div className="grid grid-cols-[minmax(0,1fr)_120px_100px] items-center gap-3 border-b border-[#1E1E28] bg-[#0E0E14] px-3.5 py-2.5">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#6E6E85]">
                    Título
                  </span>
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#6E6E85]">
                    Marca
                  </span>
                  <span className="text-right font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#6E6E85]">
                    Estado
                  </span>
                </div>

                {scripts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[#8C8CA0]">Nenhum roteiro recente.</div>
                ) : (
                  scripts.map((script) => (
                    <div
                      key={script.id}
                      className="grid grid-cols-[minmax(0,1fr)_120px_100px] items-center gap-3 border-b border-[#1A1A24] px-3.5 py-[11px] last:border-none"
                    >
                      <Link
                        to={`/scripts/${script.id}`}
                        className="truncate font-sans text-[13px] font-medium hover:text-[#B9A6FF]"
                      >
                        {script.title}
                      </Link>
                      <span className="truncate font-sans text-[12px] text-[#8C8CA0]">
                        {script.brand?.name ?? '—'}
                      </span>
                      <div className="text-right">
                        <span className="inline-flex items-center rounded-[5px] bg-[#1C1C27] px-[7px] py-[3px] font-mono text-[10px] font-medium text-[#8C8CA0]">
                          {script.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
