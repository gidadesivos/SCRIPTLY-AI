import { Archive, CircleDot } from 'lucide-react'
import type { ResourceStatus } from '@/types/database'
import { cn } from '@/lib/utils'

const CONFIG: Record<ResourceStatus, { label: string; className: string; icon: typeof CircleDot }> = {
  active: {
    label: 'Ativo',
    className: 'bg-success/10 text-success',
    icon: CircleDot,
  },
  archived: {
    label: 'Arquivado',
    className: 'bg-muted text-muted-foreground',
    icon: Archive,
  },
}

/** Estado nunca comunicado só por cor: sempre ícone + texto (§9 acessibilidade). */
export function StatusBadge({ status, className }: { status: ResourceStatus; className?: string }) {
  const { label, className: statusClass, icon: Icon } = CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
        statusClass,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
