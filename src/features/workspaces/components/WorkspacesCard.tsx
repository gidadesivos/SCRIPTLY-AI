import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { canDeleteWorkspace, canRenameWorkspace } from '@/lib/permissions'
import { countWorkspaceContents } from '@/features/workspaces/api'
import {
  useDeleteWorkspace,
  useRenameWorkspace,
  useWorkspaces,
} from '@/features/workspaces/hooks/useWorkspaces'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { CreateWorkspaceForm } from '@/features/workspaces/components/CreateWorkspaceForm'
import { strings } from '@/i18n/pt-BR'
import type { Workspace } from '@/features/workspaces/types'

const t = strings.workspace

/** Gerenciar workspaces: listar, criar, renomear e apagar. */
export function WorkspacesCard() {
  const { data: workspaces = [], isPending } = useWorkspaces()
  const { activeWorkspace, setActiveWorkspaceId } = useActiveWorkspace()
  const [criando, setCriando] = useState(false)
  const [apagando, setApagando] = useState<Workspace | null>(null)

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-sans text-[16px] font-semibold">{t.manageTitle}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{t.manageDescription}</p>
        </div>
        <Button size="sm" onClick={() => setCriando(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          {t.newWorkspace}
        </Button>
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {strings.common.loading}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {workspaces.map((workspace) => (
            <LinhaWorkspace
              key={workspace.id}
              workspace={workspace}
              isActive={workspace.id === activeWorkspace?.id}
              onActivate={() => setActiveWorkspaceId(workspace.id)}
              onDelete={() => setApagando(workspace)}
            />
          ))}
        </ul>
      )}

      <Dialog open={criando} onOpenChange={setCriando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.newWorkspace}</DialogTitle>
          </DialogHeader>
          <CreateWorkspaceForm onCreated={() => setCriando(false)} />
        </DialogContent>
      </Dialog>

      {apagando && (
        <DialogoApagar
          workspace={apagando}
          totalDeWorkspaces={workspaces.length}
          onClose={() => setApagando(null)}
        />
      )}
    </Card>
  )
}

function LinhaWorkspace({
  workspace,
  isActive,
  onActivate,
  onDelete,
}: {
  workspace: Workspace
  isActive: boolean
  onActivate: () => void
  onDelete: () => void
}) {
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(workspace.name)
  const rename = useRenameWorkspace()

  const podeRenomear = canRenameWorkspace(workspace.role)
  const podeApagar = canDeleteWorkspace(workspace.role)

  function salvar() {
    const limpo = nome.trim()
    if (!limpo || limpo === workspace.name) {
      setEditando(false)
      setNome(workspace.name)
      return
    }
    rename.mutate(
      { id: workspace.id, name: limpo },
      {
        onSuccess: () => {
          setEditando(false)
          toast.success(t.renamed)
        },
        onError: (error) => {
          // Volta ao nome antigo: deixar o texto novo na tela depois de falhar
          // faria parecer que salvou.
          setNome(workspace.name)
          setEditando(false)
          toast.error(error instanceof Error ? error.message : strings.errors.unexpected)
        },
      },
    )
  }

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border p-3',
        isActive ? 'border-primary/40 bg-primary/5' : 'border-border',
      )}
    >
      {editando ? (
        <>
          <Input
            autoFocus
            value={nome}
            maxLength={60}
            className="h-9 min-w-0 flex-1"
            aria-label={t.renameLabel}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') salvar()
              if (e.key === 'Escape') {
                setNome(workspace.name)
                setEditando(false)
              }
            }}
          />
          <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={strings.common.save} onClick={salvar} disabled={rename.isPending}>
            {rename.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            aria-label={strings.common.cancel}
            onClick={() => {
              setNome(workspace.name)
              setEditando(false)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{workspace.name}</p>
            <p className="text-xs text-muted-foreground">
              {workspace.slug} · {t.roleLabel}: {workspace.role}
            </p>
          </div>

          {isActive ? (
            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">{t.active}</span>
          ) : (
            <Button size="sm" variant="ghost" onClick={onActivate}>
              {t.activate}
            </Button>
          )}

          {/* Botão some para quem não pode: a RSL barraria, mas um update
              barrado volta como sucesso com zero linhas — a tela mentiria. */}
          {podeRenomear && (
            <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`${t.renameLabel}: ${workspace.name}`} onClick={() => setEditando(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {podeApagar && (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-destructive hover:text-destructive"
              aria-label={`${strings.common.delete}: ${workspace.name}`}
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </>
      )}
    </li>
  )
}

/**
 * Apagar workspace é a ação mais destrutiva do app: cascateia para 13 tabelas.
 * Por isso o diálogo mostra o que será perdido, contado no banco, e exige
 * digitar o nome — um "tem certeza?" é clicado no automático.
 */
function DialogoApagar({
  workspace,
  totalDeWorkspaces,
  onClose,
}: {
  workspace: Workspace
  totalDeWorkspaces: number
  onClose: () => void
}) {
  const [confirmacao, setConfirmacao] = useState('')
  const remove = useDeleteWorkspace()

  const conteudo = useQuery({
    queryKey: ['workspace-contents', workspace.id],
    queryFn: () => countWorkspaceContents(workspace.id),
  })

  const ehOUltimo = totalDeWorkspaces <= 1
  const confirmado = confirmacao.trim() === workspace.name

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.deleteTitle}</DialogTitle>
          <DialogDescription>{t.deleteWarning}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          {conteudo.isPending ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t.countingContents}
            </span>
          ) : (
            <ul className="flex flex-col gap-0.5">
              <li>{conteudo.data?.brands ?? 0} {strings.brands.title.toLowerCase()}</li>
              <li>{conteudo.data?.products ?? 0} {strings.products.title.toLowerCase()}</li>
              <li>{conteudo.data?.scripts ?? 0} {strings.scripts.title.toLowerCase()}</li>
              <li>{conteudo.data?.plans ?? 0} {t.plansLabel}</li>
            </ul>
          )}
        </div>

        {ehOUltimo && (
          <p className="text-sm text-warning">{t.deleteLastWarning}</p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmar-nome" className="text-sm text-muted-foreground">
            {t.typeNameToConfirm} <strong className="text-foreground">{workspace.name}</strong>
          </label>
          <Input
            id="confirmar-nome"
            value={confirmacao}
            autoComplete="off"
            onChange={(e) => setConfirmacao(e.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={remove.isPending}>
            {strings.common.cancel}
          </Button>
          <Button
            variant="destructive"
            disabled={!confirmado || remove.isPending}
            onClick={() =>
              remove.mutate(workspace.id, {
                onSuccess: () => {
                  toast.success(t.deleted)
                  onClose()
                },
                onError: (error) =>
                  toast.error(error instanceof Error ? error.message : strings.errors.unexpected),
              })
            }
          >
            {remove.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t.deleting}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" aria-hidden />
                {strings.common.delete}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
