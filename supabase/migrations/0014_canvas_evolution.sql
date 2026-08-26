-- =========================================================================
-- Evolução para Whiteboard (Miro-like)
--
-- Relaxamento das regras rígidas do Meta Ads no banco de dados para
-- permitir conexões flexíveis, post-its, frames, formas, etc.
-- =========================================================================

-- 1. Adicionar os novos tipos de nós auxiliares no ENUM
ALTER TYPE public.campaign_node_type ADD VALUE 'publico';
ALTER TYPE public.campaign_node_type ADD VALUE 'landing_page';
ALTER TYPE public.campaign_node_type ADD VALUE 'whatsapp';
ALTER TYPE public.campaign_node_type ADD VALUE 'oferta';
ALTER TYPE public.campaign_node_type ADD VALUE 'pixel_evento';
ALTER TYPE public.campaign_node_type ADD VALUE 'observacao';
ALTER TYPE public.campaign_node_type ADD VALUE 'meta_kpi';
ALTER TYPE public.campaign_node_type ADD VALUE 'nota';
ALTER TYPE public.campaign_node_type ADD VALUE 'frame';
ALTER TYPE public.campaign_node_type ADD VALUE 'texto';
ALTER TYPE public.campaign_node_type ADD VALUE 'forma';

-- 2. Remover a restrição rígida de árvore estrutural (que bloqueava unlinking)
ALTER TABLE public.campaign_nodes DROP CONSTRAINT IF EXISTS campaign_nodes_root_is_campaign;

-- 3. Substituir o Trigger que bloqueava hierarquias flexíveis
-- Mantendo apenas a validação de workspace do roteiro vinculado
CREATE OR REPLACE FUNCTION public.validate_campaign_node()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_script_workspace uuid;
BEGIN
  -- Integridade entre workspaces do roteiro vinculado.
  IF NEW.script_id IS NOT NULL THEN
    SELECT workspace_id INTO v_script_workspace
    FROM public.scripts WHERE id = NEW.script_id;

    IF v_script_workspace IS DISTINCT FROM NEW.workspace_id THEN
      RAISE EXCEPTION 'O roteiro pertence a outro workspace.' USING errcode = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Expandir a tabela de Links (conexões genéricas)
ALTER TABLE public.campaign_links
  ADD COLUMN source_handle text,
  ADD COLUMN target_handle text,
  ADD COLUMN type text,
  ADD COLUMN style jsonb;
