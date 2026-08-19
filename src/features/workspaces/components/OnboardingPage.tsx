import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CreateWorkspaceForm } from './CreateWorkspaceForm'
import { strings } from '@/i18n/pt-BR'

export function OnboardingPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{strings.onboarding.title}</CardTitle>
          <CardDescription>{strings.onboarding.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateWorkspaceForm />
        </CardContent>
      </Card>
    </div>
  )
}
