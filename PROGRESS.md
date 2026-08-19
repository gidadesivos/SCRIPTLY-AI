# Progresso — Scriptly AI

## Fase 1 — Fundação (implementada)

### O que está pronto

| Item | Evidência |
|---|---|
| Projeto Vite + React 18 + TS strict | `npm run build` e `npx tsc -b` passam sem erros |
| Tailwind v4 + tokens de design (light/dark) | `src/styles/tokens.css`, `src/index.css` |
| shadcn/ui base copiado e editável | `src/components/ui/*` (button, input, label, card, avatar, dropdown-menu, dialog, sheet, skeleton, separator, sonner) |
| Tema light/dark/system, persistido, sem flash | `index.html` (script inline), `src/features/settings/hooks/useTheme.tsx`, testado visualmente (light/dark) |
| Cliente Supabase (só ANON KEY) | `src/lib/supabase.ts` — `isSupabaseConfigured` evita quebra silenciosa quando env vars faltam |
| TanStack Query | `src/lib/queryClient.ts`, usado em `useWorkspaces` |
| React Router v6 com rotas protegidas | `src/routes.tsx`, `src/features/auth/components/ProtectedRoute.tsx` |
| Auth Google (OAuth) + callback | `src/features/auth/hooks/useAuth.tsx`, `LoginPage.tsx`, `AuthCallback.tsx` |
| Migration `0001_init.sql`: profiles, workspaces, workspace_members | `supabase/migrations/0001_init.sql` |
| Funções `SECURITY DEFINER` (evitam recursão de RLS) | `is_workspace_member`, `has_workspace_role` na migration |
| RLS ativa com policies SELECT/INSERT/UPDATE/DELETE | todas as 3 tabelas da Fase 1 |
| Triggers `set_updated_at`, `handle_new_user` | migration |
| RPC transacional `create_workspace_with_owner` | migration + `src/features/workspaces/api.ts` |
| Onboarding mínimo (criar 1º workspace) | `src/features/workspaces/components/OnboardingPage.tsx` |
| Troca de workspace | `src/features/workspaces/components/WorkspaceSwitcher.tsx` |
| Sidebar desktop + drawer mobile | `src/components/AppShell.tsx`, `AppSidebar.tsx` |
| Dashboard (rota real, empty state honesto) | `src/features/dashboard/DashboardPage.tsx` — sem dado mockado (N4) |
| Configurações (perfil + tema + logout) | `src/features/settings/SettingsPage.tsx` |
| i18n pt-BR centralizado | `src/i18n/pt-BR.ts` |
| Nome do app centralizado | `src/config/brand.ts` |
| Navegação só com rotas reais (N4) | `src/config/navigation.ts` — apenas Dashboard e Configurações |
| Validação com Zod em formulário | `src/schemas/workspace.ts` + react-hook-form + zodResolver |
| `.env.example`, `.env` no `.gitignore` | raiz do projeto |

### Como testar

1. `npm install`
2. Copiar `.env.example` → `.env`, preencher com um projeto Supabase real
   (ver `DECISIONS.md` item 1 para o passo a passo completo, incluindo
   habilitar o provider Google e rodar a migration).
3. `npm run dev` e abrir a URL local.
4. **Sem `.env` preenchido:** a tela de login aparece com aviso amigável
   "backend não configurado" e o botão de login fica desabilitado — não
   quebra a tela (testado com Playwright, sem erros de console).
5. **Com `.env` preenchido e Google habilitado:** clicar "Continuar com
   Google" → completa OAuth → cai em `/auth/callback` → redireciona para
   `/dashboard`.
6. Primeiro acesso sem workspace: tela de onboarding pedindo nome →
   criar → cai direto no dashboard com o workspace já ativo.
7. Criar um segundo workspace pelo seletor no rodapé da sidebar → trocar
   entre eles → o nome ativo persiste após reload (localStorage).
8. Fechar o navegador e abrir de novo → sessão continua logada
   (`persistSession: true` no cliente Supabase).
9. **Teste de isolamento (2 usuários):** logar com uma segunda conta
   Google → ela não vê os workspaces do primeiro usuário (RLS filtra por
   `workspace_members`).
10. Redimensionar para mobile (<768px) → sidebar vira botão de menu no
    topo → abre drawer lateral com os mesmos itens.

### Parcial / dívidas conhecidas

- **UI autenticada não testada com sessão real de ponta a ponta.** Não há
  projeto Supabase/Google OAuth configurado neste ambiente (ver
  `DECISIONS.md`). Validado por code review + typecheck + build, mas o
  fluxo sidebar → dashboard → settings com uma sessão real ainda precisa
  ser conferido por você após conectar o Supabase.
- `src/types/database.ts` foi escrito à mão a partir da migration. Deve
  ser regenerado com `supabase gen types typescript` assim que o projeto
  existir, para garantir que reflita o schema real e não diverja.
- Bundle de produção está em ~751 kB (aviso do Vite, não erro). Aceitável
  para a Fase 1; revisar code-splitting por rota nas próximas fases
  conforme mais telas forem adicionadas.
- Nenhuma tabela de conteúdo (`brands`, `products`, `scripts`, etc.) foi
  criada ainda — é escopo da Fase 2 em diante, propositalmente fora
  desta entrega.

### Não iniciado

Tudo que está descrito nas Fases 2–8 do plano.

## Auto-auditoria (§14)

- **Funcionalidade:** login, callback, workspace switch, tema e rotas
  protegidas funcionam de ponta a ponta no código; o único ponto não
  verificado ao vivo é a autenticação real (depende de projeto Supabase
  externo — ver dívidas acima).
- **Segurança:** as 3 tabelas têm RLS ligada com policy para os 4
  comandos. Nenhum secret no bundle — `grep -r "SERVICE_ROLE\|GEMINI" src/`
  não retorna nada. Funções de policy usam `SECURITY DEFINER` para evitar
  a recursão clássica em `workspace_members`.
- **Banco:** índices em `workspace_members(user_id)` e
  `workspace_members(workspace_id)`; `workspace_id` com FK `on delete
  cascade`; `created_by` com `on delete restrict` (não permite apagar um
  usuário dono de workspace sem tratar isso explicitamente — decisão
  consciente, revisar se causar atrito).
- **IA:** nada nesta fase (Fase 3).
- **Performance:** nenhuma tela carrega listas grandes ainda; sem N+1
  (só queries diretas de tabela única).
- **UX:** login/onboarding com loading e erro tratados; dashboard com
  empty state; nenhuma ação sem feedback (toasts no create-workspace).
- **Mobile:** corrigido durante a auto-auditoria — botões de ícone
  usados fora do fluxo desktop (abrir menu, sair) estavam com alvo de
  toque de 36px; ajustados para 44px (`h-11 w-11`). Botões primários de
  login/onboarding também ajustados para 44px de altura.
- **Consistência:** um único componente `Button`/`Card`/etc. reusado em
  todas as telas; sem duplicação de padrão.

**Críticos encontrados:** nenhum após a correção de touch target acima.
**Importante:** validar o fluxo real de Google OAuth assim que o
Supabase estiver conectado (não posso simular isso sem credenciais).
**Cosmético:** bundle único de 751 kB — aceitável agora, revisar
code-splitting depois.
