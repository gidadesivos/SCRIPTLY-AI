import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, Gauge } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getScriptWithScenes, updateScriptStatus, type Script } from '@/features/scripts/api'
import { estimateDuration, formatSeconds } from '@/lib/duration'
import { labelFor, PLATFORMS, SCRIPT_STATUSES } from '@/config/options'
import { strings } from '@/i18n/pt-BR'

export function ScriptDetailPage() {
  const { scriptId } = useParams<{ scriptId: string }>()
  const queryClient = useQueryClient()

  const queryKey = ['scripts', 'detail', scriptId]
  const { data, isPending, isError } = useQuery({
    queryKey,
    queryFn: () => getScriptWithScenes(scriptId as string),
    enabled: Boolean(scriptId),
  })

  const setStatus = useMutation({
    mutationFn: (status: Script['status']) => updateScriptStatus(scriptId as string, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast.success('Status atualizado.')
    },
    onError: () => toast.error(strings.errors.unexpected),
  })

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        title={strings.errors.notFound}
        description="Esse roteiro não existe ou você não tem acesso a ele."
        action={
          <Button asChild variant="outline" className="h-11">
            <Link to="/create">Criar um roteiro</Link>
          </Button>
        }
      />
    )
  }

  const { script, scenes } = data
  const estimate = estimateDuration(
    scenes.map((scene) => scene.voiceover ?? ''),
    script.duration_seconds,
    script.tone,
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 h-9">
          <Link to="/create">
            <ArrowLeft className="h-4 w-4" />
            {strings.create.title}
          </Link>
        </Button>

        <PageHeader
          title={script.title}
          description={script.brand?.name}
          action={
            <Select
              value={script.status}
              onValueChange={(value) => setStatus.mutate(value as Script['status'])}
            >
              <SelectTrigger className="w-44" aria-label="Status do roteiro">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCRIPT_STATUSES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </div>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
            {labelFor(PLATFORMS, script.platform)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {strings.create.estimatedVoiceover}: {formatSeconds(estimate.estimatedSeconds)} (
            {strings.create.target}: {script.duration_seconds} s)
          </span>
          {script.hook_score !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-info/10 px-2 py-1 font-medium text-info">
              <Gauge className="h-3.5 w-3.5" />
              {strings.create.hookScore}: {script.hook_score}/100
            </span>
          )}
        </div>

        {script.hook_text && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Hook</p>
            <p className="text-sm font-medium">{script.hook_text}</p>
          </div>
        )}

        {script.strategy_summary && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Estratégia</p>
            <p className="text-sm text-muted-foreground">{script.strategy_summary}</p>
          </div>
        )}
      </Card>

      <ol className="flex flex-col gap-3">
        {scenes.map((scene, index) => (
          <li key={scene.id}>
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Cena {index + 1}</span>
                {scene.purpose && (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {scene.purpose}
                  </span>
                )}
              </div>
              <dl className="flex flex-col gap-2 text-sm">
                <SceneField label="Locução" value={scene.voiceover} emphasis />
                <SceneField label="Texto em tela" value={scene.on_screen_text} />
                <SceneField label="Visual" value={scene.visual} />
                <SceneField label="Ação" value={scene.action} />
                <SceneField label="Plano" value={scene.shot} />
                <SceneField label="B-roll" value={scene.broll} />
                <SceneField label="Edição" value={scene.editing_direction} />
                <SceneField label="Transição" value={scene.transition} />
                <SceneField label="Som" value={scene.sound_suggestion} />
              </dl>
            </Card>
          </li>
        ))}
      </ol>

      {script.cta && (
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-xs font-medium text-muted-foreground">CTA</span>
          <p className="text-sm">{script.cta}</p>
        </Card>
      )}
    </div>
  )
}

function SceneField({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string | null
  emphasis?: boolean
}) {
  if (!value?.trim()) return null
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-28 shrink-0 text-xs text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd className={emphasis ? 'font-medium' : 'text-muted-foreground'}>{value}</dd>
    </div>
  )
}
