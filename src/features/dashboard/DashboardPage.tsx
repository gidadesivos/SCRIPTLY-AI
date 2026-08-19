import { Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { strings } from '@/i18n/pt-BR'

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.dashboard.title} />
      <EmptyState
        icon={Sparkles}
        title={strings.dashboard.emptyTitle}
        description={strings.dashboard.emptyDescription}
      />
    </div>
  )
}
