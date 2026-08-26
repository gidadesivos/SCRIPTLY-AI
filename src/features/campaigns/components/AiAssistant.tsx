import { useState } from 'react'
import { Sparkles, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { CampaignNode } from '@/features/campaigns/types'

interface AiAssistantProps {
  nodes: CampaignNode[]
}

export function AiAssistant({ nodes }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)

  async function handleAnalyze() {
    if (nodes.length === 0) return
    setIsAnalyzing(true)
    setAnalysisResult(null)

    try {
      // Montamos o payload reduzido para o LLM não estourar tokens
      const payload = nodes.map(n => ({
        type: n.type,
        label: n.label,
        budget: (n.data as any).budget_amount || 0,
        objective: (n.data as any).objective || 'N/A'
      }))

      // Invoca a função Edge de IA configurada no projeto
      const prompt = `Atue como um gestor de tráfego sênior. Aqui está a estrutura da minha campanha de Meta Ads:\n${JSON.stringify(payload, null, 2)}\n\nPor favor, retorne 3 sugestões curtas de otimização estrutural e de investimento para esta campanha. Formate em texto simples.`
      
      const { data, error } = await supabase.functions.invoke<{ data: string }>('ai-generate', {
        body: { prompt }
      })

      if (error || !data) {
        throw error || new Error('No data returned')
      }

      setAnalysisResult(data.data ?? 'Não foi possível gerar sugestões neste momento.')
    } catch (err) {
      console.error('Erro na IA:', err)
      setAnalysisResult('Ocorreu um erro ao comunicar com a Inteligência Artificial. Certifique-se de que a Edge Function está configurada.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-[#6D4AFF] p-0 text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#6D4AFF]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        title="Consultar Assistente de Tráfego"
      >
        <Sparkles className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 max-w-[calc(100vw-3rem)] rounded-xl border border-[#23232F] bg-[#14141C] p-4 text-[#EDEDF2] shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between border-b border-[#23232F] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#6D4AFF]" />
              <h3 className="font-semibold text-sm">Assistente de Tráfego IA</h3>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded hover:bg-[#23232F] text-muted-foreground" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto text-sm leading-relaxed max-h-72">
            {!analysisResult && !isAnalyzing && (
              <p className="text-muted-foreground">Posso analisar a estrutura da sua campanha e sugerir melhorias de orçamento e público.</p>
            )}
            
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-[#6D4AFF]" />
                <span className="text-xs">Analisando nós da campanha...</span>
              </div>
            )}
            
            {analysisResult && (
              <div className="whitespace-pre-wrap text-sm text-[#EDEDF2]">
                {analysisResult}
              </div>
            )}
          </div>

          {!isAnalyzing && (
            <Button 
              onClick={handleAnalyze} 
              className="w-full bg-[#6D4AFF] text-white hover:bg-[#6D4AFF]/90"
            >
              {analysisResult ? 'Analisar Novamente' : 'Analisar Estrutura'}
            </Button>
          )}
        </div>
      )}
    </>
  )
}
