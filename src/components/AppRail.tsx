import { NavLink } from 'react-router-dom'
import { LifeBuoy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/config/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'

function initialsFrom(name: string | null | undefined, email: string | null | undefined) {
  const source = name || email || '?'
  return source.slice(0, 2).toUpperCase()
}

export function AppRail({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? ''
  const initials = initialsFrom(displayName, user?.email)

  return (
    <div className="flex h-full w-[72px] flex-col items-center gap-[2px] border-r border-border bg-[#0A0A0E] py-3 text-[#EDEDF2] font-sans">
      <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#7D5CFF] to-[#5432E0] font-sans text-[13px] font-semibold leading-none text-white">
        S
      </div>

      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'relative flex w-[60px] flex-col items-center gap-1 rounded-[10px] pb-1.5 pt-2 transition-colors',
              isActive
                ? 'bg-[#6D4AFF]/15 text-[#B9A6FF]'
                : 'text-[#6E6E85] hover:bg-[#6D4AFF]/10 hover:text-[#B9A6FF]'
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute -left-1.5 top-3 h-5 w-[2px] rounded-sm bg-[#6D4AFF]" />
              )}
              <span className="relative">
                <item.icon className="h-[17px] w-[17px]" />
                {/* Ponto, e não a palavra "BETA": no rail de 60px o texto não
                    cabe sem quebrar o alinhamento dos outros itens. O nome por
                    extenso aparece no drawer, onde há espaço. */}
                {item.badge && (
                  <span
                    className="absolute -right-1 -top-0.5 h-[5px] w-[5px] rounded-full bg-[#6D4AFF] ring-2 ring-[#0A0A0E]"
                    aria-hidden
                  />
                )}
              </span>
              <span className="font-mono text-[9px] font-medium leading-none tracking-[0.04em]">
                {item.label}
              </span>
              {/* Só para leitor de tela: visualmente o ponto já sinaliza, mas
                  "rápido" sozinho não diz que o recurso é experimental. */}
              {item.badge && <span className="sr-only">{item.fullLabel ?? item.badge}</span>}
            </>
          )}
        </NavLink>
      ))}

      <div className="mt-auto flex flex-col items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6E6E85] hover:text-[#B9A6FF] cursor-pointer transition-colors">
          <LifeBuoy className="h-4 w-4" />
        </span>
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#3A2E63] bg-[#241E3D] font-mono text-[11px] font-semibold leading-none text-[#B9A6FF] cursor-pointer">
          {initials}
        </span>
      </div>
    </div>
  )
}
