# Deploy — melhor-versao-dashboard

> Mesmo padrão de deploy já usado por `treino-trinca-app/frontend` e
> `treino-trinca-app/app-treino` — Vercel, branch por ambiente. Ver
> `treino-trinca-app/docs/staging.md`/`docs/production.md` para o par
> equivalente do worker/frontend do app.

## Infraestrutura

| Componente | Plataforma | Detalhes |
|---|---|---|
| **Dashboard** | Vercel | Projeto `xboard-mv`, time `brunos-projects-88b111de` |
| **Staging** | Vercel | Branch `develop` |
| **Produção** | Vercel | Branch de produção (`main`) |

## Variáveis de ambiente por ambiente

Configuradas no dashboard da Vercel (Project Settings → Environment
Variables), escopo Preview (staging) / Production — os arquivos `.env`/
`.env.production` locais (gitignored) são só fallback de build/dev, nunca
a fonte de verdade do ambiente deployado.

| Variável | Staging | Produção | Client |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `https://zcaypxqrteoedzbdmagm.supabase.co` | `https://zcaypxqrteoedzbdmagm.supabase.co` (mesmo projeto — inalterado) | Tráfego (`src/lib/supabase.ts`) |
| `VITE_SUPABASE_ANON_KEY` | ver `.env` local | ver `.env.production` local | Tráfego |
| `VITE_DASHBOARD_TEAM_EMAIL` | ver `.env` local | ver `.env.production` local | Tráfego (`isAllowedTeamUser`) |
| `VITE_SUPABASE_CRM_URL` | `https://lcylofpnwlwaicewhsfl.supabase.co` | `https://shyzagfnifqitpmyurol.supabase.co` | CRM (`src/lib/supabase-crm.ts`) |
| `VITE_SUPABASE_CRM_ANON_KEY` | ver `.env` local | ver `.env.production` local | CRM |
| `VITE_API_URL` | `https://api3.desafiotreinotrinca.online` | `https://api.desafiotreinotrinca.online` | Worker (`/admin/*`, sem consumidor até a Story 15.5+) |

`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (Tráfego) apontam para o
mesmo projeto Supabase de campanhas nos dois ambientes — não há split de
staging/produção para o dashboard de Tráfego, só para o CRM (Story 15.1,
Decisão 4).

## Contas CRM (login no dashboard)

Autenticação de CRM é feita direto no Supabase Auth do app (`VITE_SUPABASE_CRM_URL`
acima), via `dashboard_role: "crm"` em `app_metadata` (Story 15.1, Decisão 2).
Não há tabela de usuários própria do dashboard — criar/editar conta é uma
operação direta no Supabase Auth do projeto correspondente.

| Ambiente | Projeto Supabase | E-mail |
|---|---|---|
| Produção | `shyzagfnifqitpmyurol` | `suportemelhorversao@gmail.com` |

> Senha não documentada aqui por segurança (este arquivo é versionado no
> git). Guardar/rotacionar a senha real no gerenciador de senhas do time.

## Como fazer deploy

```bash
npx vercel deploy --yes          # preview (staging, branch develop)
npx vercel deploy --prod --yes   # promoção para production alias
```

Igual ao padrão de `treino-trinca-app/frontend` — a Vercel builda com
`npm run build` (`tsc -b && vite build`), injetando as env vars
configuradas no dashboard do projeto por ambiente.

## Histórico

| Data | Descrição |
|---|---|
| 2026-08-13 | `docs/deploy.md` criado (Story 15.2) junto com o segundo client Supabase (`supabase-crm.ts`) e as 3 novas variáveis de ambiente (`VITE_SUPABASE_CRM_URL`, `VITE_SUPABASE_CRM_ANON_KEY`, `VITE_API_URL`). |
