import { Check, FolderInput, Inbox, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { FolderNode } from '@/features/scripts/folders-api'

/**
 * Menu de mover o roteiro para uma pasta.
 *
 * Aparece achatado, com recuo indicando o nível, e não como submenu por
 * profundidade: submenu aninhado obriga a percorrer a hierarquia inteira só
 * para chegar numa pasta de terceiro nível.
 */
export function MoverParaPasta({
  tree,
  atual,
  disabled,
  onMover,
}: {
  tree: FolderNode[]
  atual: string | null
  disabled: boolean
  onMover: (folderId: string | null) => void
}) {
  const achatar = (nodes: FolderNode[], nivel = 0): Array<{ node: FolderNode; nivel: number }> =>
    nodes.flatMap((n) => [{ node: n, nivel }, ...achatar(n.children, nivel + 1)])

  const opcoes = achatar(tree)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={disabled}
          aria-label="Mover para pasta"
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#5E5E75] opacity-0 transition-opacity hover:bg-[#23232F] hover:text-[#EDEDF2] group-hover:opacity-100 data-[state=open]:opacity-100 disabled:cursor-not-allowed"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
          <FolderInput className="h-3.5 w-3.5" />
          Mover para
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem disabled={atual === null} onSelect={() => onMover(null)}>
          <Inbox className="h-3.5 w-3.5" />
          Sem pasta
          {atual === null && <Check className="ml-auto h-3.5 w-3.5" />}
        </DropdownMenuItem>

        {opcoes.length === 0 ? (
          <p className="px-2 py-2 text-[11px] text-muted-foreground">
            Nenhuma pasta criada ainda.
          </p>
        ) : (
          opcoes.map(({ node, nivel }) => (
            <DropdownMenuItem
              key={node.id}
              disabled={atual === node.id}
              onSelect={() => onMover(node.id)}
              style={{ paddingLeft: 8 + nivel * 12 }}
            >
              <span className={cn('truncate', atual === node.id && 'font-medium')}>{node.name}</span>
              {atual === node.id && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
