import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { FolderNode } from '@/features/scripts/folders-api'
import { descendantIds } from '@/features/scripts/folders-api'

/**
 * Confirmação de exclusão de pasta.
 *
 * Diz exatamente o que acontece, porque a pergunta que passa pela cabeça de
 * quem clica é "vou perder meus roteiros?". A resposta é não — e ela precisa
 * estar escrita, não subentendida.
 */
export function FolderDeleteDialog({
  folder,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  folder: FolderNode | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!folder) return null

  const subpastas = descendantIds(folder).length - 1
  const roteiros = contarRoteiros(folder)

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir "{folder.name}"?</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-3 pt-1">
              {subpastas > 0 && (
                <span className="flex items-start gap-2 text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {subpastas === 1
                    ? 'A subpasta dentro dela também será excluída.'
                    : `As ${subpastas} subpastas dentro dela também serão excluídas.`}
                </span>
              )}
              <span>
                {roteiros === 0
                  ? 'Nenhum roteiro está guardado aqui.'
                  : roteiros === 1
                    ? 'O roteiro guardado aqui NÃO será excluído — ele volta para "Sem pasta".'
                    : `Os ${roteiros} roteiros guardados aqui NÃO serão excluídos — eles voltam para "Sem pasta".`}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Excluindo…' : 'Excluir pasta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Roteiros da pasta e de todas as subpastas. */
function contarRoteiros(node: FolderNode): number {
  return node.count + node.children.reduce((soma, filho) => soma + contarRoteiros(filho), 0)
}
