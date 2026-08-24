import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/FormField'
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
import { ScriptPicker } from '@/features/campaigns/components/ScriptPicker'
import { NODE_LABELS, type CampaignNode } from '@/features/campaigns/types'
import type { Option } from '@/config/options'

interface NodeInspectorProps {
  node: CampaignNode
  onChange: (patch: {
    label?: string
    data?: Record<string, unknown>
    script_id?: string | null
  }) => void
}

/**
 * Formulário do nó selecionado. Cada tipo mostra só os campos que existem
 * naquele nível do Meta — jogar todos juntos seria pedir para preencher
 * público num anúncio, coisa que a plataforma não tem.
 */
export function NodeInspector({ node, onChange }: NodeInspectorProps) {
  const data = node.data as Record<string, unknown>
  const set = (key: string, value: unknown) => onChange({ data: { ...data, [key]: value } })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {NODE_LABELS[node.type]}
        </p>
      </div>

      <FormField label="Nome">
        {(props) => (
          <Input
            {...props}
            value={node.label}
            onChange={(event) => onChange({ label: event.target.value })}
            placeholder={`Ex: ${placeholderFor(node.type)}`}
          />
        )}
      </FormField>

      {node.type === 'campanha' && (
        <>
          <Picker
            label="Objetivo"
            options={META_CAMPAIGN_OBJECTIVES}
            value={data.objective}
            onChange={(v) => set('objective', v)}
          />
          <Picker
            label="Tipo de compra"
            options={META_BUYING_TYPES}
            value={data.buying_type}
            onChange={(v) => set('buying_type', v)}
          />
          <Picker
            label="Onde fica o orçamento"
            hint="CBO na campanha ou ABO nos conjuntos. Os dois ao mesmo tempo não funcionam."
            options={META_BUDGET_LEVELS}
            value={data.budget_level}
            onChange={(v) => set('budget_level', v)}
          />
          {data.budget_level === 'campaign' && (
            <BudgetFields data={data} onSet={set} />
          )}
          <FormField
            label="Teste A/B"
            hint="O Meta divide o público para comparar variações."
          >
            {() => (
              <Switch
                checked={Boolean(data.ab_test)}
                onCheckedChange={(checked) => set('ab_test', checked)}
              />
            )}
          </FormField>
        </>
      )}

      {node.type === 'conjunto' && (
        <>
          <BudgetFields data={data} onSet={set} />
          <Picker
            label="Otimização"
            options={META_OPTIMIZATION_GOALS}
            value={data.optimization_goal}
            onChange={(v) => set('optimization_goal', v)}
          />
          {data.optimization_goal === 'conversions' && (
            <FormField
              label="Evento de conversão"
              hint="Sem isto o Meta entrega para quem clica, não para quem compra."
            >
              {(props) => (
                <Input
                  {...props}
                  value={String(data.conversion_event ?? '')}
                  onChange={(event) => set('conversion_event', event.target.value)}
                  placeholder="Ex: Purchase, Lead, InitiateCheckout"
                />
              )}
            </FormField>
          )}
          <Picker
            label="Tipo de público"
            options={META_AUDIENCE_TYPES}
            value={data.audience_type}
            onChange={(v) => set('audience_type', v)}
          />
          <Area
            label="Detalhe do público"
            value={data.audience_detail}
            onChange={(v) => set('audience_detail', v)}
            placeholder="Ex: lookalike 1% de compradores dos últimos 180 dias"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Faixa etária">
              {(props) => (
                <Input
                  {...props}
                  value={String(data.age_range ?? '')}
                  onChange={(event) => set('age_range', event.target.value)}
                  placeholder="25-45"
                />
              )}
            </FormField>
            <FormField label="Localização">
              {(props) => (
                <Input
                  {...props}
                  value={String(data.locations ?? '')}
                  onChange={(event) => set('locations', event.target.value)}
                  placeholder="Brasil"
                />
              )}
            </FormField>
          </div>
          <Picker
            label="Posicionamentos"
            options={META_PLACEMENT_MODES}
            value={data.placement_mode}
            onChange={(v) => set('placement_mode', v)}
          />
          {data.placement_mode === 'manual' && (
            <Area
              label="Quais posicionamentos"
              value={data.placements}
              onChange={(v) => set('placements', v)}
              placeholder="Ex: Reels, Stories, Feed do Instagram"
            />
          )}
          <Area
            label="Programação"
            value={data.schedule}
            onChange={(v) => set('schedule', v)}
            placeholder="Ex: 01/09 a 30/09, o dia todo"
          />
        </>
      )}

      {node.type === 'anuncio' && (
        <>
          <ScriptPicker
            scriptId={node.script_id}
            onChange={(scriptId) => onChange({ script_id: scriptId })}
          />
          <Picker
            label="Formato"
            options={META_AD_FORMATS}
            value={data.format}
            onChange={(v) => set('format', v)}
          />
          <Area
            label="Texto principal"
            value={data.primary_text}
            onChange={(v) => set('primary_text', v)}
            rows={4}
          />
          <FormField label="Título">
            {(props) => (
              <Input
                {...props}
                value={String(data.headline ?? '')}
                onChange={(event) => set('headline', event.target.value)}
              />
            )}
          </FormField>
          <FormField label="Descrição">
            {(props) => (
              <Input
                {...props}
                value={String(data.description ?? '')}
                onChange={(event) => set('description', event.target.value)}
              />
            )}
          </FormField>
          <Picker
            label="Botão"
            options={META_CTAS}
            value={data.cta}
            onChange={(v) => set('cta', v)}
          />
          <FormField label="Destino">
            {(props) => (
              <Input
                {...props}
                value={String(data.destination ?? '')}
                onChange={(event) => set('destination', event.target.value)}
                placeholder="https://..."
              />
            )}
          </FormField>
        </>
      )}

      <Area
        label="Observações"
        value={data.notes}
        onChange={(v) => set('notes', v)}
        placeholder="Notas para o time."
      />
    </div>
  )
}

function BudgetFields({
  data,
  onSet,
}: {
  data: Record<string, unknown>
  onSet: (key: string, value: unknown) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Picker
        label="Tipo de orçamento"
        options={META_BUDGET_MODES}
        value={data.budget_mode}
        onChange={(v) => onSet('budget_mode', v)}
      />
      <FormField label="Valor (R$)">
        {(props) => (
          <Input
            {...props}
            type="number"
            min={0}
            value={data.budget_amount === null ? '' : String(data.budget_amount ?? '')}
            onChange={(event) =>
              // Campo vazio vira null, não 0: "sem orçamento definido" é
              // diferente de "orçamento de zero reais", e a validação distingue.
              onSet('budget_amount', event.target.value === '' ? null : Number(event.target.value))
            }
          />
        )}
      </FormField>
    </div>
  )
}

function Picker({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string
  hint?: string
  options: Option[]
  value: unknown
  onChange: (value: string) => void
}) {
  return (
    <FormField label={label} hint={hint}>
      {(props) => (
        <Select value={String(value ?? '')} onValueChange={onChange}>
          <SelectTrigger {...props}>
            <SelectValue placeholder="Escolher" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  )
}

function Area({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string
  value: unknown
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <FormField label={label}>
      {(props) => (
        <Textarea
          {...props}
          rows={rows}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
    </FormField>
  )
}

function placeholderFor(type: CampaignNode['type']): string {
  if (type === 'campanha') return 'Vendas - Adesivos - Setembro'
  if (type === 'conjunto') return 'Lookalike 1% compradores'
  return 'Vídeo depoimento 30s'
}
