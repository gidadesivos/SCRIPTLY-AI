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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FormField } from '@/components/FormField'
import { TagInput } from '@/components/TagInput'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ArrowDown, ArrowUp, Loader2, Plus, RefreshCw, Trash2, Star } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AiError, fetchLinkPreview } from '@/lib/ai'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { strings } from '@/i18n/pt-BR'
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
  PLATFORMS,
  FUNNELS,
  STATUS_OPTIONS
} from '@/features/campaigns/meta-options'
import { ScriptPicker } from '@/features/campaigns/components/ScriptPicker'
import { MediaField } from '@/features/campaigns/components/MediaField'
import { AdCopyGenerator } from '@/features/campaigns/components/AdCopyGenerator'
import type { MediaKind } from '@/features/campaigns/types'
import {
  DEFAULT_LEAD_FIELDS,
  FIELD_TYPES,
  fieldTypeLabel,
  type CampaignNode,
  type CampaignTask,
  type FormField as LeadField,
} from '@/features/campaigns/types'
import type { Option } from '@/config/options'

interface NodeInspectorProps {
  node: CampaignNode
  scriptContext: string
  onChange: (patch: {
    label?: string
    data?: Record<string, unknown>
    script_id?: string | null
    media_url?: string
    media_kind?: MediaKind
  }) => void
}

export function NodeInspector({ node, scriptContext, onChange }: NodeInspectorProps) {
  const { activeWorkspace } = useActiveWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''
  const data = node.data as Record<string, unknown>
  const set = (key: string, value: unknown) => onChange({ data: { ...data, [key]: value } })

  /* Construtor de formulário. Todas as edições passam por setFields, para que
     exista UM ponto que grava — e não uma cópia de `[...campos]` por botão. */
  const fields = ((data.form_fields as LeadField[] | undefined) ?? []) as LeadField[]
  const setFields = (next: LeadField[]) => set('form_fields', next)
  const patchField = (index: number, patch: Partial<LeadField>) =>
    setFields(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  /*
   * O preview vem da Edge Function, não do navegador: fetch de site de terceiro
   * esbarra em CORS, e a busca no servidor ainda passa pelo filtro de SSRF.
   */
  const preview = useMutation({
    mutationFn: (url: string) => fetchLinkPreview(workspaceId, url),
    onSuccess: (resultado) => {
      onChange({
        data: {
          ...data,
          url: resultado.url,
          preview_title: resultado.title,
          preview_description: resultado.description,
          preview_image: resultado.image,
          preview_site: resultado.site,
        },
      })
      toast.success('Preview atualizado.')
    },
    onError: (erro) =>
      toast.error(erro instanceof AiError ? erro.message : strings.errors.unexpected),
  })

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= fields.length) return
    const next = [...fields]
    ;[next[index], next[target]] = [next[target], next[index]]
    setFields(next)
  }

  return (
    <div className="flex flex-col">
      <Accordion type="multiple" defaultValue={['geral', 'tarefas', 'config', 'orcamento', 'publico', 'criativo', 'observacoes']} className="w-full">
        <AccordionItem value="geral" className="border-b border-border/60">
          <AccordionTrigger>Geral</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4">
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
            
            <Picker
              label="Status"
              options={STATUS_OPTIONS}
              value={data.status}
              onChange={(v) => set('status', v)}
            />

            <Area
              label="Descrição"
              value={data.description}
              onChange={(v) => set('description', v)}
              rows={2}
            />

            <FormField label="Responsável">
              {(props) => (
                <Input
                  {...props}
                  value={String(data.assignee ?? '')}
                  onChange={(event) => set('assignee', event.target.value)}
                  placeholder="Nome do responsável"
                />
              )}
            </FormField>

            <FormField label="Tags">
              {(props) => (
                <TagInput
                  {...props}
                  value={(data.tags as string[]) ?? []}
                  onChange={(tags) => set('tags', tags)}
                  label="Tags"
                  placeholder="Adicionar tag..."
                />
              )}
            </FormField>
          </AccordionContent>
        </AccordionItem>

        {node.type === 'campanha' && (
          <AccordionItem value="config">
            <AccordionTrigger>Configuração</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4">
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
                label="Plataforma"
                options={PLATFORMS}
                value={data.platform}
                onChange={(v) => set('platform', v)}
              />
              <Picker
                label="Funil"
                options={FUNNELS}
                value={data.funnel}
                onChange={(v) => set('funnel', v)}
              />
              <FormField label="Produto/Serviço">
                {(props) => (
                  <Input
                    {...props}
                    value={String(data.product ?? '')}
                    onChange={(event) => set('product', event.target.value)}
                  />
                )}
              </FormField>
              <FormField label="Oferta">
                {(props) => (
                  <Input
                    {...props}
                    value={String(data.offer ?? '')}
                    onChange={(event) => set('offer', event.target.value)}
                  />
                )}
              </FormField>
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
            </AccordionContent>
          </AccordionItem>
        )}

        {(node.type === 'campanha' || node.type === 'conjunto') && (
          <AccordionItem value="orcamento">
            <AccordionTrigger>Orçamento & Programação</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4">
              {node.type === 'campanha' && (
                <Picker
                  label="Onde fica o orçamento"
                  hint="CBO na campanha ou ABO nos conjuntos."
                  options={META_BUDGET_LEVELS}
                  value={data.budget_level}
                  onChange={(v) => set('budget_level', v)}
                />
              )}
              
              {(node.type === 'conjunto' || data.budget_level === 'campaign') && (
                <BudgetFields data={data} onSet={set} />
              )}

              {node.type === 'campanha' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Data de Início">
                    {(props) => (
                      <Input
                        {...props}
                        type="date"
                        value={String(data.start_date ?? '')}
                        onChange={(event) => set('start_date', event.target.value)}
                      />
                    )}
                  </FormField>
                  <FormField label="Data de Término">
                    {(props) => (
                      <Input
                        {...props}
                        type="date"
                        value={String(data.end_date ?? '')}
                        onChange={(event) => set('end_date', event.target.value)}
                      />
                    )}
                  </FormField>
                </div>
              )}

              {node.type === 'conjunto' && (
                <Area
                  label="Programação"
                  value={data.schedule}
                  onChange={(v) => set('schedule', v)}
                  placeholder="Ex: 01/09 a 30/09, o dia todo"
                />
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {node.type === 'conjunto' && (
          <AccordionItem value="publico">
            <AccordionTrigger>Público & Otimização</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4">
              <Picker
                label="Otimização"
                options={META_OPTIMIZATION_GOALS}
                value={data.optimization_goal}
                onChange={(v) => set('optimization_goal', v)}
              />
              {data.optimization_goal === 'conversions' && (
                <FormField label="Evento de conversão">
                  {(props) => (
                    <Input
                      {...props}
                      value={String(data.conversion_event ?? '')}
                      onChange={(event) => set('conversion_event', event.target.value)}
                      placeholder="Ex: Purchase, Lead"
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
                placeholder="Ex: lookalike 1%"
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
                <FormField label="Gênero">
                  {(props) => (
                    <Input
                      {...props}
                      value={String(data.gender ?? '')}
                      onChange={(event) => set('gender', event.target.value)}
                      placeholder="Todos"
                    />
                  )}
                </FormField>
              </div>

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

              <FormField label="Interesses">
                {(props) => (
                  <TagInput
                    {...props}
                    value={(data.interests as string[]) ?? []}
                    onChange={(tags) => set('interests', tags)}
                    label="Interesses"
                    placeholder="Adicionar interesse..."
                  />
                )}
              </FormField>
              
              <Area
                label="Exclusões"
                value={data.exclusions}
                onChange={(v) => set('exclusions', v)}
                placeholder="Ex: Compradores 180d"
                rows={2}
              />

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
                />
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {node.type === 'anuncio' && (
          <AccordionItem value="criativo">
            <AccordionTrigger>Criativo & Copy</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4">
              <ScriptPicker
                scriptId={node.script_id}
                onChange={(scriptId) => onChange({ script_id: scriptId })}
              />

              <MediaField
                url={node.media_url}
                kind={node.media_kind}
                onChange={(patch) => onChange(patch)}
              />

              <AdCopyGenerator
                format={String(data.format ?? '')}
                cta={String(data.cta ?? '')}
                scriptContext={scriptContext}
                onApply={(copy) =>
                  onChange({
                    data: {
                      ...data,
                      primary_text: copy.primary_text,
                      headline: copy.headline,
                      description: copy.description || data.description,
                      cta: data.cta || copy.cta_suggestion,
                    },
                  })
                }
              />

              <Picker
                label="Formato"
                options={META_AD_FORMATS}
                value={data.format}
                onChange={(v) => set('format', v)}
              />

              <FormField label="Ângulo">
                {(props) => (
                  <Input
                    {...props}
                    value={String(data.angle ?? '')}
                    onChange={(event) => set('angle', event.target.value)}
                    placeholder="Ex: Dor / Solução"
                  />
                )}
              </FormField>

              <FormField label="Hook (Gancho)">
                {(props) => (
                  <Input
                    {...props}
                    value={String(data.hook ?? '')}
                    onChange={(event) => set('hook', event.target.value)}
                    placeholder="Primeiros 3 segundos"
                  />
                )}
              </FormField>

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
              
              <Picker
                label="Botão"
                options={META_CTAS}
                value={data.cta}
                onChange={(v) => set('cta', v)}
              />
              <FormField label="Destino (URL)">
                {(props) => (
                  <Input
                    {...props}
                    value={String(data.destination ?? '')}
                    onChange={(event) => set('destination', event.target.value)}
                    placeholder="https://..."
                  />
                )}
              </FormField>

              <FormField label="WhatsApp">
                {(props) => (
                  <Input
                    {...props}
                    value={String(data.whatsapp ?? '')}
                    onChange={(event) => set('whatsapp', event.target.value)}
                    placeholder="Ex: +55 (11) 99999-9999"
                  />
                )}
              </FormField>

              <FormField label="UTM">
                {(props) => (
                  <Input
                    {...props}
                    value={String(data.utm ?? '')}
                    onChange={(event) => set('utm', event.target.value)}
                    placeholder="utm_source=meta..."
                  />
                )}
              </FormField>
            </AccordionContent>
          </AccordionItem>
        )}

        {node.type === 'landing_page' && (
          <AccordionItem value="destino_pagina">
            <AccordionTrigger>Página de destino</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-3">
              <FormField label="Endereço">
                {(props) => (
                  <Input
                    {...props}
                    value={String(data.url ?? '')}
                    onChange={(event) => set('url', event.target.value)}
                    placeholder="https://sua-pagina.com.br"
                  />
                )}
              </FormField>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                disabled={!String(data.url ?? '').trim() || preview.isPending}
                onClick={() => preview.mutate(String(data.url ?? ''))}
              >
                {preview.isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                )}
                Buscar preview
              </Button>

              {/* O que aparece no card é o que o próprio site publica para ser
                  compartilhado. Editável porque nem todo site preenche bem. */}
              <FormField label="Título do preview">
                {(props) => (
                  <Input
                    {...props}
                    value={String(data.preview_title ?? '')}
                    onChange={(event) => set('preview_title', event.target.value)}
                    placeholder="Preenchido ao buscar"
                  />
                )}
              </FormField>
            </AccordionContent>
          </AccordionItem>
        )}

        {node.type === 'whatsapp' && (
          <AccordionItem value="destino_whatsapp">
            <AccordionTrigger>Destino WhatsApp</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-3">
              <FormField label="Número" hint="Com DDI e DDD, como o Meta pede.">
                {(props) => (
                  <Input
                    {...props}
                    value={String(data.phone ?? '')}
                    onChange={(event) => set('phone', event.target.value)}
                    placeholder="+55 11 99999-9999"
                  />
                )}
              </FormField>
              <Area
                label="Mensagem inicial"
                value={data.message}
                onChange={(v) => set('message', v)}
                rows={3}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {node.type === 'formulario' && (
          <AccordionItem value="form_builder">
            <AccordionTrigger>Campos do formulário</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-3">
              <p className="text-[11px] text-muted-foreground">
                É o que o lead vê e preenche. A ordem aqui é a ordem no formulário.
              </p>

              {fields.length === 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() =>
                    setFields(
                      DEFAULT_LEAD_FIELDS.map((f) => ({
                        id: crypto.randomUUID(),
                        label: f.label,
                        type: f.type,
                        required: true,
                        options: [],
                        help: '',
                      })),
                    )
                  }
                >
                  <Star className="mr-1 h-3.5 w-3.5" />
                  Começar com Nome, WhatsApp e E-mail
                </Button>
              )}

              {fields.map((field, i) => (
                <div
                  key={field.id || i}
                  className="flex flex-col gap-2 rounded border border-border/50 bg-muted/20 p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {i + 1}. {fieldTypeLabel(field.type)}
                    </span>
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        aria-label="Subir campo"
                        disabled={i === 0}
                        onClick={() => moveField(i, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        aria-label="Descer campo"
                        disabled={i === fields.length - 1}
                        onClick={() => moveField(i, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 hover:text-destructive"
                        aria-label={`Remover campo ${i + 1}`}
                        onClick={() => setFields(fields.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8 flex-1 text-xs"
                      placeholder="Pergunta (ex: Possui arte/design?)"
                      value={field.label}
                      onChange={(e) => patchField(i, { label: e.target.value })}
                    />
                    <select
                      className="h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs outline-none"
                      aria-label={`Tipo do campo ${i + 1}`}
                      value={field.type}
                      onChange={(e) => patchField(i, { type: e.target.value })}
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lista sem opção nenhuma não é uma lista: o campo aparece
                      para o lead sem nada para escolher. */}
                  {field.type === 'select' && (
                    <Input
                      className="h-8 text-xs"
                      placeholder="Opções separadas por vírgula"
                      value={(field.options ?? []).join(', ')}
                      onChange={(e) =>
                        patchField(i, {
                          options: e.target.value
                            .split(',')
                            .map((o) => o.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  )}

                  <Input
                    className="h-8 text-xs"
                    placeholder="Dica abaixo do campo (opcional)"
                    value={field.help ?? ''}
                    onChange={(e) => patchField(i, { help: e.target.value })}
                  />

                  <label className="mt-1 flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={field.required}
                      onCheckedChange={(c) => patchField(i, { required: Boolean(c) })}
                    />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Obrigatório
                    </span>
                  </label>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="mt-1 w-full text-xs"
                onClick={() =>
                  setFields([
                    ...fields,
                    {
                      id: crypto.randomUUID(),
                      label: '',
                      type: 'text',
                      required: true,
                      options: [],
                      help: '',
                    },
                  ])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Adicionar campo
              </Button>

              <div className="mt-1 flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Texto do botão
                </span>
                <Input
                  className="h-8 text-xs"
                  placeholder="Cadastre-se"
                  value={String(data.submit_label ?? '')}
                  onChange={(e) => set('submit_label', e.target.value)}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="tarefas">
          <AccordionTrigger>Checklist / Tarefas</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3">
            {((data.tasks as CampaignTask[]) ?? []).map((task, i) => (
              <div key={task.id} className="flex items-center gap-2">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(c) => {
                    const next = [...((data.tasks as CampaignTask[]) ?? [])]
                    next[i] = { ...task, completed: !!c }
                    set('tasks', next)
                  }}
                />
                <Input
                  value={task.text}
                  placeholder="Descrição da tarefa"
                  onChange={(e) => {
                    const next = [...((data.tasks as CampaignTask[]) ?? [])]
                    next[i] = { ...task, text: e.target.value }
                    set('tasks', next)
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    const next = ((data.tasks as CampaignTask[]) ?? []).filter((t) => t.id !== task.id)
                    set('tasks', next)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="mt-1 w-full border-dashed"
              onClick={() => {
                const newTask: CampaignTask = { id: crypto.randomUUID(), text: '', completed: false }
                const next = [...((data.tasks as CampaignTask[]) ?? []), newTask]
                set('tasks', next)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Tarefa
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="observacoes">
          <AccordionTrigger>Observações</AccordionTrigger>
          <AccordionContent>
            <Area
              label=""
              value={data.notes}
              onChange={(v) => set('notes', v)}
              placeholder="Notas para o time."
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
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
