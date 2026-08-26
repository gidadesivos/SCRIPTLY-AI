import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { strings } from '@/i18n/pt-BR'

export function AuthCallback() {
  const [status, setStatus] = useState<'processing' | 'error' | 'done'>('processing')

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return
      if (error || !data.session) {
        setStatus('error')
        return
      }
      setStatus('done')
    })

    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'done') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center">
      {status === 'processing' ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{strings.auth.callbackProcessing}</p>
        </>
      ) : (
        <>
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-foreground">{strings.auth.callbackError}</p>
          <a href="/login" className="text-sm text-primary underline underline-offset-4">
            {strings.common.tryAgain}
          </a>
        </>
      )}
    </div>
  )
}
