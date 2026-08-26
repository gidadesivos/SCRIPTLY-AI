import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { History, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createVersion,
  listVersions,
  restoreVersion,
  type ScriptVersion,
} from '@/features/scripts/versions-api'
import { strings } from '@/i18n/pt-BR'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VersionsPanel({ scriptId }: { scriptId: string }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState<ScriptVersion | null>(null)

  const { data: versions = [], isPending } = useQuery({
    queryKey: ['scripts', 'versions', scriptId],
    queryFn: () => listVersions(scriptId),
  })

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['scripts', 'versions', scriptId] })
    queryClient.invalidateQueries({ queryKey: ['scripts', 'detail', scriptId] })
  }

  const create = useMutation({
    mutationFn: () => createVersion(scriptId, 'Versão criada manualmente'),
    onSuccess: (number) => {
      invalidateAll()
      toast.success(`Versão ${number} criada.`)
    },
    onError: () => toast.error(strings.errors.unexpected),
  })

  const restore = useMutation({
    mutationFn: (version: ScriptVersion) => restoreVersion(scriptId, version),
    onSuccess: () => {
      invalidateAll()
      setConfirming(null)
      toast.success('Versão restaurada.')
    },
    onError: () => toast.error(strings.errors.unexpected),
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <History className="h-4 w-4" />
          Versões
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="h-11"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar versão
        </Button>
      </div>

      {isPending && <p className="text-xs text-muted-foreground">{strings.common.loading}</p>}

      {!isPending && versions.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Nenhuma versão ainda. Crie uma antes de mudanças grandes.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {versions.map((version) => (
          <li key={version.id}>
            <Card className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Versão {version.version_number}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(version.created_at)}
                  {version.change_description ? ` · ${version.change_description}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {((version.snapshot as any)?.scenes?.length || 0)} cenas
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 shrink-0"
                onClick={() => setConfirming(version)}
                aria-label={`Restaurar versão ${version.version_number}`}
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar
              </Button>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={Boolean(confirming)} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar versão {confirming?.version_number}?</DialogTitle>
            <DialogDescription>
              O conteúdo atual do roteiro será substituído. Antes de substituir, salvamos o estado
              de agora como uma nova versão — então dá para voltar atrás.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              className="h-11"
              onClick={() => setConfirming(null)}
              disabled={restore.isPending}
            >
              {strings.common.cancel}
            </Button>
            <Button
              className="h-11"
              onClick={() => confirming && restore.mutate(confirming)}
              disabled={restore.isPending}
            >
              {restore.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
