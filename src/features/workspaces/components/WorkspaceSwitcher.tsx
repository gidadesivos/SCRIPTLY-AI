import { useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { CreateWorkspaceForm } from './CreateWorkspaceForm'
import { strings } from '@/i18n/pt-BR'
import { initialsOf } from '@/components/initials'

/**
 * compact: gatilho quadrado com iniciais, para o rail de 72px do desktop.
 *
 * É variante do MESMO componente, e não um seletor paralelo: a lista, a
 * marcação do ativo e o diálogo de criar são os mesmos. Duplicar isso faria
 * os dois divergirem na primeira mudança.
 */
export function WorkspaceSwitcher({ compact = false }: { compact?: boolean } = {}) {
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useActiveWorkspace()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {compact ? (
            <button
              type="button"
              aria-label={`${strings.workspace.switchWorkspace}: ${activeWorkspace?.name ?? strings.workspace.noWorkspaces}`}
              title={activeWorkspace?.name ?? strings.workspace.noWorkspaces}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#2A2A38] bg-[#14141C] font-mono text-[11px] font-semibold leading-none text-[#B9A6FF] transition-colors hover:border-[#6D4AFF]/60 hover:bg-[#6D4AFF]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4AFF]"
            >
              {initialsOf(activeWorkspace?.name)}
            </button>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-between"
              aria-label={strings.workspace.switchWorkspace}
            >
              <span className="truncate">{activeWorkspace?.name ?? strings.workspace.noWorkspaces}</span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>{strings.workspace.switchWorkspace}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onSelect={() => setActiveWorkspaceId(workspace.id)}
              className="justify-between"
            >
              <span className="truncate">{workspace.name}</span>
              {workspace.id === activeWorkspace?.id && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {strings.workspace.newWorkspace}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{strings.workspace.newWorkspace}</DialogTitle>
          </DialogHeader>
          <CreateWorkspaceForm onCreated={() => setIsCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
