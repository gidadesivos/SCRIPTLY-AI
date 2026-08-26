import { forwardRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Eye, EyeOff, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { authErrorMessage } from '@/lib/auth-errors'
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from '@/schemas/auth'
import { APP_NAME } from '@/config/brand'
import { strings } from '@/i18n/pt-BR'
import { cn } from '@/lib/utils'

type Mode = 'signIn' | 'signUp'

export function LoginPage() {
  const { session, isLoading } = useAuth()
  const [mode, setMode] = useState<Mode>('signIn')
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  if (!isLoading && session) {
    return <Navigate to="/dashboard" replace />
  }

  if (pendingEmail) {
    return (
      <AuthShell>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-success/10 text-success">
            <MailCheck className="h-5 w-5" />
          </div>
          <CardTitle>{strings.auth.checkEmailTitle}</CardTitle>
          <CardDescription>
            {strings.auth.checkEmailDescription.replace('{email}', pendingEmail)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="h-11 w-full"
            onClick={() => {
              setPendingEmail(null)
              setMode('signIn')
            }}
          >
            {strings.auth.backToSignIn}
          </Button>
        </CardContent>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <CardHeader className="items-center text-center">
        <div className="mb-2 text-lg font-semibold tracking-tight">{APP_NAME}</div>
        <CardTitle>
          {mode === 'signIn' ? strings.auth.signInTitle : strings.auth.signUpTitle}
        </CardTitle>
        <CardDescription>{strings.auth.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!isSupabaseConfigured && (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>{strings.errors.supabaseNotConfigured}</span>
          </div>
        )}

        {mode === 'signIn' ? (
          <SignInForm />
        ) : (
          <SignUpForm onNeedsConfirmation={(email) => setPendingEmail(email)} />
        )}

        <p className="text-center text-sm text-muted-foreground">
          {mode === 'signIn' ? strings.auth.noAccount : strings.auth.hasAccount}{' '}
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          >
            {mode === 'signIn' ? strings.auth.signUp : strings.auth.signIn}
          </button>
        </p>
      </CardContent>
    </AuthShell>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-8">
      <Card className="w-full max-w-sm">{children}</Card>
    </div>
  )
}

function FormError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-destructive">{message}</p>
}

const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  ({ className, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false)
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={isVisible ? 'text' : 'password'}
          className={cn('pr-11', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setIsVisible((v) => !v)}
          aria-label={isVisible ? strings.auth.hidePassword : strings.auth.showPassword}
          className="absolute right-0 top-0 flex h-9 w-11 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'

function SignInForm() {
  const { signIn } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) })

  async function onSubmit(values: SignInInput) {
    setFormError(null)
    try {
      await signIn(values.email, values.password)
    } catch (error) {
      setFormError(authErrorMessage(error))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="signin-email">{strings.auth.emailLabel}</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          placeholder={strings.auth.emailPlaceholder}
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        <FormError message={errors.email?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signin-password">{strings.auth.passwordLabel}</Label>
        <PasswordInput
          id="signin-password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        <FormError message={errors.password?.message} />
      </div>

      {formError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {formError}
        </div>
      )}

      <Button type="submit" className="h-11 w-full" disabled={!isSupabaseConfigured || isSubmitting}>
        {isSubmitting ? strings.auth.signingIn : strings.auth.signIn}
      </Button>
    </form>
  )
}

function SignUpForm({ onNeedsConfirmation }: { onNeedsConfirmation: (email: string) => void }) {
  const { signUp } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) })

  async function onSubmit(values: SignUpInput) {
    setFormError(null)
    try {
      const { hasSession } = await signUp(values.fullName, values.email, values.password)
      if (!hasSession) onNeedsConfirmation(values.email)
    } catch (error) {
      setFormError(authErrorMessage(error))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-name">{strings.auth.fullNameLabel}</Label>
        <Input
          id="signup-name"
          autoComplete="name"
          placeholder={strings.auth.fullNamePlaceholder}
          aria-invalid={Boolean(errors.fullName)}
          {...register('fullName')}
        />
        <FormError message={errors.fullName?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-email">{strings.auth.emailLabel}</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder={strings.auth.emailPlaceholder}
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        <FormError message={errors.email?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-password">{strings.auth.passwordLabel}</Label>
        <PasswordInput
          id="signup-password"
          autoComplete="new-password"
          placeholder={strings.auth.passwordPlaceholder}
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        <FormError message={errors.password?.message} />
      </div>

      {formError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {formError}
        </div>
      )}

      <Button type="submit" className="h-11 w-full" disabled={!isSupabaseConfigured || isSubmitting}>
        {isSubmitting ? strings.auth.signingUp : strings.auth.signUp}
      </Button>
    </form>
  )
}
