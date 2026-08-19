import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createWorkspaceSchema, type CreateWorkspaceInput } from '@/schemas/workspace'
import { useCreateWorkspace } from '@/features/workspaces/hooks/useWorkspaces'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { strings } from '@/i18n/pt-BR'

export function CreateWorkspaceForm({ onCreated }: { onCreated?: () => void }) {
  const { setActiveWorkspaceId } = useActiveWorkspace()
  const createWorkspace = useCreateWorkspace()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateWorkspaceInput>({ resolver: zodResolver(createWorkspaceSchema) })

  async function onSubmit(values: CreateWorkspaceInput) {
    try {
      const id = await createWorkspace.mutateAsync(values.name)
      setActiveWorkspaceId(id)
      toast.success('Workspace criado.')
      onCreated?.()
    } catch {
      toast.error(strings.errors.unexpected)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="workspace-name">{strings.onboarding.nameLabel}</Label>
        <Input
          id="workspace-name"
          placeholder={strings.onboarding.namePlaceholder}
          autoFocus
          {...register('name')}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <Button type="submit" className="h-11" disabled={createWorkspace.isPending}>
        {createWorkspace.isPending ? strings.onboarding.creating : strings.onboarding.submit}
      </Button>
    </form>
  )
}
