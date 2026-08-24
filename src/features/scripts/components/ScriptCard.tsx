import { Link } from 'react-router-dom'
import { Archive, Clock, Gauge, MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { labelFor, PLATFORMS, SCRIPT_STATUSES } from '@/config/options'
import type { ScriptWithBrand } from '@/features/scripts/api'
import { cn } from '@/lib/utils'

interface ScriptCardProps {
  script: ScriptWithBrand
  canArchive: boolean
  canDelete: boolean
  onArchive: (script: ScriptWithBrand) => void
  onDelete: (script: ScriptWithBrand) => void
}

/**
 * Card da biblioteca.
 *
 * O card inteiro era um <Link>. Para ganhar um menu de ações, o botão precisou
 * sair de dentro dele: botão dentro de link é HTML inválido, o clique vaza para
 * a navegação e o leitor de tela anuncia os dois como uma coisa só. Agora o
 * link cobre o conteúdo e o menu é irmão, posicionado por cima.
 */
export function ScriptCard({
  script,
  canArchive,
  canDelete,
  onArchive,
  onDelete,
}: ScriptCardProps) {
  const isArchived = script.status === 'arquivado'
  const showArchive = canArchive && !isArchived
  // Um viewer não arquiva nem exclui: renderizar o botão abriria um menu vazio.
  const hasActions = showArchive || canDelete

  return (
    <Card className="relative h-full transition-colors hover:border-primary/40">
      <Link to={`/scripts/${script.id}`} className="flex h-full flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium leading-tight">{script.title}</span>
          {/* Espaço reservado à direita para o menu, que fica por cima. */}
          <span
            className={cn(
              'shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground',
              hasActions && 'mr-8',
            )}
          >
            {labelFor(SCRIPT_STATUSES, script.status)}
          </span>
        </div>

        {script.hook_text && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{script.hook_text}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground">
          {script.brand && <span>{script.brand.name}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {script.duration_seconds}s
          </span>
          <span>{labelFor(PLATFORMS, script.platform)}</span>
          {script.hook_score !== null && (
            <span className="inline-flex items-center gap-1 text-info">
              <Gauge className="h-3 w-3" />
              {script.hook_score}
            </span>
          )}
        </div>
      </Link>

      {hasActions && (
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                aria-label={`Ações de ${script.title}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {showArchive && (
                <DropdownMenuItem onSelect={() => onArchive(script)}>
                  <Archive className="h-4 w-4" />
                  Arquivar
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onSelect={() => onDelete(script)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Card>
  )
}
