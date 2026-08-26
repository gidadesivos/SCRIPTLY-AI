import { useState } from 'react'
import { ChevronsUpDown, Check } from 'lucide-react'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useActiveBrand } from '@/features/brands/hooks/useActiveBrand'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ContextSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useActiveWorkspace()
  const { brands, activeBrand, setActiveBrandId } = useActiveBrand()
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex h-[32px] items-center gap-2 rounded-lg border border-[#23232F] bg-[#14141C] px-2.5 outline-none transition-colors hover:bg-[#1E1E28]">
          <span className="font-sans text-[12px] font-medium text-[#EDEDF2]">
            {activeWorkspace?.name || 'Sem workspace'}
          </span>
          <span className="h-3 w-[1px] bg-[#2A2A38]"></span>
          <span className="inline-flex items-center gap-1.5 font-sans text-[12px] font-medium text-[#B9A6FF]">
            <span className="h-[7px] w-[7px] rounded-[2px] bg-[#6D4AFF]"></span>
            {activeBrand?.name || 'Sem marca'}
          </span>
          <ChevronsUpDown className="ml-1 h-[13px] w-[13px] text-[#6E6E85]" />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-64 border-[#1E1E28] bg-[#14141C] text-[#EDEDF2]">
        <DropdownMenuLabel className="text-xs text-[#8C8CA0]">Workspace Ativo</DropdownMenuLabel>
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onSelect={() => setActiveWorkspaceId(ws.id)}
            className="flex items-center justify-between focus:bg-[#1E1E28] focus:text-[#EDEDF2]"
          >
            <span className="truncate text-sm">{ws.name}</span>
            {ws.id === activeWorkspace?.id && <Check className="h-4 w-4 text-[#3DDC97]" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-[#1E1E28]" />
        <DropdownMenuLabel className="text-xs text-[#8C8CA0]">Marca Ativa</DropdownMenuLabel>
        {brands.map((b) => (
          <DropdownMenuItem
            key={b.id}
            onSelect={() => setActiveBrandId(b.id)}
            className="flex items-center justify-between focus:bg-[#1E1E28] focus:text-[#EDEDF2]"
          >
            <span className="truncate text-sm">{b.name}</span>
            {b.id === activeBrand?.id && <Check className="h-4 w-4 text-[#3DDC97]" />}
          </DropdownMenuItem>
        ))}
        {brands.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-[#8C8CA0]">Nenhuma marca neste workspace</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
