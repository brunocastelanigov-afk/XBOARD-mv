# Validação Story 1.5 — Rastreamento Lastlink Real (documento interino)

> **Status deste documento**: **INTERINO / PARCIAL**. Cobre apenas o que pôde ser validado sem acesso à conta Lastlink `brunocastelanigov@gmail.com` e sem uma decisão de deploy do stakeholder (Story 1.5, Tasks 1/2/5). Não deve ser lido como o veredito final da Story 1.5 — ver seção "Pendências" para o que falta.

## Veredito por critério de sucesso do goal original

| # | Critério de sucesso | Status | Evidência |
|---|---|---|---|
| 1 | Evento de teste disparado **pela própria Lastlink** contra o worker, payload real analisado | ✅ **Confirmado** | Worker deployado em produção (`desafio-treino-trinca-worker`, conta `brunocastelanigov@gmail.com`) com o secret `LASTLINK_WEBHOOK_TOKEN` real. A Lastlink disparou (via seu próprio recurso de reenvio/teste de webhook) uma bateria real de eventos `Purchase_Order_Confirmed`/`Payment_Refund`/`Payment_Chargeback` com `IsTest:true` e `buyer_email="test.email@mail.com"` — todos processados e gravados corretamente em `funnel_events`. Ver "Achados" abaixo. |
| 2 | Múltiplos user-flows reais testados (captura → envio → processamento → dashboard) | ⚠️ **Parcial** | Confirmado do lado do nosso sistema com o formato pipe-delimited do TikTok (funil real via Playwright + worker real + Supabase real). Os eventos de teste reais da Lastlink (item 1) usaram UTM genérico/placeholder da própria Lastlink, não o formato TikTok específico do goal — **ainda falta** um teste real com esse formato exato passando pelo checkout de verdade. |
| 3 | Evento real de IC/abandono configurado e testado | ⚠️ **Parcial** | `Abandoned_Cart` implementado, testado localmente e deployado em produção. A bateria de teste que a Lastlink disparou **não incluiu** um `Abandoned_Cart` (só os 4 tipos de compra/estorno) — **ainda falta** disparar esse evento especificamente. |
| 4 | Resolução de upsell confirmada | ✅ **Confirmado com evidência real** | Entre os eventos reais de teste da Lastlink havia um par `purchase`→`purchase_upsell` com o mesmo `buyer_email`; o worker resolveu corretamente via crosswalk de e-mail (`attribution_status:"matched"` no upsell). |

**Achado inesperado e relevante**: assim que o worker foi deployado, a Lastlink também **reentregou webhooks reais (não-teste) de compras que já tinham acontecido antes do deploy** (retry automático de entregas que falhavam com 404 até agora) — incluindo vendas reais de um produto chamado **"Comunidade Trinca Elite"**, com e-mails de compradores reais e UTM real (`utm_source=google`, `utm_source=SMSFunnel`). Isso confirma que o mecanismo de webhook/retry da Lastlink funciona como esperado, mas também revela que **essas vendas reais estão "unmatched"** (sem `lead_id`/campanha resolvida) — esperado, já que o funil ainda não foi deployado com a URL de checkout taggeada (Story 1.1, Task 1) e esse produto pode nem fazer parte do funil `desafio_treino_trinca`. Isso não é um bug: `rpc_campaign_roi` já expõe essa receita separadamente em `unmatched_revenue_cents`, sem misturar com receita atribuída — mas é uma informação nova para o stakeholder avaliar (pode haver mais de um produto/funil gerando receita na mesma conta Lastlink).

## Achados confirmados

### 1. A Lastlink TEM um evento de webhook para checkout abandonado — `Abandoned_Cart`

As Stories 1.1 e 1.3 (Dev Notes) mapearam a documentação oficial da Lastlink e listaram apenas `Purchase_Order_Confirmed`, `Payment_Refund`, `Payment_Chargeback` como eventos de webhook. Uma nova leitura da documentação oficial (https://support.lastlink.com/pt-BR/articles/12587805-documentacao-de-webhook-da-lastlink) para esta story revelou o catálogo completo de eventos, incluindo **`Abandoned_Cart`** — disparado quando o comprador chega ao checkout e não finaliza o pagamento. Isso responde diretamente o AC 4 desta story: **existe sim** um evento de IC/abandono nativo da Lastlink, distinto do `checkout_start` que o nosso próprio funil já emite.

Catálogo completo de eventos encontrado na documentação: `Purchase_Order_Confirmed`, `Payment_Refund`, `Payment_Chargeback`, `Abandoned_Cart`, `Purchase_Request_Canceled`, `Purchase_Request_Confirmed`, `Purchase_Request_Expired`, `Recurrent_Payment`, `Refund_Period_Over`, `Subscription_Canceled`, `Subscription_Expired`, `Subscription_Product_Access`, `Subscription_Renewal_Pending`, `Active_Member_Notification`, `Product_Access_Started`, `Product_Access_Ended`, `Refund_Requested`. Só `Abandoned_Cart` é relevante para o escopo desta story; os demais (assinatura, acesso a produto, etc.) não fazem parte do fluxo de front/upsell do Épico 1.

Payload do `Abandoned_Cart` (segundo a documentação): `Data.Products`, `Data.Buyer` (com `Email`), `Data.Offer`, `Data.Utm` (com `UtmSource`/`UtmMedium`/`UtmCampaign`/`UtmTerm`/`UtmContent`/`Src`/`Sck`/`Vtid` — mesmo shape da venda front). **Não** tem `Data.Purchase` (sem `PaymentId`/preço).

**Implementado nesta sessão** (`desafio-treino-trinca-replica/worker/src/lastlink.js`, `index.js`):
- `Abandoned_Cart` adicionado a `ALLOWED_EVENTS`.
- Nova função `buildAbandonedCartEventRecord()`, que reaproveita a resolução de atribuição por `Vtid` já usada na venda front (`resolveFrontAttribution`) e grava `event_type = "lastlink_abandoned_cart"` em `funnel_events` — puramente observacional, não entra em `rpc_campaign_roi` (que já filtra só os 4 `event_type` de compra/estorno).
- 2 novos testes unitários (`worker/test/lastlink.test.js`): resolução via `checkout_start`, e fallback `unmatched` sem `Vtid`. Suíte completa: **22/22 passando**.
- Validado com uma chamada real (`IsTest: true`) contra o worker local (`wrangler dev`) escrevendo no Supabase de **produção** (`zcaypxqrteoedzbdmagm`): linha `lastlink_abandoned_cart` gravada corretamente (`traffic_source_id="tiktok"`, `attribution_status="unmatched"` pois o `Vtid` de teste era fictício), depois removida.

**O que ainda falta**: confirmar que a Lastlink de fato **envia** esse evento para produtos reais (a documentação descreve o formato, mas não testamos um disparo real) e configurar o webhook para recebê-lo — depende da Task 1 (acesso à conta Lastlink + URL pública do worker).

### 2. Formato de UTM com pipe (TikTok) sobrevive intacto em todo o caminho do nosso sistema

Estendida a jornada de upsell em `desafio-treino-trinca-replica/qa/tests/tiktok-real-journeys.spec.ts` para usar o formato oficial informado pelo stakeholder (`utm_campaign="tiktok_audit_upsell_pipe|998877"`, `utm_medium="ad_group_alpha|AID001"`, `utm_content="creative_v3|CID123"`). Rodado contra o funil real (Playwright dirigindo os cliques reais) + worker real (`wrangler dev`) + Supabase real de produção:

- A compra front gravou os 3 valores com pipe **intactos** em `metadata`.
- O upsell (mesmo e-mail, crosswalk da Story 1.1 AC 4a) **herdou os mesmos valores com pipe intactos** de `utm_campaign`/`utm_medium`/`utm_content`, e `traffic_source_id = "tiktok"`.
- Suíte completa das 6 jornadas (abandono ×2, IC ×2, compra, compra+upsell): **6/6 passando**.

Nenhum ponto do código (`funnelTracker.ts`, `worker/src/lastlink.js`, `worker/src/traffic-source.js`) faz parsing/split do caractere `|` — é tratado como string opaca do início ao fim, como já esperado pela leitura de código feita no draft desta story.

**O que ainda falta**: isso prova que **o nosso lado** não quebra o pipe. Não prova que a **Lastlink** preserva o pipe através do seu próprio checkout/webhook — só um teste real (Task 1/2) fecha essa lacuna.

### 3. Achado extra: bug de colisão de e-mail sintético entre workers paralelos do Playwright

Ao adicionar a asserção pós-condição da herança de UTM no upsell, a suíte falhou intermitentemente: dois testes rodando em workers Playwright diferentes geravam o **mesmo e-mail sintético** (o contador `seq` usado para gerar IDs únicos é reiniciado em cada processo de worker, já que `fullyParallel: true` roda cada teste num processo separado). O crosswalk de upsell por e-mail (correto, Story 1.1 AC 4a) então resolvia a compra front do **teste errado**. Corrigido incorporando `process.pid` (único por processo/worker) ao prefixo `BATCH` usado em todos os IDs gerados pelo arquivo. Não é um bug de produção — é uma falha de unicidade de dado de teste que só aparece sob execução paralela.

### 4. Worker deployado em produção e validado com webhook real da Lastlink

Nesta sessão (com aprovação explícita do stakeholder): `wrangler secret put LASTLINK_WEBHOOK_TOKEN` (mesmo valor já configurado na Lastlink — não repetido aqui por ser um segredo de produção) e `wrangler deploy` foram executados contra a conta Cloudflare correta (`brunocastelanigov@gmail.com`, dona de `desafio-treino-trinca-worker` desde 2026-07-15). Probe seguro (token inválido) confirmou a rota `/api/lastlink-webhook` ativa (`401` em vez do `404` anterior).

Minutos depois do deploy, a Lastlink entregou uma bateria de eventos reais:

- **Eventos de teste genéricos da própria Lastlink** (`IsTest:true`, `buyer_email:"test.email@mail.com"`, valores de UTM literalmente iguais aos nomes dos campos — `utm_source:"utm_source"` etc., claramente um payload de teste/placeholder do próprio recurso de webhook da Lastlink): um `purchase`, um `purchase_upsell` (mesmo e-mail do `purchase` — **resolveu `attribution_status:"matched"` via crosswalk**, Story 1.1 AC 4a), múltiplos `purchase_refunded`/`purchase_chargeback`. Todos processados sem erro, gravados com `is_test:true`.
- **Reentrega de webhooks reais (não-teste)**: vendas reais anteriores ao deploy (`event_timestamp` de `12:34`, `15:41`, `15:42` de hoje — antes do worker ter a rota), que a Lastlink reenviou automaticamente assim que a rota passou a responder. Produtos: "Desafio Treino Trinca." (`utm_source=google`, `utm_source=SMSFunnel`, `utm_content` em JSON com dados de campanha do Google Ads) e "Comunidade Trinca Elite" (sem UTM). Todas gravadas com `attribution_status:"unmatched"` — esperado, pois o funil ainda não envia `vtid` no checkout (Story 1.1, Task 1, ainda não deployada) e/ou esse produto não faz parte do funil rastreado.
- Um arquivo temporário de log (`console.log` do payload bruto) foi adicionado a `worker/src/index.js`, deployado, e capturado com sucesso via `wrangler tail` numa segunda rodada: 3 compras **reais, ao vivo** (não-teste) do produto "Comunidade Trinca Elite" chegaram enquanto o tail estava conectado, confirmando que o parsing do worker bate exatamente com o payload real da Lastlink (`Data.Products`, `Data.Buyer`, `Data.Seller`, `Data.Commissions`, `Data.Purchase.{PaymentId,Price,Payment,Coupon,InvoiceUrl,OriginUrl,IsUpsell}`, `Data.Subscriptions`, `Data.Offer`, `Data.Utm`, `Data.DeviceInfo` — nosso código só lê os campos que precisa, ignorando o resto sem erro). **Achado relevante**: esses payloads reais têm `Data.Utm` contendo **só** `{"Src": "downsell"}` ou `{"Src": "upsell"}` — sem `UtmSource`/`UtmCampaign`/`Vtid` nenhum. `OriginUrl` (`.../checkout-payment?cp=CASHBACKDESAFIO4&src=downsell`) confirma que são links de recuperação de carrinho (cupom de cashback) nativos da própria Lastlink, não tráfego pago via nosso funil — por isso não têm `Vtid`, e ficam `unmatched` corretamente. Também notado: `Data.Purchase.IsUpsell` é `false` mesmo na compra cujo `Offer.Name = "Upsell - 220"` — o campo `IsUpsell` da API da Lastlink parece se referir especificamente ao mecanismo de order bump/upsell no momento do checkout original, não a uma oferta de downsell/upsell enviada depois por link separado. **Log temporário removido** (`worker/src/index.js` redeployado sem ele) logo após capturar essa evidência, para não continuar logando PII de clientes reais (e-mail, telefone, IP) em produção.

## Pendências (dependem de ação humana / novo teste real)

1. **Disparar um evento `Abandoned_Cart` real** (a bateria de teste que a Lastlink já enviou não incluiu esse tipo) — provavelmente exige iniciar um checkout de verdade num produto e abandoná-lo, já que "reenviar webhook de teste" no painel da Lastlink parece cobrir só os 4 tipos de compra/estorno.
2. **Testar o formato pipe-delimited do TikTok (goal) através de um checkout real** — os eventos reais recebidos até agora usaram UTM genérico da própria Lastlink (`"utm_source"`/`"utm_campaign"` literais), não o formato `NOME|ID` específico. Isso requer visitar a URL de checkout real com os query params do formato TikTok anexados (`?utm_source=tiktok&utm_campaign=...|...&...`) e completar uma compra `IsTest`.
3. ~~Remover o log temporário de payload bruto~~ — **feito**: capturado 3 payloads reais verbatim, depois removido e redeployado (ver Achado 4).
4. **Levar ao stakeholder o achado de receita não atribuída de "Comunidade Trinca Elite"** — vendas reais de um produto que não parece fazer parte do funil `desafio_treino_trinca`, hoje aparecendo como `unmatched`. Confirmar se isso é esperado (produto/funil separado, fora do escopo do Épico 1) ou se precisa de atribuição própria.
5. Confirmar com o stakeholder se a exceção de `is_test` em `tiktok-real-journeys.spec.ts` (dados sintéticos visíveis no dashboard real, sem limpeza automática) deve continuar ou ser normalizada.
6. **Limpar o worker vazio criado por engano** na conta `time.melhorversao@gmail.com` durante o troubleshooting inicial desta sessão (antes de identificar a conta correta) — sem código/tráfego, mas ainda existe até alguém rodar `wrangler delete` autenticado nessa conta.

## Referência de código alterado nesta sessão

- `desafio-treino-trinca-replica/qa/tests/tiktok-real-journeys.spec.ts`
- `desafio-treino-trinca-replica/worker/src/lastlink.js`
- `desafio-treino-trinca-replica/worker/src/index.js`
- `desafio-treino-trinca-replica/worker/test/lastlink.test.js`
