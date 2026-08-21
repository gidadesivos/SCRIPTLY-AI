import { Monitor, Moon, Sun } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTheme } from '@/features/settings/hooks/useTheme'
import { Diagnostics } from '@/features/settings/components/Diagnostics'
import { strings } from '@/i18n/pt-BR'
import { cn } from '@/lib/utils'

const THEME_OPTIONS = [
  { value: 'light' as const, label: strings.settings.themeLight, icon: Sun },
  { value: 'dark' as const, label: strings.settings.themeDark, icon: Moon },
  { value: 'system' as const, label: strings.settings.themeSystem, icon: Monitor },
]

export function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? ''
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.settings.title} />

      <Card>
        <CardHeader>
          <CardTitle>{strings.settings.profile}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{strings.settings.theme}</CardTitle>
          <CardDescription>Escolha como o Scriptly AI aparece para você.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {THEME_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={theme === option.value ? 'default' : 'outline'}
              size="sm"
              className={cn('gap-2')}
              onClick={() => setTheme(option.value)}
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Diagnostics />
    </div>
  )
}
