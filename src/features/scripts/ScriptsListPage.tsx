import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, FileText, Plus, Search, ChevronDown } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { listScripts, SCRIPTS_PAGE_SIZE } from '@/features/scripts/api'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { dbErrorMessage } from '@/lib/db-errors'
import { strings } from '@/i18n/pt-BR'
import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { SCRIPT_STATUSES, labelFor } from '@/config/options'
import { canDeleteScripts, canEditScripts } from '@/lib/permissions'
import { NotAllowedError } from '@/features/scripts/api'
import {
  buildTree,
  countByFolder,
  createFolder,
  deleteFolder,
  descendantIds,
  listFolders,
  moveScriptToFolder,
  renameFolder,
  type FolderNode,
} from '@/features/scripts/folders-api'
import { FolderTree, type FolderSelection } from '@/features/scripts/components/FolderTree'
import { MoverParaPasta } from '@/features/scripts/components/MoverParaPasta'
import { FolderDeleteDialog } from '@/features/scripts/components/FolderDeleteDialog'

type Selecao = FolderSelection

export function ScriptsListPage() {
  const { activeWorkspace } = useActiveWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''
  const queryClient = useQueryClient()
  const canEditFolders = canEditScripts(activeWorkspace?.role)
  const canDeleteFolders = canDeleteScripts(activeWorkspace?.role)

  const [pasta, setPasta] = useState<Selecao>('todos')
  const [aExcluir, setAExcluir] = useState<FolderNode | null>(null)

  const foldersQuery = useQuery({
    queryKey: ['script-folders', workspaceId],
    queryFn: () => listFolders(workspaceId),
    enabled: Boolean(workspaceId),
  })

  const countsQuery = useQuery({
    queryKey: ['script-folder-counts', workspaceId],
    queryFn: () => countByFolder(workspaceId),
    enabled: Boolean(workspaceId),
  })

  const tree = useMemo(
    () => buildTree(foldersQuery.data ?? [], countsQuery.data ?? {}),
    [foldersQuery.data, countsQuery.data],
  )

  /*
   * Escolher uma pasta traz também o que está nas subpastas.
   *
   * Ver uma pasta "vazia" com 12 roteiros guardados um nível abaixo seria
   * confuso — no explorador de arquivos a pasta pai também não esconde o que
   * está dentro quando você procura.
   */
  const idsDaPasta = useMemo(() => {
    if (pasta === 'todos') return 'all' as const
    if (pasta === 'raiz') return null
    const achar = (nodes: FolderNode[]): FolderNode | undefined => {
      for (const n of nodes) {
        if (n.id === pasta) return n
        const dentro = achar(n.children)
        if (dentro) return dentro
      }
      return undefined
    }
    const node = achar(tree)
    return node ? descendantIds(node) : []
  }, [pasta, tree])

  function recarregarPastas() {
    queryClient.invalidateQueries({ queryKey: ['script-folders', workspaceId] })
    queryClient.invalidateQueries({ queryKey: ['script-folder-counts', workspaceId] })
  }

  function reportar(erro: unknown) {
    toast.error(erro instanceof NotAllowedError ? erro.message : strings.errors.unexpected)
  }

  const criarPasta = useMutation({
    mutationFn: (input: { parentId: string | null; name: string }) =>
      createFolder({ workspaceId, ...input }),
    onSuccess: recarregarPastas,
    onError: reportar,
  })

  const renomearPasta = useMutation({
    mutationFn: (input: { id: string; name: string }) => renameFolder(input.id, input.name),
    onSuccess: recarregarPastas,
    onError: reportar,
  })

  const excluirPasta = useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      recarregarPastas()
      queryClient.invalidateQueries({ queryKey: ['scripts', 'list'] })
      setPasta('todos')
      setAExcluir(null)
      toast.success('Pasta excluída. Os roteiros voltaram para "Sem pasta".')
    },
    onError: (erro) => {
      setAExcluir(null)
      reportar(erro)
    },
  })

  const moverRoteiro = useMutation({
    mutationFn: (input: { scriptId: string; folderId: string | null }) =>
      moveScriptToFolder(input.scriptId, input.folderId),
    onSuccess: () => {
      recarregarPastas()
      queryClient.invalidateQueries({ queryKey: ['scripts', 'list'] })
      toast.success('Roteiro movido.')
    },
    onError: reportar,
  })

  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') ?? 'all')
  const [page, setPage] = useState(0)
  const debouncedSearch = useDebouncedValue(search, 300)

  const filters = {
    workspaceId,
    search: debouncedSearch,
    status,
    brandId: 'all',
    platform: 'all',
    folderIds: idsDaPasta,
    page,
  }

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['scripts', 'list', filters],
    queryFn: () => listScripts(filters),
    enabled: Boolean(workspaceId),
  })

  const hasFilters = debouncedSearch.trim() !== '' || status !== 'all' || pasta !== 'todos'

  function resetFilters() {
    setSearch('')
    setStatus('all')
    setPasta('todos')
    setSearchParams({}, { replace: true })
    setPage(0)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / SCRIPTS_PAGE_SIZE)) : 1

  return (
    <div className="flex h-full bg-[#0B0B10] text-[#EDEDF2]">
      <FolderTree
        tree={tree}
        counts={countsQuery.data ?? {}}
        total={Object.values(countsQuery.data ?? {}).reduce((a, b) => a + b, 0)}
        selected={pasta}
        onSelect={(s) => {
          setPasta(s)
          setPage(0)
        }}
        canEdit={canEditFolders}
        canDelete={canDeleteFolders}
        onCreate={(parentId, name) => criarPasta.mutate({ parentId, name })}
        onRename={(id, name) => renomearPasta.mutate({ id, name })}
        onDelete={setAExcluir}
      />

      <div className="flex min-w-0 flex-1 flex-col">
      {/* Topbar */}
      <div className="flex h-[52px] shrink-0 items-center gap-[12px] border-b border-[#1E1E28] bg-[#0E0E14] px-4">
        <div className="flex h-8 max-w-[360px] flex-1 items-center gap-2 rounded-lg border border-[#23232F] bg-[#14141C] px-2.5">
          <Search className="h-3.5 w-3.5 text-[#5E5E75]" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Buscar roteiros…"
            className="h-full flex-1 border-0 bg-transparent px-0 font-sans text-[13px] text-[#EDEDF2] placeholder:text-[#5E5E75] focus-visible:ring-0"
          />
          <span className="rounded-[4px] bg-[#1C1C27] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#8C8CA0]">
            ⌘K
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <Button
            className="h-8 gap-1.5 bg-[#6D4AFF] px-3 font-sans text-[13px] font-medium text-white hover:bg-[#6D4AFF]/90"
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

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="m-0 font-sans text-[24px] font-semibold tracking-[-0.03em] leading-tight text-[#EDEDF2]">
              Roteiros criados no workspace
            </h1>
            <p className="mt-1.5 font-sans text-[14px] text-[#8C8CA0]">
              {data?.total ?? 0} {data?.total === 1 ? 'roteiro organizado' : 'roteiros organizados'} por estado de produção.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#23232F] bg-[#14141C] px-2 py-1 font-sans text-[11px] font-medium text-[#EDEDF2] transition-colors hover:bg-[#1E1E28]">
              Marca <ChevronDown className="h-3 w-3 text-[#6E6E85]" />
            </span>
            <span className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#23232F] bg-[#14141C] px-2 py-1 font-sans text-[11px] font-medium text-[#EDEDF2] transition-colors hover:bg-[#1E1E28]">
              Estado <ChevronDown className="h-3 w-3 text-[#6E6E85]" />
            </span>
            <span className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#23232F] bg-[#14141C] px-2 py-1 font-sans text-[11px] font-medium text-[#EDEDF2] transition-colors hover:bg-[#1E1E28]">
              Data <ChevronDown className="h-3 w-3 text-[#6E6E85]" />
            </span>
          </div>
        </div>

        {/* Tabs Filter */}
        <div className="mb-4 flex items-center gap-4 border-b border-[#1E1E28]">
          {/*
            Vem de SCRIPT_STATUSES, a mesma fonte que o editor usa.
            Estava escrito à mão em inglês — 'idea', 'script', 'approved' —
            enquanto o enum do banco é 'ideia', 'roteiro', 'aprovado'. Nenhuma
            aba casava, então TODA aba de status devolvia zero resultados, e
            'pronto' nem tinha aba.
          */}
          {[{ value: 'all', label: 'Todos' }, ...SCRIPT_STATUSES].map((tab) => {
            const isActive = status === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setStatus(tab.value)
                  setSearchParams(tab.value === 'all' ? {} : { status: tab.value }, { replace: true })
                  setPage(0)
                }}
                className={`relative pb-3 font-sans text-[13px] font-medium transition-colors ${
                  isActive ? 'text-[#B9A6FF]' : 'text-[#8C8CA0] hover:text-[#EDEDF2]'
                }`}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#6D4AFF]" />
                )}
              </button>
            )
          })}
        </div>

        {/* Table Content */}
        {isPending ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[60px] w-full rounded-xl bg-[#14141C]" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title={strings.errors.unexpected}
            description={dbErrorMessage(error)}
            action={
              <Button variant="outline" onClick={() => refetch()}>
                {strings.common.tryAgain}
              </Button>
            }
          />
        ) : data?.items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={hasFilters ? strings.scripts.noResultsTitle : strings.scripts.emptyTitle}
            description={hasFilters ? strings.scripts.noResultsDescription : strings.scripts.emptyDescription}
            action={
              hasFilters ? (
                <Button variant="outline" onClick={resetFilters}>
                  {strings.common.clearFilters}
                </Button>
              ) : (
                <Button asChild className="h-11">
                  <Link to="/create">
                    <Plus className="mr-2 h-4 w-4" />
                    {strings.create.title}
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="flex flex-col">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_minmax(0,1fr)_120px_100px_100px_40px] items-center gap-4 border-b border-[#1E1E28] pb-3 text-left">
              <div className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border border-[#3A3A4A]" />
              <span className="font-sans text-[11px] font-medium text-[#8C8CA0]">Título e marca</span>
              <span className="font-sans text-[11px] font-medium text-[#8C8CA0]">Estado</span>
              <span className="font-sans text-[11px] font-medium text-[#8C8CA0]">Plataforma</span>
              <span className="font-sans text-[11px] font-medium text-[#8C8CA0]">Duração</span>
              <span />
            </div>

            {/* Table Rows */}
            <div className="flex flex-col">
              {data?.items.map((script) => (
                <div
                  key={script.id}
                  className="group grid grid-cols-[auto_minmax(0,1fr)_120px_100px_100px_40px] items-center gap-4 border-b border-[#1E1E28] py-3 transition-colors hover:bg-[#14141C]"
                >
                  <div className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border border-[#3A3A4A]" />
                  <div className="flex min-w-0 flex-col">
                    <Link
                      to={`/scripts/${script.id}`}
                      className="truncate font-sans text-[13px] font-medium text-[#EDEDF2] hover:text-[#B9A6FF]"
                    >
                      {script.title}
                    </Link>
                    <span className="truncate font-sans text-[11px] text-[#8C8CA0]">
                      {script.brand?.name ?? '—'}
                    </span>
                  </div>
                  <div>
                    <span className="inline-flex rounded-[5px] bg-[#1C1C27] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.05em] text-[#8C8CA0]">
                      {labelFor(SCRIPT_STATUSES, script.status)}
                    </span>
                  </div>
                  <span className="font-sans text-[12px] text-[#8C8CA0]">
                    {script.platform === 'instagram_reels' ? 'Reels' : script.platform === 'tiktok' ? 'TikTok' : script.platform === 'youtube_shorts' ? 'Shorts' : script.platform}
                  </span>
                  <span className="font-sans text-[12px] text-[#8C8CA0]">{script.duration_seconds}s</span>
                  <MoverParaPasta
                    tree={tree}
                    atual={script.folder_id ?? null}
                    disabled={!canEditFolders || moverRoteiro.isPending}
                    onMover={(folderId) => moverRoteiro.mutate({ scriptId: script.id, folderId })}
                  />
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <p className="font-sans text-[12px] text-[#5E5E75]">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-[#23232F] bg-[#14141C] text-[#8C8CA0] hover:text-[#EDEDF2]"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-[#23232F] bg-[#14141C] text-[#8C8CA0] hover:text-[#EDEDF2]"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      <FolderDeleteDialog
        folder={aExcluir}
        isDeleting={excluirPasta.isPending}
        onCancel={() => setAExcluir(null)}
        onConfirm={() => aExcluir && excluirPasta.mutate(aExcluir.id)}
      />
    </div>
  )
}
