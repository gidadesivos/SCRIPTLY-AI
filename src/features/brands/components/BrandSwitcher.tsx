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

export function BrandSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { brands, activeBrand, setActiveBrandId } = useActiveBrand()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          aria-label={strings.brands.activeBrand}
        >
          <span className="truncate">{activeBrand?.name ?? strings.brands.noBrands}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
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
