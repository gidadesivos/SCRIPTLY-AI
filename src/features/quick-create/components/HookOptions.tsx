import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { strings } from '@/i18n/pt-BR'

const t = strings.quickCreate

/**
 * Trocar a abertura sem regerar o roteiro inteiro.
 *
 * Regerar tudo por causa do hook desperdiçaria um roteiro que o usuário já
 * aprovou — e devolveria cenas diferentes das que ele acabou de ler.
 */
export function HookOptions({
  open, onOpenChange, hooks, isLoading, onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  hooks: string[]
  isLoading: boolean
  onChoose: (hook: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.chooseHook}</DialogTitle>
          <DialogDescription>
            A abertura escolhida substitui o hook e a locução da primeira cena.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#8C8CA0]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t.generating}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {hooks.map((hook, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => onChoose(hook)}
                  className="w-full rounded-lg border border-[#1E1E28] bg-[#14141C] p-3 text-left text-[13px] leading-relaxed text-[#EDEDF2] transition-colors hover:border-[#6D4AFF]/60 hover:bg-[#6D4AFF]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4AFF]"
                >
                  {hook}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
