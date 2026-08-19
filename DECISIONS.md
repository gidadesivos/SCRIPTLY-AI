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

**Status:** projeto criado (`hsncbjxsbbtcpdmvbptc`) e `.env` preenchido
localmente com URL + publishable key. Falta apenas rodar a migration.

**O que você precisa fazer:**
1. Abrir o **SQL Editor** do projeto no dashboard do Supabase.
2. Colar o conteúdo de `supabase/migrations/0001_init.sql` e executar.
   (Não consigo rodar daqui — ver item 2b abaixo.)
3. Opcional, para testar mais rápido: desligar a confirmação de e-mail em
   Authentication → Sign In / Up → Email → "Confirm email".
4. Depois, rodar `supabase gen types typescript --project-id hsncbjxsbbtcpdmvbptc > src/types/database.ts`
   para substituir o tipo escrito à mão por um gerado a partir do schema real.

**Sobre a `SUPABASE_SECRET_KEY`:** equivale ao antigo `service_role` —
ignora RLS por completo. Não está no repositório nem no `.env` do
frontend, e não é necessária ainda. Quando a Fase 3 trouxer Edge
Functions, o Supabase injeta essa chave no runtime delas automaticamente;
não precisa ser configurada à mão (N2).

## 2. Login por e-mail + senha, não Google (decisão revisada)
A constituição (§11) previa "Auth Google" no MVP. Trocamos para **e-mail +
senha** a pedido do usuário, por um motivo prático: o Google OAuth exige
criar credenciais no Google Cloud Console e colar Client ID/Secret no
Supabase — configuração externa em dois consoles, que travava o app.
E-mail + senha é nativo do Supabase e funciona sem nenhum passo externo.

O botão do Google foi **removido** da tela (não deixado desabilitado),
seguindo N4: nada de UI que não faz nada. Adicionar Google depois é
aditivo — o `AuthProvider` já isola o método de login do resto do app, e
a rota `/auth/callback` continua existindo (agora serve ao link de
confirmação de e-mail).

**Confirmação de e-mail:** por padrão o Supabase exige que o usuário
confirme o e-mail antes de liberar a sessão. O app trata isso: se o
cadastro não retorna sessão, mostra a tela "Confirme seu e-mail". Para
testar mais rápido, dá pra desligar em **Authentication → Sign In / Up →
Email → "Confirm email"** no dashboard.

## 2b. Este ambiente não alcança o seu Supabase
A rede desta sessão bloqueia `hsncbjxsbbtcpdmvbptc.supabase.co` por
política de egress (o proxy responde `403 Host not in allowlist`). Isso
vale para CLI, REST e connection string — nenhuma credencial resolve,
porque o tráfego não sai daqui. Consequência prática: **a migration
precisa ser rodada por você** (SQL Editor do dashboard, colando
`supabase/migrations/0001_init.sql`), e os testes de ponta a ponta contra
o banco real também são seus. O que dá pra validar aqui — build,
typecheck, renderização, validação de formulário — foi validado.

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
