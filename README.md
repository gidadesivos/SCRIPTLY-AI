# Scriptly AI

Sistema operacional de criação de vídeos curtos: transforma uma ideia em
briefing, ângulo, hook, roteiro cena a cena, calendário e performance.

## Stack

Vite + React 18 + TypeScript strict, Tailwind CSS, shadcn/ui, React Router
v6, TanStack Query, Supabase (Postgres + Auth + Storage + Edge Functions),
Zod, react-hook-form.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencher com um projeto Supabase — ver DECISIONS.md
npm run dev
```

## Documentação do projeto

- `DECISIONS.md` — suposições assumidas e o que precisa ser configurado
  manualmente (projeto Supabase, Google OAuth).
- `PROGRESS.md` — o que está pronto, como testar, dívidas conhecidas.
- `supabase/migrations/` — schema do banco, versionado.

*(Forçando deploy Vercel)*
