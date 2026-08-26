import { labelFor } from '@/config/options'
import {
  META_AD_FORMATS,
  META_AUDIENCE_TYPES,
  META_BUDGET_LEVELS,
  META_BUDGET_MODES,
  META_BUYING_TYPES,
  META_CAMPAIGN_OBJECTIVES,
  META_CTAS,
  META_OPTIMIZATION_GOALS,
  META_PLACEMENT_MODES,
} from '@/features/campaigns/meta-options'
import { issuesFor, planTotals } from '@/features/campaigns/validation'
import { NODE_LABELS, type CampaignNode, type CampaignPlan } from '@/features/campaigns/types'

interface PlanDocumentProps {
  plan: CampaignPlan
  nodes: CampaignNode[]
  brandName: string
}

/**
 * O plano como documento, não como desenho.
 *
 * Imprimir o canvas daria uma imagem bonita e inútil: quem vai montar a
 * campanha no Meta precisa dos CAMPOS — objetivo, público, orçamento, copy —
 * e não do formato da árvore. Este é o documento que se manda para o cliente
 * aprovar ou para quem vai executar.
 *
 * Sai em PDF pelo "Salvar como PDF" do navegador, aproveitando as regras de
 * @media print que o app já tem para os roteiros. Sem biblioteca de PDF no
 * bundle.
 */
export function PlanDocument({ plan, nodes, brandName }: PlanDocumentProps) {
  const totals = planTotals(nodes)
  const campanhas = nodes.filter((node) => node.type === 'campanha')

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 p-6 text-sm print:p-0">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold">{plan.name}</h1>
        <p className="text-muted-foreground">
          {brandName} · Plano de campanha · {new Date().toLocaleDateString('pt-BR')}
        </p>

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <Total label="Campanhas" value={totals.campanhas} />
          <Total label="Conjuntos" value={totals.conjuntos} />
          <Total label="Anúncios" value={totals.anuncios} />
          <Total label="Com criativo" value={`${totals.comCriativo} de ${totals.anuncios}`} />
          <Total
            label="Orçamento"
            value={totals.orcamento.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            })}
          />
        </dl>
      </header>

      {campanhas.length === 0 && (
        <p className="text-muted-foreground">Este plano ainda não tem campanhas.</p>
      )}

      {campanhas.map((campanha) => (
        <section key={campanha.id} className="flex flex-col gap-4 break-inside-avoid">
          <NodeBlock node={campanha} nodes={nodes} level={0} />

          {nodes
            .filter((node) => node.parent_id === campanha.id)
            .map((conjunto) => (
              <div key={conjunto.id} className="ml-4 flex flex-col gap-3 border-l border-border pl-4">
                <NodeBlock node={conjunto} nodes={nodes} level={1} />

                {nodes
                  .filter((node) => node.parent_id === conjunto.id)
                  .map((anuncio) => (
                    <div key={anuncio.id} className="ml-4 border-l border-border pl-4">
                      <NodeBlock node={anuncio} nodes={nodes} level={2} />
                    </div>
                  ))}
              </div>
            ))}
        </section>
      ))}
    </article>
  )
}

function Total({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="inline">{label}: </dt>
      <dd className="inline font-medium text-foreground">{value}</dd>
    </div>
  )
}

function NodeBlock({
  node,
  nodes,
  level,
}: {
  node: CampaignNode
  nodes: CampaignNode[]
  level: number
}) {
  const data = node.data as Record<string, unknown>
  const issues = issuesFor(node, nodes)

  return (
    <div className="break-inside-avoid">
      <h2
        className={
          level === 0
            ? 'text-base font-semibold'
            : level === 1
              ? 'text-sm font-semibold'
              : 'text-sm font-medium'
        }
      >
        <span className="text-muted-foreground">{NODE_LABELS[node.type]}: </span>
        {node.label || 'Sem nome'}
      </h2>

      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        {fieldsFor(node).map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
      </dl>

      {issues.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-0.5">
          {issues.map((issue) => (
            <li key={issue} className="text-xs text-warning">
              ⚠ {issue}
            </li>
          ))}
        </ul>
      )}

      {node.type === 'anuncio' && node.media_url && (
        <p className="mt-1 break-all text-xs text-muted-foreground">Criativo: {node.media_url}</p>
      )}

      {Boolean(data.notes) && (
        <p className="mt-1 text-xs italic text-muted-foreground">{String(data.notes)}</p>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value || value === '—') return null
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </>
  )
}

/** Os campos que fazem sentido para cada nível, na ordem em que o Meta pede. */
function fieldsFor(node: CampaignNode): Array<[string, string]> {
  const data = node.data as Record<string, unknown>
  const budget = data.budget_amount
    ? Number(data.budget_amount).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      })
    : ''

  if (node.type === 'campanha') {
    return [
      ['Objetivo', labelFor(META_CAMPAIGN_OBJECTIVES, data.objective as string)],
      ['Tipo de compra', labelFor(META_BUYING_TYPES, data.buying_type as string)],
      ['Orçamento em', labelFor(META_BUDGET_LEVELS, data.budget_level as string)],
      ['Modo', labelFor(META_BUDGET_MODES, data.budget_mode as string)],
      ['Valor', budget],
      ['Teste A/B', data.ab_test ? 'Sim' : ''],
    ]
  }

  if (node.type === 'conjunto') {
    return [
      ['Orçamento', budget],
      ['Modo', labelFor(META_BUDGET_MODES, data.budget_mode as string)],
      ['Otimização', labelFor(META_OPTIMIZATION_GOALS, data.optimization_goal as string)],
      ['Evento', String(data.conversion_event ?? '')],
      ['Público', labelFor(META_AUDIENCE_TYPES, data.audience_type as string)],
      ['Detalhe', String(data.audience_detail ?? '')],
      ['Idade', String(data.age_range ?? '')],
      ['Local', String(data.locations ?? '')],
      ['Posicionamentos', labelFor(META_PLACEMENT_MODES, data.placement_mode as string)],
      ['Quais', String(data.placements ?? '')],
      ['Programação', String(data.schedule ?? '')],
    ]
  }

  return [
    ['Formato', labelFor(META_AD_FORMATS, data.format as string)],
    ['Texto principal', String(data.primary_text ?? '')],
    ['Título', String(data.headline ?? '')],
    ['Descrição', String(data.description ?? '')],
    ['Botão', labelFor(META_CTAS, data.cta as string)],
    ['Destino', String(data.destination ?? '')],
  ]
}
