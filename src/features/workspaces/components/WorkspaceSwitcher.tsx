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

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useActiveWorkspace()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            aria-label={strings.workspace.switchWorkspace}
          >
            <span className="truncate">{activeWorkspace?.name ?? strings.workspace.noWorkspaces}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
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
