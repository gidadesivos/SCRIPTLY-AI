# Decisões e suposições — Fase 1

Registradas conforme protocolo §10.2 da constituição do projeto: no máximo 5
perguntas de bloqueio; quando não respondidas, assume-se o default mais
razoável e declara-se aqui.

## 1. Não existe projeto Supabase real ainda
Não tenho como criar um projeto Supabase (requer sua conta). O app está
pronto para conectar: `src/lib/supabase.ts` lê `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` do ambiente. Sem essas variáveis, o app **não
quebra** — mostra aviso amigável "backend não configurado" na tela de
login e desabilita o botão de entrar (evita N4: UI falsa).

**O que você precisa fazer:**
1. Criar um projeto em https://supabase.com.
2. Em Authentication → Providers, habilitar **Google** (precisa de Client
   ID/Secret criados no Google Cloud Console, com redirect URI
   `https://<seu-projeto>.supabase.co/auth/v1/callback`).
3. Rodar a migration: `supabase link --project-ref <ref>` e
   `supabase db push` (ou colar `supabase/migrations/0001_init.sql` no SQL
   Editor).
4. Copiar `.env.example` para `.env` e preencher `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
5. Rodar `supabase gen types typescript --project-id <id> > src/types/database.ts`
   para substituir o tipo escrito à mão por um gerado a partir do schema real.

## 2. Google OAuth é configuração externa, não código
Idem acima — não é algo que eu possa configurar por código (N10: não
inventar API/infra que não existe). O fluxo (`signInWithOAuth({ provider:
'google' })` → `/auth/callback` → `supabase.auth.getSession()`) está
implementado e pronto para funcionar assim que o provider estiver ativo no
Supabase.

## 3. Onboarding da Fase 1 é mínimo (só nome do workspace)
A constituição reserva o onboarding completo (6 passos, marca + produto)
para acompanhar o fluxo de `/create` na Fase 3. Aqui, um usuário sem
nenhum workspace vê uma tela simples pedindo apenas o nome — suficiente
para fechar o ciclo login → workspace → dashboard exigido no aceite da
Fase 1, sem inventar telas de marca/produto que ainda não existem.

## 4. React 18, não 19
O scaffold do Vite instalou React 19 por padrão; fixei em `^18.3.1` porque
a constituição especifica React 18 explicitamente (§4) e não reabre essa
decisão.

## 5. Tailwind v4
Não havia versão do Tailwind especificada além do nome. Usei a v4 (atual,
`@tailwindcss/postcss`), com tokens em `src/styles/tokens.css` mapeados
via `@theme inline` — equivalente ao padrão `tailwind.config.js` da v3
que os exemplos de shadcn/ui costumam usar.

## 6. UI verificada sem sessão real
Sem projeto Supabase conectado, não dá pra testar o fluxo de login real
com Google. Validei com Playwright: build de produção, typecheck,
renderização da tela de login (light/dark/mobile), ausência de erros de
console, e o guard de rota protegida redirecionando corretamente para
`/login` sem sessão. O shell autenticado (sidebar, dashboard, onboarding
de workspace) foi revisado por código mas não visualmente testado com uma
sessão real — fica como item para verificar assim que você conectar o
Supabase.
