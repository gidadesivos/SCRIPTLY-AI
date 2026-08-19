import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LogIn, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { APP_NAME } from '@/config/brand'
import { strings } from '@/i18n/pt-BR'

export function LoginPage() {
  const { session, isLoading, signInWithGoogle } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)

  if (!isLoading && session) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSignIn() {
    setIsSigningIn(true)
    try {
      await signInWithGoogle()
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 text-lg font-semibold tracking-tight">{APP_NAME}</div>
          <CardTitle>{strings.auth.title}</CardTitle>
          <CardDescription>{strings.auth.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!isSupabaseConfigured && (
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>{strings.errors.supabaseNotConfigured}</span>
            </div>
          )}
          <Button
            onClick={handleSignIn}
            disabled={!isSupabaseConfigured || isSigningIn}
            className="h-11 w-full"
          >
            <LogIn className="h-4 w-4" />
            {isSigningIn ? strings.auth.signingIn : strings.auth.continueWithGoogle}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
