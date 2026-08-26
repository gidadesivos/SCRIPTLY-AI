import { useAuth } from '@/features/auth/hooks/useAuth'
import { Diagnostics } from '@/features/settings/components/Diagnostics'
import { PlanCard } from '@/features/settings/components/PlanCard'
import { ProvidersCard } from '@/features/settings/components/ProvidersCard'
import { strings } from '@/i18n/pt-BR'

export function SettingsPage() {
  const { user } = useAuth()
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? ''
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex h-full flex-col bg-[#0B0B10] text-[#EDEDF2]">
      {/* Topbar */}
      <div className="flex h-[52px] shrink-0 items-center gap-[12px] border-b border-[#1E1E28] bg-[#0E0E14] px-4">
        <h1 className="m-0 font-sans text-[14px] font-semibold tracking-[-0.01em]">
          {strings.settings.title}
        </h1>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 py-6">
        <div className="mx-auto w-full max-w-3xl space-y-8">
          {/* Profile Card */}
          <section className="flex flex-col gap-4 rounded-xl border border-[#1E1E28] bg-[#12121A] p-5">
            <h2 className="font-sans text-[16px] font-semibold">{strings.settings.profile}</h2>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#3A2E63] bg-[#241E3D] font-mono text-[14px] font-semibold text-[#B9A6FF]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-sans text-[14px] font-medium text-[#EDEDF2]">{displayName}</span>
                <span className="font-sans text-[12px] text-[#8C8CA0]">{user?.email}</span>
              </div>
            </div>
          </section>

          {/* Other Settings Components */}
          <div className="settings-cards-wrapper space-y-8 [&_.border-border]:border-[#1E1E28] [&_.bg-card]:bg-[#12121A] [&_.text-card-foreground]:text-[#EDEDF2] [&_.text-muted-foreground]:text-[#8C8CA0]">
            <PlanCard />
            <ProvidersCard />
            <Diagnostics />
          </div>
        </div>
      </div>
    </div>
  )
}
