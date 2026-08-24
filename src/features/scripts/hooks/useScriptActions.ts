import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  NotAllowedError,
  archiveScript,
  deleteScript,
  updateScriptStatus,
  type Script,
} from '@/features/scripts/api'
import { strings } from '@/i18n/pt-BR'

/**
 * Invalida lista e dashboard. O detalhe do roteiro não entra: depois de
 * excluir, revalidar o detalhe só produziria um 404 numa tela que o usuário
 * já deixou.
 */
function useInvalidateScriptLists() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['scripts', 'list'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

function reportError(error: unknown) {
  // NotAllowedError já vem com o motivo real; o resto vira mensagem genérica
  // para não vazar detalhe de banco na tela.
  toast.error(error instanceof NotAllowedError ? error.message : strings.errors.unexpected)
}

export function useDeleteScript() {
  const invalidate = useInvalidateScriptLists()

  return useMutation({
    mutationFn: (id: string) => deleteScript(id),
    onSuccess: () => {
      invalidate()
      toast.success('Roteiro excluído.')
    },
    onError: reportError,
  })
}

export function useArchiveScript() {
  const invalidate = useInvalidateScriptLists()

  return useMutation({
    mutationFn: (id: string) => archiveScript(id),
    onSuccess: (previousStatus, id) => {
      invalidate()
      // Arquivar é reversível, então o desfazer fica no próprio toast em vez de
      // exigir que o usuário ache o roteiro na lista de arquivados e volte o
      // status na mão.
      toast.success('Roteiro arquivado.', {
        action: {
          label: 'Desfazer',
          onClick: () => {
            updateScriptStatus(id, previousStatus as Script['status'])
              .then(() => {
                invalidate()
                toast.success('Roteiro restaurado.')
              })
              .catch(reportError)
          },
        },
      })
    },
    onError: reportError,
  })
}
