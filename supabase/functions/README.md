# Edge Functions (Supabase / Deno)

Custom endpoints for the concrete-lab MVP (SPEC §5). Domain rules are imported
from `packages/shared` via the import map in `_shared/deno.json` — the fórmulas
and validators are never reimplemented here (DRY / SPEC §6.2).

## Functions (Sprint S004)

| Function | Método | Auth | Descrição |
|---|---|---|---|
| `ocr-nota-fiscal` | POST | JWT | Lê a foto da NF com Google Gemini Vision e devolve os campos extraídos com confiança (SPEC §5.1). Rate limit de 3 tentativas por concretagem (`ocr_attempts`) e timeout de 10s. |
| `admin-provisionar-usuario` | POST | JWT (admin) | Cadastra clientes e usuários internos via `inviteUserByEmail` (F-S004-1). |

## Functions (Sprint S008)

| Function | Método | Auth | Descrição |
|---|---|---|---|
| `gerar-laudo-pdf` | POST | JWT (engenheiro) | Compõe o PDF travado do laudo `pronto_assinatura` (layout PRD §11: cabeçalho, dados cliente/obra, tabela `DATA\|QUADRA\|LOTE\|NF\|LACRE\|CP\|KGF\|MPa\|FCM` por idade, gráfico de resistência com linha do fck, considerações + ressalvas automáticas, assinaturas, QR). Aplica `ReadOnly=true, AllowPrinting=true, AllowCopy=false`, salva em `laudos/<id>/original.pdf` e preenche `pdf_original_url` + `codigo_verificacao` (SPEC §5.3). Gráfico: SVG (`packages/shared`) → `@resvg/resvg-wasm` → PNG → `@cantoo/pdf-lib`. |
| `upload-laudo-assinado` | POST (multipart) | JWT (engenheiro) | Recebe o PDF assinado (gov.br), salva em `laudos/<id>/assinado.pdf`, preenche `pdf_assinado_url`/`assinatura_rt_url` e publica `pronto_assinatura → assinado` **só se** o PDF for válido. 2ª assinatura (`pdf_elaborador`) opcional. Enfileira o e-mail `laudo_assinado` ao cliente (US24-CA1; envio é S009). Erros: 415 `ARQUIVO_INVALIDO`, 409 `SEM_PDF_ASSINADO` (SPEC §5.4). |

## Functions (Sprint S009)

| Function | Método | Auth | Descrição |
|---|---|---|---|
| `validar-laudo` | GET | **Público (sem JWT)** | Página pública de validação (SPEC §5.5): recebe `?codigo=<codigo_verificacao>`, resolve **sempre a versão vigente** (caminha a cadeia `substitui_laudo_id`) e devolve identidade + MPa/FCM por idade + autenticidade — **nunca** fotos de evidência. Rate limit por IP (`[PREMISSA]` 30 req/min). 404 `LAUDO_NAO_ENCONTRADO`; 429 rate limit. |
| `exportar-excel` | POST | JWT (engenheiro) | Exporta o comparativo consolidado por concreteira × fck alvo no período (`exceljs`) filtrando período/concreteira/fck/obra (SPEC §5.6). 422 `SEM_DADOS`. Agregação via `packages/shared` (`buildComparativoConcreteira`). |
| `enviar-email` | POST | Interno (`x-cron-secret` **ou** JWT admin) | Worker de e-mail transacional (Resend). Drena `email_events` (pendente/falhou) e entrega, gravando `enviado`/`falhou` + `tentativas` (retry; nunca bloqueia o fluxo — US24-CA5). `evento: 'cps_pendentes_coleta'` enfileira antes de drenar (cron diário). Producers: `upload-laudo-assinado` (laudo_assinado/CA1), trigger `trg_laudos_notify` (pronto_assinatura/CA2), cron `enqueue_cps_pendentes_coleta_emails` (CA3); convite Supabase cobre boas-vindas (CA4). |

### Agendamento (cron)

- **Enfileiramento diário** (`cps_pendentes_coleta`): a migração `0017` cria o job pg_cron `cps-pendentes-coleta-diario` (09:00) chamando `enqueue_cps_pendentes_coleta_emails()` — apenas **enfileira** (sem segredos). Onde o `pg_cron` não existir (Postgres puro/CI), o bloco é um no-op.
- **Entrega da fila**: agende um invoke recorrente de `POST /functions/v1/enviar-email` com `{ "evento": "processar_fila" }` e o header `x-cron-secret: $EMAIL_CRON_SECRET` (ex.: Supabase Scheduled Function ou pg_cron + pg_net). A entrega precisa do runtime da Edge Function (Resend) e por isso é separada do enfileiramento SQL.

## Variáveis de ambiente (segredos — só no ambiente da função)

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — injetadas pelo runtime do Supabase.
- `GEMINI_API_KEY` — chave do Google Gemini (Google AI Studio), somente
  `ocr-nota-fiscal`. Defina com: `supabase secrets set GEMINI_API_KEY=...`
- `GEMINI_MODEL` — (opcional) modelo Gemini; default `gemini-2.0-flash`.
- `LAUDO_VERIFICATION_SECRET` — segredo do hash anti-fraude `codigo_verificacao = sha256(laudo_id + secret)` (somente `gerar-laudo-pdf`, SPEC §7.1).
- `PUBLIC_SITE_URL` — URL base pública para o QR de validação (`<site>/validar/<codigo>`) e para o link do portal nos e-mails (`<site>/portal`); default `https://laboratorio.example.com`.
- `RESEND_API_KEY` — chave da Resend para e-mail transacional (somente `enviar-email`, SPEC §7.1).
- `EMAIL_FROM` — remetente verificado na Resend (somente `enviar-email`).
- `EMAIL_CRON_SECRET` — segredo do header `x-cron-secret` para invocação server-to-server/cron do `enviar-email` (JWT admin também é aceito).

Nenhum segredo vai para o cliente (SPEC §7.1).

## Rodar localmente

```bash
supabase functions serve ocr-nota-fiscal --env-file supabase/functions/.env.local
supabase functions serve admin-provisionar-usuario --env-file supabase/functions/.env.local
supabase functions serve gerar-laudo-pdf --env-file supabase/functions/.env.local
supabase functions serve upload-laudo-assinado --env-file supabase/functions/.env.local
supabase functions serve validar-laudo --env-file supabase/functions/.env.local
supabase functions serve exportar-excel --env-file supabase/functions/.env.local
supabase functions serve enviar-email --env-file supabase/functions/.env.local
```

## Testes (Deno)

```bash
deno test supabase/functions/ocr-nota-fiscal/logic.test.ts
deno test supabase/functions/enviar-email/logic.test.ts
```

Cobrem o rate limit de OCR (3 OK, 4ª ⇒ 429), a montagem de `lowConfidenceFields`
e a política de retry da fila de e-mails (SPEC §7.2 / US24-CA5). A lógica pura de
domínio de S009 (rate limiter público, resolução da versão vigente, agregação do
Excel e templates de e-mail) é testada em `packages/shared` via Vitest.
