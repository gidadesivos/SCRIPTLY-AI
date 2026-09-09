import { useState } from 'react'
import {
  ChevronRight,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  Inbox,
  Layers,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { FolderNode } from '@/features/scripts/folders-api'

/**
 * Seleção atual da biblioteca.
 *
 * 'todos' e 'raiz' não são pastas e por isso não são ids: 'todos' mostra a
 * biblioteca inteira e 'raiz' mostra só o que não foi guardado em lugar nenhum.
 * Um id de pasta traz ela e o que está dentro.
 */
export type FolderSelection = 'todos' | 'raiz' | string

interface FolderTreeProps {
  tree: FolderNode[]
  counts: Record<string, number>
  total: number
  selected: FolderSelection
  onSelect: (selection: FolderSelection) => void
  canEdit: boolean
  canDelete: boolean
  onCreate: (parentId: string | null, name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (node: FolderNode) => void
}

export function FolderTree({
  tree,
  counts,
  total,
  selected,
  onSelect,
  canEdit,
  canDelete,
  onCreate,
  onRename,
  onDelete,
}: FolderTreeProps) {
  const [criandoEm, setCriandoEm] = useState<string | null | undefined>(undefined)

  return (
    <div className="flex h-full w-[240px] shrink-0 flex-col border-r border-[#1E1E28] bg-[#0E0E14]">
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#1E1E28] px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5E5E75]">
          Pastas
        </span>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#8C8CA0] hover:bg-[#1E1E28] hover:text-[#EDEDF2]"
            aria-label="Nova pasta na raiz"
            title="Nova pasta"
            onClick={() => setCriandoEm(null)}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <LinhaFixa
          icone={Layers}
          rotulo="Todos os roteiros"
          contagem={total}
          ativo={selected === 'todos'}
          onClick={() => onSelect('todos')}
        />
        <LinhaFixa
          icone={Inbox}
          rotulo="Sem pasta"
          contagem={counts.raiz ?? 0}
          ativo={selected === 'raiz'}
          onClick={() => onSelect('raiz')}
        />

        <div className="my-2 h-px bg-[#1E1E28]" />

        {criandoEm === null && (
          <CampoNovaPasta
            nivel={0}
            onConfirmar={(nome) => {
              onCreate(null, nome)
              setCriandoEm(undefined)
            }}
            onCancelar={() => setCriandoEm(undefined)}
          />
        )}

        {tree.length === 0 && criandoEm === undefined && (
          <p className="px-2 py-3 text-[11px] leading-relaxed text-[#5E5E75]">
            Nenhuma pasta ainda. Crie uma para separar seus roteiros do seu jeito.
          </p>
        )}

        {tree.map((node) => (
          <Ramo
            key={node.id}
            node={node}
            nivel={0}
            selected={selected}
            onSelect={onSelect}
            canEdit={canEdit}
            canDelete={canDelete}
            criandoEm={criandoEm}
            setCriandoEm={setCriandoEm}
            onCreate={onCreate}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}

function LinhaFixa({
  icone: Icone,
  rotulo,
  contagem,
  ativo,
  onClick,
}: {
  icone: typeof Layers
  rotulo: string
  contagem: number
  ativo: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
        ativo ? 'bg-[#1E1E28] text-[#EDEDF2]' : 'text-[#8C8CA0] hover:bg-[#14141C]',
      )}
    >
      <Icone className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{rotulo}</span>
      <span className="shrink-0 text-[11px] tabular-nums text-[#5E5E75]">{contagem}</span>
    </button>
  )
}

function Ramo({
  node,
  nivel,
  selected,
  onSelect,
  canEdit,
  canDelete,
  criandoEm,
  setCriandoEm,
  onCreate,
  onRename,
  onDelete,
}: {
  node: FolderNode
  nivel: number
  selected: FolderSelection
  onSelect: (s: FolderSelection) => void
  canEdit: boolean
  canDelete: boolean
  criandoEm: string | null | undefined
  setCriandoEm: (v: string | null | undefined) => void
  onCreate: (parentId: string | null, name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (node: FolderNode) => void
}) {
  const [aberto, setAberto] = useState(true)
  const [renomeando, setRenomeando] = useState(false)
  const ativo = selected === node.id
  const temFilhos = node.children.length > 0

  if (renomeando) {
    return (
      <CampoNovaPasta
        nivel={nivel}
        valorInicial={node.name}
        onConfirmar={(nome) => {
          if (nome !== node.name) onRename(node.id, nome)
          setRenomeando(false)
        }}
        onCancelar={() => setRenomeando(false)}
      />
    )
  }

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md pr-1 transition-colors',
          ativo ? 'bg-[#1E1E28]' : 'hover:bg-[#14141C]',
        )}
        style={{ paddingLeft: nivel * 12 }}
      >
        {/* Seta separada do nome: abrir a pasta e entrar nela são intenções
            diferentes, e juntar as duas num clique só faz uma atrapalhar a outra. */}
        <button
          className="flex h-6 w-5 shrink-0 items-center justify-center text-[#5E5E75] hover:text-[#EDEDF2]"
          aria-label={aberto ? `Recolher ${node.name}` : `Expandir ${node.name}`}
          onClick={() => setAberto((v) => !v)}
          disabled={!temFilhos}
        >
          {temFilhos && (
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', aberto && 'rotate-90')} />
          )}
        </button>

        <button
          onClick={() => onSelect(node.id)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-[13px]',
            ativo ? 'text-[#EDEDF2]' : 'text-[#8C8CA0]',
          )}
        >
          {aberto && temFilhos ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-[#B9A6FF]" />
          ) : (
            <FolderClosed className="h-4 w-4 shrink-0 text-[#B9A6FF]" />
          )}
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
          {node.count > 0 && (
            <span className="shrink-0 text-[11px] tabular-nums text-[#5E5E75]">{node.count}</span>
          )}
        </button>

        {(canEdit || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="shrink-0 rounded p-1 text-[#5E5E75] opacity-0 transition-opacity hover:text-[#EDEDF2] group-hover:opacity-100 data-[state=open]:opacity-100"
                aria-label={`Ações da pasta ${node.name}`}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canEdit && (
                <>
                  <DropdownMenuItem onSelect={() => setRenomeando(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Renomear
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setAberto(true)
                      setCriandoEm(node.id)
                    }}
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    Nova subpasta
                  </DropdownMenuItem>
                </>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(node)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir pasta
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {aberto && (
        <>
          {criandoEm === node.id && (
            <CampoNovaPasta
              nivel={nivel + 1}
              onConfirmar={(nome) => {
                onCreate(node.id, nome)
                setCriandoEm(undefined)
              }}
              onCancelar={() => setCriandoEm(undefined)}
            />
          )}
          {node.children.map((filho) => (
            <Ramo
              key={filho.id}
              node={filho}
              nivel={nivel + 1}
              selected={selected}
              onSelect={onSelect}
              canEdit={canEdit}
              canDelete={canDelete}
              criandoEm={criandoEm}
              setCriandoEm={setCriandoEm}
              onCreate={onCreate}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </>
      )}
    </div>
  )
}

/** Campo em linha para criar ou renomear, sem tirar o usuário da árvore. */
function CampoNovaPasta({
  nivel,
  valorInicial = '',
  onConfirmar,
  onCancelar,
}: {
  nivel: number
  valorInicial?: string
  onConfirmar: (nome: string) => void
  onCancelar: () => void
}) {
  const [valor, setValor] = useState(valorInicial)

  const confirmar = () => {
    const limpo = valor.trim()
    if (limpo) onConfirmar(limpo)
    else onCancelar()
  }

  return (
    <div className="py-0.5 pr-1" style={{ paddingLeft: nivel * 12 + 20 }}>
      <Input
        autoFocus
        className="h-7 text-[13px]"
        placeholder="Nome da pasta"
        maxLength={80}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            confirmar()
          }
          if (e.key === 'Escape') onCancelar()
        }}
      />
    </div>
  )
}
