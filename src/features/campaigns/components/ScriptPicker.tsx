import { useQuery } from '@tanstack/react-query'
import { FileText, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/FormField'
import { listScripts } from '@/features/scripts/api'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useActiveBrand } from '@/features/brands/hooks/useActiveBrand'

interface ScriptPickerProps {
  scriptId: string | null
  onChange: (scriptId: string | null) => void
}

/**
 * Liga o anúncio a um roteiro já escrito.
 *
 * É o motivo de o planejador morar dentro do Scriptly: sem isto seria um quadro
 * de desenho qualquer, e você redigitaria em outro lugar o criativo que já
 * existe aqui.
 */
export function ScriptPicker({ scriptId, onChange }: ScriptPickerProps) {
  const { activeWorkspace } = useActiveWorkspace()
  const { activeBrand } = useActiveBrand()
  const workspaceId = activeWorkspace?.id ?? ''
  const brandId = activeBrand?.id ?? ''

  const { data, isPending } = useQuery({
    queryKey: ['campaign-script-options', workspaceId, brandId],
    // Página grande de propósito: é um seletor, não uma biblioteca paginada.
    queryFn: () => listScripts({ workspaceId, brandId, page: 0, pageSize: 100 }),
    enabled: Boolean(workspaceId && brandId),
  })

  const scripts = data?.items ?? []
  const linked = scripts.find((script) => script.id === scriptId) ?? null

  return (
    <FormField
      label="Roteiro"
      hint="O roteiro que vira o criativo deste anúncio."
    >
      {(props) => (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Select
              value={scriptId ?? ''}
              onValueChange={(value) => onChange(value || null)}
              disabled={isPending || scripts.length === 0}
            >
              <SelectTrigger {...props} className="flex-1">
                <SelectValue
                  placeholder={
                    isPending
                      ? 'Carregando…'
                      : scripts.length === 0
                        ? 'Nenhum roteiro nesta marca'
                        : 'Escolher roteiro'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {scripts.map((script) => (
                  <SelectItem key={script.id} value={script.id}>
                    {script.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {scriptId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0"
                aria-label="Desvincular roteiro"
                onClick={() => onChange(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {linked && (
            <Button asChild variant="outline" size="sm" className="h-9 justify-start">
              {/* Abre em nova aba: o plano fica aberto atrás, que é onde o
                  usuário estava trabalhando. */}
              <Link to={`/scripts/${linked.id}`} target="_blank" rel="noreferrer">
                <FileText className="h-3.5 w-3.5" />
                Abrir “{linked.title}”
              </Link>
            </Button>
          )}
        </div>
      )}
    </FormField>
  )
}
