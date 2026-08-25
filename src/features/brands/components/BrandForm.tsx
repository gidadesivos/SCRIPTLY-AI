import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TagField, TextField, TextareaField } from '@/components/form-fields'
import { brandFormSchema, type BrandFormValues } from '@/schemas/brand'
import type { Brand } from '@/features/brands/api'

const TABS = [
  { value: 'identity', label: 'Identidade' },
  { value: 'positioning', label: 'Posicionamento' },
  { value: 'audience', label: 'Público' },
  { value: 'voice', label: 'Voz' },
  { value: 'proofs', label: 'Provas' },
  { value: 'ai', label: 'Instruções de IA' },
]

function toFormValues(brand?: Brand): BrandFormValues {
  return {
    name: brand?.name ?? '',
    description: brand?.description ?? '',
    industry: brand?.industry ?? '',
    website: brand?.website ?? '',
    instagram: brand?.instagram ?? '',
    country: brand?.country ?? '',
    language: brand?.language ?? 'pt-BR',
    value_proposition: brand?.value_proposition ?? '',
    positioning: brand?.positioning ?? '',
    tone: brand?.tone ?? '',
    personality: brand?.personality ?? '',
    ai_instructions: brand?.ai_instructions ?? '',
    target_audiences: brand?.target_audiences ?? [],
    pains: brand?.pains ?? [],
    desires: brand?.desires ?? [],
    objections: brand?.objections ?? [],
    differentiators: brand?.differentiators ?? [],
    benefits: brand?.benefits ?? [],
    proofs: brand?.proofs ?? [],
    preferred_words: brand?.preferred_words ?? [],
    forbidden_words: brand?.forbidden_words ?? [],
    preferred_ctas: brand?.preferred_ctas ?? [],
    competitors: brand?.competitors ?? [],
  }
}

interface BrandFormProps {
  brand?: Brand
  isSaving: boolean
  onSubmit: (values: BrandFormValues) => void
  /** Renderizado dentro da aba Identidade — só existe quando a marca já tem id. */
  logoSlot?: React.ReactNode
}

export function BrandForm({ brand, isSaving, onSubmit, logoSlot }: BrandFormProps) {
  const { control, handleSubmit } = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: toFormValues(brand),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Tabs defaultValue="identity" className="flex flex-col gap-6">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="identity" className="flex flex-col gap-5">
          {logoSlot}
          <TextField control={control} name="name" label="Nome da marca" placeholder="Ex: Café Aurora" />
          <TextareaField
            control={control}
            name="description"
            label="Descrição"
            hint="O que a marca faz, em poucas linhas."
            ai
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField control={control} name="industry" label="Setor" placeholder="Ex: Alimentação" />
            <TextField control={control} name="country" label="País" placeholder="Ex: Brasil" />
            <TextField control={control} name="website" label="Site" placeholder="https://..." />
            <TextField control={control} name="instagram" label="Instagram" placeholder="@perfil" />
          </div>
        </TabsContent>

        <TabsContent value="positioning" className="flex flex-col gap-5">
          <TextareaField
            control={control}
            name="value_proposition"
            label="Proposta de valor"
            hint="A promessa central da marca, em uma frase."
            ai
          />
          <TextareaField
            control={control}
            name="positioning"
            label="Posicionamento"
            hint="Como a marca quer ser percebida frente aos concorrentes."
            ai
          />
          <TagField
            control={control}
            name="differentiators"
            label="Diferenciais"
            hint="O que só essa marca tem."
            ai
          />
          <TagField control={control} name="benefits" label="Benefícios" ai />
        </TabsContent>

        <TabsContent value="audience" className="flex flex-col gap-5">
          <TagField
            control={control}
            name="target_audiences"
            label="Públicos-alvo"
            placeholder="Ex: donas de cafeteria de bairro"
            ai
          />
          <TagField control={control} name="pains" label="Dores" ai />
          <TagField control={control} name="desires" label="Desejos" ai />
          <TagField
            control={control}
            name="objections"
            label="Objeções"
            hint="O que faz o público hesitar antes de comprar."
            ai
          />
        </TabsContent>

        <TabsContent value="voice" className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField control={control} name="tone" label="Tom" placeholder="Ex: direto, próximo" ai />
            <TextField
              control={control}
              name="personality"
              label="Personalidade"
              placeholder="Ex: especialista acessível"
              ai
            />
          </div>
          <TagField control={control} name="preferred_words" label="Palavras preferidas" ai />
          <TagField
            control={control}
            name="forbidden_words"
            label="Palavras proibidas"
            hint="A IA nunca vai usar estas palavras."
            ai
          />
          <TagField control={control} name="preferred_ctas" label="CTAs preferidos" ai />
        </TabsContent>

        <TabsContent value="proofs" className="flex flex-col gap-5">
          <TagField
            control={control}
            name="proofs"
            label="Provas"
            hint="Dados, casos e resultados reais. A IA só pode citar o que estiver aqui."
            ai
          />
          <TagField control={control} name="competitors" label="Concorrentes" ai />
        </TabsContent>

        <TabsContent value="ai" className="flex flex-col gap-5">
          <TextareaField
            control={control}
            name="ai_instructions"
            label="Instruções para a IA"
            rows={10}
            hint="Regras específicas desta marca que a IA deve seguir ao gerar conteúdo."
            ai
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" className="h-11" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? 'Salvando…' : 'Salvar marca'}
        </Button>
      </div>
    </form>
  )
}
