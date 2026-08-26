import { useNodes } from '@xyflow/react'
import { AlignLeft, AlignCenter, AlignRight, AlignHorizontalSpaceAround, AlignVerticalSpaceAround } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCallback } from 'react'
import type { CampaignNodePayload } from './CampaignNodeCard'

export function SelectionToolbar({ onMove }: { onMove: (positions: Array<{ id: string; position_x: number; position_y: number }>) => void }) {
  const nodes = useNodes()
  const selectedNodes = nodes.filter(n => n.selected && (n.data as CampaignNodePayload).type) // only our campaign nodes
  
  const handleAlign = useCallback((type: 'left' | 'center' | 'right' | 'distribute-h' | 'distribute-v') => {
    if (selectedNodes.length < 2) return

    const moved = [...selectedNodes]
    
    if (type === 'left') {
      const minX = Math.min(...moved.map(n => n.position.x))
      moved.forEach(n => n.position.x = minX)
    } else if (type === 'right') {
      const maxX = Math.max(...moved.map(n => n.position.x + (n.measured?.width || 250)))
      moved.forEach(n => n.position.x = maxX - (n.measured?.width || 250))
    } else if (type === 'center') {
      const minX = Math.min(...moved.map(n => n.position.x))
      const maxX = Math.max(...moved.map(n => n.position.x + (n.measured?.width || 250)))
      const center = minX + (maxX - minX) / 2
      moved.forEach(n => n.position.x = center - (n.measured?.width || 250) / 2)
    } else if (type === 'distribute-h') {
      if (selectedNodes.length < 3) return
      moved.sort((a, b) => a.position.x - b.position.x)
      const minX = moved[0].position.x
      const maxX = moved[moved.length - 1].position.x
      const step = (maxX - minX) / (moved.length - 1)
      moved.forEach((n, i) => {
        n.position.x = minX + (step * i)
      })
    } else if (type === 'distribute-v') {
      if (selectedNodes.length < 3) return
      moved.sort((a, b) => a.position.y - b.position.y)
      const minY = moved[0].position.y
      const maxY = moved[moved.length - 1].position.y
      const step = (maxY - minY) / (moved.length - 1)
      moved.forEach((n, i) => {
        n.position.y = minY + (step * i)
      })
    }

    onMove(moved.map(n => ({ id: n.id, position_x: n.position.x, position_y: n.position.y })))
  }, [selectedNodes, onMove])

  if (selectedNodes.length < 2) return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#14141C] border border-[#23232F] rounded-lg shadow-xl p-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-4">
      <div className="px-3 text-xs font-medium text-muted-foreground border-r border-[#23232F]">
        {selectedNodes.length} selecionados
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAlign('left')} title="Alinhar à Esquerda">
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAlign('center')} title="Centralizar Horizontalmente">
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAlign('right')} title="Alinhar à Direita">
        <AlignRight className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-[#23232F] mx-1" />
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAlign('distribute-h')} title="Distribuir Horizontalmente" disabled={selectedNodes.length < 3}>
        <AlignHorizontalSpaceAround className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAlign('distribute-v')} title="Distribuir Verticalmente" disabled={selectedNodes.length < 3}>
        <AlignVerticalSpaceAround className="h-4 w-4" />
      </Button>
    </div>
  )
}
