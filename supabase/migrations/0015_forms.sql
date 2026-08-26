-- Adiciona o tipo de nó "formulario" para os formulários de leads nativos no Canvas
ALTER TYPE public.campaign_node_type ADD VALUE IF NOT EXISTS 'formulario';
