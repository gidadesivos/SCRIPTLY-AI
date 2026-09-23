import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LifeBuoy, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/config/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Logo } from '@/components/Logo'
import { WorkspaceSwitcher } from '@/features/workspaces/components/WorkspaceSwitcher'
import { BrandSwitcher } from '@/features/brands/components/BrandSwitcher'
import { ModelSelector } from '@/components/ModelSelector'

const STORAGE_KEY = 'scriptly:rail-expandido'

function initialsFrom(name: string | null | undefined, email: string | null | undefined) {
  const source = name || email || '?'
  return source.slice(0, 2).toUpperCase()
}

/**
 * Preferência do usuário, guardada entre sessões.
 *
 * Contraído por padrão: é o estado que dá mais espaço ao conteúdo, e quem
 * prefere os nomes escolhe uma vez e não escolhe de novo.
 */
function carregarPreferencia(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function AppRail({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? ''
  const initials = initialsFrom(displayName, user?.email)

  const [expandido, setExpandido] = useState(carregarPreferencia)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, expandido ? '1' : '0')
    } catch {
      // Modo privado ou cota cheia: perder a preferência é aceitável, derrubar
      // a navegação inteira por causa dela não é.
    }
  }, [expandido])

  const alternar = useCallback(() => setExpandido((v) => !v), [])

  return (
    /*
     * h-full + a <aside> sticky do AppShell: o rail ocupa a altura da janela e
     * não rola junto com o conteúdo. Antes, numa tela baixa, o seletor de
     * modelo e o avatar ficavam abaixo da dobra e era preciso rolar a página
     * inteira para alcançá-los.
     *
     * Só a LISTA de abas rola, se não couber. Topo e rodapé ficam presos.
     */
    <div
      className={cn(
        'flex h-full flex-col border-r border-border bg-[#0A0A0E] py-3 font-sans text-[#EDEDF2] transition-[width] duration-200',
        expandido ? 'w-[216px] px-3' : 'w-[72px] items-center',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center',
          expandido ? 'w-full justify-between pl-1' : 'flex-col gap-2',
        )}
      >
        {expandido ? <Logo size={24} /> : <Logo iconOnly size={30} />}
        <button
          type="button"
          onClick={alternar}
          aria-expanded={expandido}
          aria-label={expandido ? 'Recolher menu' : 'Expandir menu'}
          title={expandido ? 'Recolher menu' : 'Expandir menu'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#6E6E85] transition-colors hover:bg-[#6D4AFF]/10 hover:text-[#B9A6FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4AFF]"
        >
          {expandido ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
      </div>

      <div
        className={cn(
          'mt-3 flex shrink-0 flex-col gap-1.5',
          expandido ? 'w-full' : 'items-center',
        )}
      >
        <WorkspaceSwitcher compact={!expandido} />
        <BrandSwitcher compact={!expandido} />
      </div>

      <div className={cn('my-2.5 h-px shrink-0 bg-[#1E1E28]', expandido ? 'w-full' : 'w-8')} />

      <nav
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-[2px] overflow-y-auto',
          expandido ? 'w-full' : 'items-center',
        )}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            // Contraído não mostra texto: o nome vai no title, senão o ícone
            // sozinho vira adivinhação.
            title={expandido ? undefined : (item.fullLabel ?? item.label)}
            className={({ isActive }) =>
              cn(
                'relative flex shrink-0 rounded-[10px] transition-colors',
                expandido
                  ? 'w-full items-center gap-2.5 px-2.5 py-2'
                  : 'w-[60px] flex-col items-center justify-center py-2.5',
                isActive
                  ? 'bg-[#6D4AFF]/15 text-[#B9A6FF]'
                  : 'text-[#6E6E85] hover:bg-[#6D4AFF]/10 hover:text-[#B9A6FF]',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className={cn(
                      'absolute rounded-sm bg-[#6D4AFF]',
                      expandido ? '-left-3 top-2 h-5 w-[2px]' : '-left-1.5 top-3 h-5 w-[2px]',
                    )}
                  />
                )}
                <span className="relative flex shrink-0">
                  <item.icon className="h-[17px] w-[17px]" />
                  {item.badge && (
                    <span
                      className="absolute -right-1 -top-0.5 h-[5px] w-[5px] rounded-full bg-[#6D4AFF] ring-2 ring-[#0A0A0E]"
                      aria-hidden
                    />
                  )}
                </span>
                {expandido && (
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium capitalize">
                    {item.fullLabel ?? item.label}
                  </span>
                )}
                {item.badge &&
                  (expandido ? (
                    // Expandido cabe o selo de verdade; contraído há só o
                    // pontinho no ícone, e o nome completo vai para o leitor
                    // de tela — "rápido" sozinho não diz que é experimental.
                    <span className="shrink-0 rounded-full border border-[#3A2E63] bg-[#241E3D] px-1.5 py-0.5 font-mono text-[9px] font-semibold leading-none tracking-wider text-[#B9A6FF]">
                      {item.badge}
                    </span>
                  ) : (
                    <span className="sr-only">
                      {item.fullLabel ?? item.label} {item.badge}
                    </span>
                  ))}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div
        className={cn(
          'mt-2 flex shrink-0 flex-col gap-2.5 pt-2',
          expandido ? 'w-full' : 'items-center',
        )}
      >
        <div className={cn('h-px bg-[#1E1E28]', expandido ? 'w-full' : 'w-8')} />
        <ModelSelector compact={!expandido} />
        <div className={cn('flex items-center gap-2', expandido ? 'w-full' : 'flex-col')}>
          <span
            className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#3A2E63] bg-[#241E3D] font-mono text-[11px] font-semibold leading-none text-[#B9A6FF]"
            title={displayName}
          >
            {initials}
          </span>
          {expandido && (
            <span className="min-w-0 flex-1 truncate text-[12px] text-[#8C8CA0]">
              {displayName}
            </span>
          )}
          <span
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#6E6E85] transition-colors hover:text-[#B9A6FF]"
            title="Ajuda"
          >
            <LifeBuoy className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  )
}
