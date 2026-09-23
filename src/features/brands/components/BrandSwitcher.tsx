import { Link } from 'react-router-dom'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useActiveBrand } from '@/features/brands/hooks/useActiveBrand'
import { strings } from '@/i18n/pt-BR'
import { initialsOf } from '@/components/initials'

export function BrandSwitcher({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void
  /** Gatilho quadrado com iniciais, para o rail de 72px. Ver WorkspaceSwitcher. */
  compact?: boolean
}) {
  const { brands, activeBrand, setActiveBrandId } = useActiveBrand()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button
            type="button"
            aria-label={`${strings.brands.activeBrand}: ${activeBrand?.name ?? strings.brands.noBrands}`}
            title={activeBrand?.name ?? strings.brands.noBrands}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2A2A38] bg-[#14141C] font-mono text-[11px] font-semibold leading-none text-[#8C8CA0] transition-colors hover:border-[#6D4AFF]/60 hover:text-[#B9A6FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4AFF]"
          >
            {initialsOf(activeBrand?.name)}
          </button>
        ) : (
          <Button
            variant="outline"
            className="w-full justify-between"
            aria-label={strings.brands.activeBrand}
          >
            <span className="truncate">{activeBrand?.name ?? strings.brands.noBrands}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{strings.brands.activeBrand}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {brands.map((brand) => (
          <DropdownMenuItem
            key={brand.id}
            onSelect={() => setActiveBrandId(brand.id)}
            className="justify-between"
          >
            <span className="truncate">{brand.name}</span>
            {brand.id === activeBrand?.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        {brands.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem asChild>
          <Link to="/brands/new" onClick={onNavigate}>
            <Plus className="h-4 w-4" />
            {strings.brands.newBrand}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
