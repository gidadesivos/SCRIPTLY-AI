-- =========================================================================
-- Plano da conta fundadora
--
-- Dado, não schema: mora numa migration própria para o repositório e o banco
-- não divergirem. Casa por e-mail, não por id, porque ids são gerados e um
-- ambiente novo teria outros.
--
-- Em um ambiente onde este e-mail não existe, o update afeta zero linhas e a
-- migration passa mesmo assim.
-- =========================================================================
update public.workspaces w
set plan = 'unlimited'
from public.workspace_members m
join auth.users u on u.id = m.user_id
where m.workspace_id = w.id
  and m.role = 'owner'
  and u.email = 'meryetiquetas@gmail.com';
