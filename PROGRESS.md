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
| Auth e-mail + senha (login, cadastro, confirmação) | `src/features/auth/hooks/useAuth.tsx`, `LoginPage.tsx`, `AuthCallback.tsx` |
| Taxonomia de erro de auth em pt-BR | `src/lib/auth-errors.ts` — mapeia códigos do `AuthError` para mensagens humanas |
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
2. Copiar `.env.example` → `.env` e preencher com URL + publishable key do
   projeto (ver `DECISIONS.md` item 1).
3. **Rodar a migration** `supabase/migrations/0001_init.sql` no SQL Editor
   do dashboard. Sem isso, o login funciona mas o app não tem onde gravar.
4. `npm run dev` e abrir a URL local.
5. **Cadastro:** clicar "Criar conta" → nome, e-mail, senha (mín. 8) →
   se a confirmação de e-mail estiver ligada, aparece a tela "Confirme seu
   e-mail"; clicar no link recebido leva a `/auth/callback` e entra.
6. **Login:** e-mail + senha → cai em `/dashboard`. Senha errada mostra
   "E-mail ou senha incorretos.", não erro técnico.
7. Primeiro acesso sem workspace: tela de onboarding pedindo nome →
   criar → cai direto no dashboard com o workspace já ativo.
7. Criar um segundo workspace pelo seletor no rodapé da sidebar → trocar
   entre eles → o nome ativo persiste após reload (localStorage).
8. Fechar o navegador e abrir de novo → sessão continua logada
   (`persistSession: true` no cliente Supabase).
9. **Teste de isolamento (2 usuários):** cadastrar um segundo e-mail (aba
   anônima) → ele não vê os workspaces do primeiro usuário (RLS filtra por
   `workspace_members`).
10. Redimensionar para mobile (<768px) → sidebar vira botão de menu no
    topo → abre drawer lateral com os mesmos itens.

### Parcial / dívidas conhecidas

- **Migration ainda não rodada** no projeto `hsncbjxsbbtcpdmvbptc`. É o
  único passo que falta para o app funcionar de verdade. Bloqueado do meu
  lado: a rede desta sessão não alcança o host do Supabase (ver
  `DECISIONS.md` item 2b).
- **UI autenticada não testada com sessão real de ponta a ponta**, pelo
  mesmo motivo acima. Validado por typecheck, build e Playwright:
  renderização de login/cadastro, validação de formulário e guard de rota.
  O fluxo sidebar → dashboard → settings com sessão real ainda precisa ser
  conferido por você.
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

- **Funcionalidade:** login/cadastro, callback, workspace switch, tema e
  rotas protegidas funcionam no código; o não verificado ao vivo é tudo
  que depende do banco (ver dívidas acima).
- **Bug real encontrado e corrigido na auditoria:** o `PasswordInput` não
  encaminhava o `ref` do react-hook-form, então o campo de senha nunca
  registrava valor e o formulário vazava a mensagem técnica do Zod
  ("expected string, received undefined") — violação direta de §9.
  Corrigido com `forwardRef` (`LoginPage.tsx`) e verificado no browser:
  agora mostra "Informe sua senha.".
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
