# Credenciais de Teste — CRM Admin Dashboard

Conta de QA com role `crm`, criada em 2026-08-14 pra permitir verificação real
(manual e via automação de browser) das páginas `/crm/*` em staging, sem
depender de uma conta de time real.

## Conta CRM (staging)

- **E-mail:** `qa-dashboard-crm-20260813@desafiotreinotrinca.test`
- **Senha:** `123456`
- **Projeto Supabase:** `lcylofpnwlwaicewhsfl` (staging — mesmo projeto do
  `VITE_SUPABASE_CRM_URL` do dashboard e do `SUPABASE_URL` do worker; ver
  `treino-trinca-app/docs/epics/epic-15-admin-crm-dashboard-integration.md`
  sobre a unificação de auth cross-Supabase).
- **`app_metadata`:** `{ "dashboard_role": "crm", "role": "admin" }`
  - `dashboard_role: "crm"` — gate de sidebar/rota do dashboard
    (`src/contexts/auth-context.tsx`, Stories 15.3/15.4).
  - `role: "admin"` — exigido por `adminGuard` no worker pra qualquer
    chamada real a `/admin/*` (sem isso, o dashboard carrega mas toda
    escrita/leitura admin retorna 403).

## Como foi criada

1. Usuário criado via Supabase Studio → Authentication → Users → Add user
   (e-mail + senha, autoconfirm).
2. Role aplicada via SQL Editor:
   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('dashboard_role', 'crm', 'role', 'admin')
   where email = 'qa-dashboard-crm-20260813@desafiotreinotrinca.test'
   returning id, email, raw_app_meta_data;
   ```
3. Senha definida/redefinida via SQL (`pgcrypto`):
   ```sql
   update auth.users
   set encrypted_password = crypt('123456', gen_salt('bf')),
       updated_at = now()
   where email = 'qa-dashboard-crm-20260813@desafiotreinotrinca.test';
   ```

## Uso

Login em `xboard-mv.vercel.app/login` (ou local, apontando `VITE_SUPABASE_CRM_URL`
para staging). Dá acesso a todas as páginas do grupo CRM (Usuários, Liberar
Usuário, Protocolos, Regras, Banners, Configurações, Avaliação, Exercícios) e
a chamadas reais `/admin/*` no worker.

**Escopo:** staging apenas. Não usar/replicar em produção
(`shyzagfnifqitpmyurol`) — crie uma conta de QA separada lá se necessário,
seguindo o mesmo processo.
