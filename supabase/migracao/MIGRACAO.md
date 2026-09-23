# Migrar o Scriptly para outro projeto Supabase

Trocar de projeto preserva **tudo**: as 66 policies RLS, o login do Google, os
buckets e as Edge Functions. Nenhuma linha de código de aplicação muda. O que
muda é o endereço.

Nada aqui precisa de terminal.

---

## O que atravessa e o que não

| Atravessa | Como |
|---|---|
| Schema (17 migrations) | botão do Actions |
| Marcas, produtos, pastas, roteiros, cenas, versões, variações | `exportar.sql` |
| Planos de campanha, nós, ligações | `exportar.sql` |
| Escolha de modelos de IA por workspace | `exportar.sql` |
| Edge Functions | botão do Actions |

| NÃO atravessa | Por quê |
|---|---|
| `profiles` | criado por trigger quando você loga |
| `plan_limits` | semeado pelas próprias migrations |
| `ai_generations` | telemetria de uso: é o que mais pesa e não serve no destino |
| Arquivos do Storage | precisam ser rebaixados e resubidos à mão (poucos: logos de marca) |
| Membros convidados | o usuário deles não existe no projeto novo |

### Uma diferença conhecida, e inofensiva

O `updated_at` das **pastas** fica com a data da importação, não a original. O
trigger que valida a árvore reescreve esse campo em toda escrita, então não há
como preservá-lo — e ele não aparece em lugar nenhum da interface. Todo o resto
atravessa idêntico byte a byte, conferido por hash.

**O único valor remapeado é o seu id de usuário.** Todos os ids de workspace,
marca, roteiro e pasta são preservados, então nenhum vínculo interno se perde.

---

## Ordem

### 1. Criar o projeto novo
No painel do Supabase, numa organização com cota livre. Anote o **project ref**
(aparece na URL: `/project/<ref>`).

### 2. Aplicar o schema
GitHub → **Actions** → **Supabase** → **Run workflow**:

- `project_ref`: o ref do projeto **novo**
- `publicar_funcoes`: ✅
- `migrations`: **simular** primeiro (mostra o que faria, sem escrever)

Deu certo na simulação? Rode de novo com `migrations: aplicar`.

Antes disso, atualize os dois secrets em **Settings → Secrets and variables →
Actions** para os valores do projeto novo:
`SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD`.

### 3. Logar uma vez
Abra o app apontando para o projeto novo e entre com o Google.

> **NÃO crie workspace nenhum.** Ele vem na importação. Se criar, você fica
> com dois e o app abre no vazio.

Depois: painel → **Authentication → Users** → copie o **UUID** da sua linha.

### 4. Exportar os dados
No SQL Editor do projeto **ANTIGO**, cole e rode `supabase/migracao/exportar.sql`.

Ele devolve **uma única célula de texto**. Clique nela e copie tudo.

### 5. Importar
No SQL Editor do projeto **NOVO**, cole o que copiou. Troque
`COLE_AQUI_SEU_ID_DE_USUARIO` pelo UUID do passo 3. Rode.

No fim ele imprime as contagens — confira com as do projeto antigo.

### 6. Secrets das Edge Functions
Painel do projeto novo → **Edge Functions → Secrets**:
`GEMINI_API_KEY` e, se usar, `OPENROUTER_API_KEY`, `GROQ_API_KEY`,
`GEMINI_VIDEO_MODEL`.

### 7. Login do Google
Painel → **Authentication → Providers → Google**: mesmo Client ID e Secret do
projeto antigo. E no **Google Cloud Console**, adicione a nova URL de callback
(`https://<novo-ref>.supabase.co/auth/v1/callback`) às URIs autorizadas — sem
isso o login falha com `redirect_uri_mismatch`.

### 8. Apontar o app
Na **Vercel** → Settings → Environment Variables:

- `VITE_SUPABASE_URL` → `https://<novo-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY` → a chave anon do projeto novo

Redeploy. (No `.env` local, os mesmos dois valores.)

### 9. Buckets
Os buckets são criados pelas migrations, **vazios**. Rebaixe as logos de marca
do projeto antigo e suba no novo, mantendo o mesmo caminho
(`{workspace_id}/brands/{brand_id}/...`) — é dele que a policy lê o workspace.

Vídeos de referência não precisam: são temporários.

### 10. Conferir
- Roteiros aparecem na biblioteca, com as pastas certas
- Abrir um roteiro mostra as cenas
- Gerar um roteiro funciona (prova que as functions e os secrets estão de pé)
- Marcas e produtos intactos

---

## Depois

Quando estiver tudo de pé, **troque a senha do banco do projeto novo** se ela
passou por chat, e-mail ou qualquer lugar que não seja o cofre de secrets:
Project Settings → Database → Reset database password. E atualize o secret
`SUPABASE_DB_PASSWORD` no GitHub.

Só apague o projeto antigo **depois** de conferir o passo 10.
