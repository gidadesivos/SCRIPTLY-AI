import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FormField } from '@/components/FormField'
import { TagField, TextField, TextareaField } from '@/components/form-fields'
import { productFormSchema, type ProductFormValues } from '@/schemas/product'
import type { Product } from '@/features/products/api'
import type { Brand } from '@/features/brands/api'
import { strings } from '@/i18n/pt-BR'

const TABS = [
  { value: 'basics', label: 'Básico' },
  { value: 'value', label: 'Valor' },
  { value: 'offer', label: 'Oferta' },
  { value: 'faq', label: 'FAQ e links' },
]

function toFormValues(product: Product | undefined, fallbackBrandId: string): ProductFormValues {
  return {
    brand_id: product?.brand_id ?? fallbackBrandId,
    name: product?.name ?? '',
    category: product?.category ?? '',
    description: product?.description ?? '',
    target_audience: product?.target_audience ?? '',
    offer: product?.offer ?? '',
    price_range: product?.price_range ?? '',
    guarantee: product?.guarantee ?? '',
    default_cta: product?.default_cta ?? '',
    notes: product?.notes ?? '',
    benefits: product?.benefits ?? [],
    differentiators: product?.differentiators ?? [],
    problems_solved: product?.problems_solved ?? [],
    desires: product?.desires ?? [],
    objections: product?.objections ?? [],
    faq: product?.faq ?? [],
    links: product?.links ?? [],
  }
}

interface ProductFormProps {
  product?: Product
  brands: Brand[]
  isSaving: boolean
  onSubmit: (values: ProductFormValues) => void
}

export function ProductForm({ product, brands, isSaving, onSubmit }: ProductFormProps) {
  const { control, handleSubmit } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toFormValues(product, brands[0]?.id ?? ''),
  })

  const faq = useFieldArray({ control, name: 'faq' })
  const links = useFieldArray({ control, name: 'links' })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Tabs defaultValue="basics" className="flex flex-col gap-6">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="basics" className="flex flex-col gap-5">
          <Controller
            control={control}
            name="brand_id"
            render={({ field, fieldState }) => (
              <FormField label="Marca" error={fieldState.error?.message}>
                {(fieldProps) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...fieldProps}>
                      <SelectValue placeholder="Escolha uma marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            )}
          />
          <TextField
            control={control}
            name="name"
            label="Nome do produto"
            placeholder="Ex: Adesivo resinado"
          />
          <TextField
            control={control}
            name="category"
            label="Categoria"
            placeholder="Ex: Comunicação visual"
          />
          <TextareaField control={control} name="description" label="Descrição" />
          <TextareaField
            control={control}
            name="target_audience"
            label="Público-alvo"
            hint="Para quem esse produto é, especificamente."
            rows={3}
          />
        </TabsContent>

        <TabsContent value="value" className="flex flex-col gap-5">
          <TagField control={control} name="benefits" label="Benefícios" />
          <TagField control={control} name="differentiators" label="Diferenciais" />
          <TagField
            control={control}
            name="problems_solved"
            label="Problemas que resolve"
            placeholder="Ex: adesivo comum desbota em 3 meses"
          />
          <TagField control={control} name="desires" label="Desejos atendidos" />
          <TagField control={control} name="objections" label="Objeções" />
        </TabsContent>

        <TabsContent value="offer" className="flex flex-col gap-5">
          <TextareaField
            control={control}
            name="offer"
            label="Oferta"
            hint="O que exatamente está sendo oferecido."
            rows={3}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              control={control}
              name="price_range"
              label="Faixa de preço"
              placeholder="Ex: R$ 80 a R$ 250"
            />
            <TextField
              control={control}
              name="default_cta"
              label="CTA padrão"
              placeholder="Ex: Peça um orçamento"
            />
          </div>
          <TextareaField control={control} name="guarantee" label="Garantia" rows={3} />
          <TextareaField
            control={control}
            name="notes"
            label="Observações internas"
            hint="Notas para o time. Não vira conteúdo."
            rows={3}
          />
        </TabsContent>

        <TabsContent value="faq" className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">{strings.products.faq}</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11"
                onClick={() => faq.append({ question: '', answer: '' })}
              >
                <Plus className="h-4 w-4" />
                {strings.products.addFaq}
              </Button>
            </div>

            {faq.fields.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                Nenhuma pergunta cadastrada.
              </p>
            )}

            {faq.fields.map((item, index) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-md border border-border p-3">
                <Controller
                  control={control}
                  name={`faq.${index}.question`}
                  render={({ field, fieldState }) => (
                    <FormField label={strings.products.question} error={fieldState.error?.message}>
                      {(fieldProps) => <Input {...fieldProps} {...field} />}
                    </FormField>
                  )}
                />
                <Controller
                  control={control}
                  name={`faq.${index}.answer`}
                  render={({ field, fieldState }) => (
                    <FormField label={strings.products.answer} error={fieldState.error?.message}>
                      {(fieldProps) => <Textarea {...fieldProps} {...field} rows={3} />}
                    </FormField>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-11 self-start"
                  onClick={() => faq.remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                  {strings.products.remove}
                </Button>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">{strings.products.links}</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11"
                onClick={() => links.append({ label: '', url: '' })}
              >
                <Plus className="h-4 w-4" />
                {strings.products.addLink}
              </Button>
            </div>

            {links.fields.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                Nenhum link cadastrado.
              </p>
            )}

            {links.fields.map((item, index) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-md border border-border p-3">
                <Controller
                  control={control}
                  name={`links.${index}.label`}
                  render={({ field, fieldState }) => (
                    <FormField label={strings.products.linkLabel} error={fieldState.error?.message}>
                      {(fieldProps) => <Input {...fieldProps} {...field} />}
                    </FormField>
                  )}
                />
                <Controller
                  control={control}
                  name={`links.${index}.url`}
                  render={({ field, fieldState }) => (
                    <FormField label={strings.products.linkUrl} error={fieldState.error?.message}>
                      {(fieldProps) => (
                        <Input {...fieldProps} {...field} placeholder="https://..." />
                      )}
                    </FormField>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-11 self-start"
                  onClick={() => links.remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                  {strings.products.remove}
                </Button>
              </div>
            ))}
          </section>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" className="h-11" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? 'Salvando…' : 'Salvar produto'}
        </Button>
      </div>
    </form>
  )
}
