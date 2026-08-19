import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/config/navigation'
import { APP_NAME } from '@/config/brand'
import { WorkspaceSwitcher } from '@/features/workspaces/components/WorkspaceSwitcher'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { strings } from '@/i18n/pt-BR'

function initialsFrom(name: string | null | undefined, email: string | null | undefined) {
  const source = name || email || '?'
  return source.slice(0, 2).toUpperCase()
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth()
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? ''
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="px-2 text-lg font-semibold tracking-tight">{APP_NAME}</div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <WorkspaceSwitcher />
        <div className="flex items-center gap-2 px-1">
          <Avatar>
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{initialsFrom(displayName, user?.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            aria-label={strings.common.signOut}
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
