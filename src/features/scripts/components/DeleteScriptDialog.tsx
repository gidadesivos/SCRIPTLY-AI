import { useQuery } from '@tanstack/react-query'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getScriptImpact } from '@/features/scripts/api'

interface DeleteScriptDialogProps {
  scriptId: string | null
  title: string
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Confirmação de exclusão que diz o que se perde, com números do banco.
 *
 * "Tem certeza?" não informa nada — o usuário clica em sim por reflexo. Saber
 * que vão junto 6 cenas e 3 versões salvas é o que permite decidir de verdade.
 */
export function DeleteScriptDialog({
  scriptId,
  title,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteScriptDialogProps) {
  const { data: impact, isLoading } = useQuery({
    queryKey: ['script-impact', scriptId],
    queryFn: () => getScriptImpact(scriptId as string),
    enabled: scriptId !== null,
    // Contagem de um instante: reabrir o diálogo tem que reler, senão mostraria
    // números de antes da última edição.
    staleTime: 0,
  })

  return (
    <Dialog open={scriptId !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir “{title}”?</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-2">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando o que será apagado…
                </span>
              ) : (
                <>
                  <span>{describeLoss(impact)}</span>
                  {impact && impact.variations > 0 && (
                    <span>
                      {impact.variations === 1
                        ? '1 roteiro que é variação deste continua na biblioteca, mas perde o vínculo com ele.'
                        : `${impact.variations} roteiros que são variações deste continuam na biblioteca, mas perdem o vínculo com ele.`}
                    </span>
                  )}
                  <span className="font-medium text-foreground">Não dá para desfazer.</span>
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" className="h-11" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="h-11"
            onClick={onConfirm}
            // Esperar a contagem evita o caso em que o usuário confirma sem ter
            // visto o que ia perder.
            disabled={isDeleting || isLoading}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function describeLoss(impact: { scenes: number; versions: number } | undefined): string {
  if (!impact) return 'O roteiro será apagado.'

  const parts = ['o roteiro']
  if (impact.scenes > 0) {
    parts.push(impact.scenes === 1 ? '1 cena' : `${impact.scenes} cenas`)
  }
  if (impact.versions > 0) {
    parts.push(impact.versions === 1 ? '1 versão salva' : `${impact.versions} versões salvas`)
  }

  return `Isso apaga ${joinPt(parts)}.`
}

/** "a, b e c" — vírgulas até o penúltimo, "e" antes do último. */
function joinPt(parts: string[]): string {
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
}
