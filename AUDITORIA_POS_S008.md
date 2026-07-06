# Auditoria Técnica e Roadmap de Riscos — Pós-S008

> **Data:** 06/07/2026
> **Escopo auditado:** S001–S008 (16 migrations, 4 Edge Functions, `packages/shared`, `apps/web`, `apps/mobile`), cruzado com `PRD_MVP.md` v2.0 e `SPEC_TECNICA.md` v1.0.
> **Verificação executada:** suíte do domínio compartilhado rodada nesta auditoria — **196/196 testes verdes** (`packages/shared`, Vitest). Testes pgTAP presentes para todas as RPCs e RLS (não executados aqui por exigirem Postgres local).
> **Nota de estado:** o repositório está com **S008 concluída** (S007 e S008 mergeadas), não S006. Esta auditoria cobre o estado real.

---

## 1. Veredicto de Arquitetura

**A implementação está fortemente aderente à SPEC.** Os pilares prometidos existem de fato e com qualidade acima da média:

* Núcleo de domínio puro e testado (`calcMpa`, consolidação FCM, máquinas de estado, ressalvas) reutilizado por mobile/web/Edge — o DRY jurídico da SPEC §1.2 foi cumprido.
* RLS deny-by-default em todas as tabelas, com pgTAP por papel; transições de estado via RPC `SECURITY DEFINER` com `search_path` fixado; guarda de `DELETE` físico (retenção vitalícia); trigger de auditoria genérico e robusto (melhor que o snippet da SPEC).
* Buckets privados com policies por papel e sem policy de DELETE; PDF com `encrypt()` e permissões corretas (`printing: highResolution`, `copying/modifying: false`); `codigo_verificacao` determinístico `sha256(laudo_id + secret)` conforme SPEC §7.1.

O risco do projeto **não** está na arquitetura — está em um pequeno conjunto de furos na fronteira `service_role`/Auth/Storage e no acoplamento S008→S009. São eles que podem comprometer um documento com validade jurídica.

---

## 2. Achados CRÍTICOS (P0 — corrigir antes de iniciar a S009)

### C1. Escalada de privilégio: signup público + `role` vindo de `user_metadata`

* `supabase/config.toml` habilita `enable_signup = true`, e o trigger `handle_new_user` (migration `0003`, linhas 98–133) confia em `raw_user_meta_data.role` / `is_admin` / `cliente_id`.
* `user_metadata` é **controlado pelo próprio usuário** no signup: com a anon key (que é pública, embarcada nos apps), qualquer pessoa pode chamar `supabase.auth.signUp({ email, password, options: { data: { role: 'eng_lab', is_admin: true } } })` e nascer **admin/engenheira** — leitura e escrita totais, incluindo publicar laudos assinados.
* O PRD é explícito: “cadastro é interno, feito pelo laboratório” (§2.5).

**Correção cirúrgica (dupla camada):**
1. **Desabilitar signup público** no projeto Supabase de produção (e no `config.toml`).
2. Tornar o trigger imune a metadata do usuário: criar todo mundo como `cliente`/`is_admin=false` e mover a atribuição de papel para a Edge Function `admin-provisionar-usuario` (que já roda com `service_role` e já faz `update` em `usuarios` para `cliente_id`) — ou ler papel apenas de `raw_app_meta_data` (que só a Admin API escreve), usando `admin.createUser({ app_metadata })` + `generateLink({ type: 'invite' })`.
3. Adicionar teste pgTAP: signup com metadata maliciosa (`role=eng_lab`) resulta em `role=cliente`.

### C2. `upload-laudo-assinado` sobrescreve o PDF assinado ANTES de validar o estado

* Em `supabase/functions/upload-laudo-assinado/index.ts`, o upload para `laudos/<id>/assinado.pdf` acontece com `upsert: true` (linhas 111–132) **antes** do update guardado por `.eq('status', 'pronto_assinatura')` (linha 147).
* Consequência: chamar o endpoint para um laudo **já `assinado`** retorna 409, mas o arquivo no Storage **já foi substituído** — o registro no banco continua apontando para o mesmo path, agora com outro conteúdo. Um documento juridicamente assinado pode ser trocado silenciosamente, sem trilha de auditoria (Storage não passa pelo `trg_audit`).

**Correção:**
1. Carregar o laudo e validar `status === 'pronto_assinatura'` **antes** de qualquer upload.
2. Gravar em path versionado (`assinado_v{versao}.pdf`) com `upsert: false`.
3. Persistir o **sha256 do arquivo** em `laudos` no momento da publicação (evidência de integridade barata e vitalícia).

### C3. Trilha de auditoria perde o ator em toda escrita via `service_role`

* `audit_trigger` grava `auth.uid()`, que é **null** quando a escrita vem de Edge Function com `service_role`. Resultado: as transições mais sensíveis do sistema — **publicação do laudo assinado** (`upload-laudo-assinado`), gravação de `pdf_original_url`/`codigo_verificacao` (`gerar-laudo-pdf`) e provisionamento de clientes — entram no `audit_log` **sem autor**.
* Para um sistema cujo diferencial é rastreabilidade jurídica, esse é o pior lugar possível para um buraco.

**Correção:** mover as transições de estado dessas funções para RPCs `SECURITY DEFINER` chamadas **com o JWT do usuário** (ex.: `publicar_laudo(laudo_id, pdf_url, hash)`), deixando à Edge Function apenas o trabalho de Storage. Assim `auth.uid()` volta a existir no trigger. Alternativa mínima: inserir manualmente uma linha em `audit_log` com o `caller.id` já resolvido pela função.

### C4. Não existe fluxo para atribuir o número definitivo do laudo — o PDF “oficial” sai com “RASCUNHO …”

* `registrar_ruptura`/`emitir_laudo_parcial`/`agrupar_laudo` criam o laudo com `numero = 'RASCUNHO {SIGLA} NF {n}'` (placeholder documentado como “o valor real é atribuído na geração do PDF”), mas `gerar-laudo-pdf` **imprime `laudo.numero` como está** (`data.ts:184`, `pdf.ts:119`) e nenhuma tela/RPC permite definir a numeração da Seção 2.3 do PRD (`N°003AGEHAB`, `CT001-T2-CP1`).
* Caminho feliz atual: um laudo pronto para assinatura gov.br com título “Relatório de ensaios — RASCUNHO OBRA NF 123”.

**Correção:** adicionar campo editável de `numero` no `LaudoDetalhe` (web) + RPC `definir_numero_laudo` com guarda (`status = 'rascunho' | 'pronto_assinatura'`, unicidade por cliente) e **bloquear `gerar-laudo-pdf` enquanto `numero` começar com `RASCUNHO`** (novo erro `NUMERO_PENDENTE`).

---

## 3. Achados ALTOS (P1 — resolver durante a S009)

### H1. Máquina de estados contornável por UPDATE direto (policies `FOR ALL`)

* `laudos_eng_all` e `rupt_write` são `FOR ALL`: um engenheiro autenticado pode fazer `PATCH /rest/v1/laudos?id=eq…` e setar `status='assinado'` **sem** `pdf_assinado_url`, ou editar `rupturas.mpa_calculado` de um resultado já emitido — sem passar pelas RPCs. A SPEC §6.2 (“o cliente nunca faz UPDATE direto de status”) hoje é convenção de UI, não invariante de banco.
* **Correção:** (a) `CHECK (status <> 'assinado' OR pdf_assinado_url IS NOT NULL)` em `laudos`; (b) trigger `BEFORE UPDATE` em `laudos` e `rupturas` que valide transições permitidas (espelho do `canTransition` do shared) e torne `mpa_calculado`/`carga_ruptura_kgf` imutáveis após inserção (exceto via `expurgar_resultado`).

### H2. Rate limit do OCR é ineficaz e sem teto de payload

* `concretagemRef` é uma string livre escolhida pelo cliente — basta gerar um ref novo por chamada para burlar o limite de 3 tentativas. Além disso, `imageBase64: z.string().min(1)` não tem `max` (SPEC §7.1 exige imagem ≤ 10 MB). Qualquer JWT interno vazado vira um dreno de créditos OpenAI.
* **Correção:** cap de tamanho no schema (~14 MB de base64), limite adicional **por usuário/dia** consultando `ocr_attempts.user_id`, e o insert da tentativa **antes** da chamada à OpenAI (hoje o count/insert tem corrida).

### H3. Concorrência nas RPCs de laudo (documento jurídico exige unicidade)

* Nenhuma RPC usa `SELECT … FOR UPDATE`. O caso grave é `corrigir_laudo`: duas chamadas concorrentes no mesmo laudo criam **duas versões v2** apontando para o mesmo pai — a resolução de “versão vigente” da página pública (S009) fica ambígua.
* **Correção:** `select * into v_old from laudos where id = laudo_id for update;` + índice único parcial `create unique index uq_laudos_substitui on laudos(substitui_laudo_id) where substitui_laudo_id is not null;`. Aproveitar e dar a `agrupar_laudo` um guard de reuso (hoje cada clique cria um consolidado duplicado).

### H4. Divergência entre o PDF congelado e os dados vivos (seam S008→S009)

* O PDF é um snapshot; `concretagens` continua editável por admins mesmo depois do laudo `assinado`. Se alguém editar `fck`/NF depois da emissão, a página pública de validação (S009, que lerá o banco vivo) **contradirá o PDF assinado** — exatamente o cenário que a validação anti-fraude deveria dirimir, mas contra o próprio laboratório.
* **Correção:** em `gerar-laudo-pdf`, persistir um **snapshot JSON** do relatório (`laudos.dados_snapshot jsonb`) e fazer `validar-laudo` servir o snapshot; adicionalmente, bloquear edição de concretagem vinculada a laudo em `pronto_assinatura`/`assinado` (forçar o fluxo `corrigir_laudo`).

---

## 4. Achados MÉDIOS (P2 — débito controlado, agendar)

| # | Achado | Correção sugerida |
|---|---|---|
| M1 | `registrar_ruptura` calcula MPa com a carga **crua** mas armazena `round(carga)`; o `calcMpa` do shared arredonda **antes**. Carga fracionária pode divergir ±0,01 MPa entre preview e banco. | `v_carga := round(v_carga)` antes do cálculo no RPC. |
| M2 | `upload-laudo-assinado` sobrescreve `data_emissao` incondicionalmente; `marcar_pronto_assinatura` usa `coalesce`. O PDF impresso pode carregar data diferente da armazenada. | Não tocar em `data_emissao` na publicação (ou `coalesce`). |
| M3 | `coleta_atrasada` usa `created_at` do registro, não o momento real da moldagem (PRD prevê cadastro tardio sem sinal). | Documentar a limitação ou capturar `hora_moldagem`. |
| M4 | CORS `Access-Control-Allow-Origin: *` em todas as funções; SPEC §7.1 pede validação de `Origin`. | Allowlist de origens dos apps. |
| M5 | Policy de `UPDATE` no bucket `evidencias` permite sobrescrever fotos de evidência (que deveriam ser imutáveis; os paths já têm `Date.now()`). | Remover a policy de update de `evidencias`. |
| M6 | `contentAccessibility: false` no encrypt do PDF bloqueia leitores de tela (PDF 2.0 depreciou restringir acessibilidade). | `contentAccessibility: true`. |
| M7 | Erros 23505 de corrida (ex.: 2ª ruptura simultânea do mesmo CP) chegam crus à UI. | Mapear `unique_violation` no `messageForSupabaseError`. |
| M8 | `admin-provisionar-usuario`: CNPJ duplicado devolve `CLIENTE_CONFLITO` genérico. | Detectar 23505 de `clientes.cnpj` → mensagem específica. |

---

## 5. Otimização de Cloud e Refatoração

1. **RLS initplan:** `is_admin()`/`current_role_name()` são chamadas por linha nas policies. Reescrever como subquery — `using ((select is_admin()))` — faz o Postgres avaliar 1× por statement (initplan). Custo zero, ganho em toda listagem.
2. **Índices de consulta quente:** `corpos_prova (status, data_ruptura_planejada)` (lista da prensa/agenda) e `laudos (status, updated_at desc)` (painel). Volume é pequeno hoje; o custo de criar agora é trivial.
3. **`ocr_attempts.concretagem_ref` sem índice** — a checagem de rate limit faz seq scan por texto. Índice simples resolve.
4. **Custo OpenAI:** enviar a imagem com `detail: 'low'` (ou redimensionar no app para ~1024px antes do base64) reduz o custo do Vision em ~5–10× com precisão suficiente para NF. Hoje o payload sobe em resolução máxima.
5. **Cold start da Edge de PDF:** `@resvg/resvg-wasm` + `pdf-lib` pesam; carregar o wasm em escopo de módulo (uma vez por isolate) e manter a função “quente” é suficiente — não vale headless browser.
6. **E-mail (S009):** o design `email_events` como fila é correto; implemente o worker como função agendada (Supabase Cron) com backoff e **idempotência por `id` do evento** (senão retries duplicam e-mail de laudo ao cliente).
7. **Backup ≠ retenção vitalícia:** o plano do Supabase dá PITR limitado. Para o requisito “vitalício” (PRD §4), agende export mensal de `laudos` + buckets para storage frio (ex.: bucket de arquivamento separado ou S3/Backblaze). Sem isso, “retenção vitalícia” depende de um único provedor.
8. **Rotação de segredos:** documentar que `LAUDO_VERIFICATION_SECRET` **não pode rotacionar sem plano** — o QR busca pelo `codigo_verificacao` **armazenado**, então laudos antigos continuam válidos, mas regenerações passariam a divergir. Guardar o secret em cofre e tratá-lo como imutável por versão de laudo.

---

## 6. Roadmap de Riscos — S009/S010

### Ordem recomendada

**Fase 0 (antes de qualquer feature nova): P0s da Seção 2.** C1 e C2 são vulnerabilidades reais exploráveis com a anon key/JWT; C4 bloqueia o primeiro laudo real. Estimativa: 1–2 dias de trabalho, todos cirúrgicos.

**S009 — ordenar features por risco, não pela lista:**

1. **`validar-laudo` (público) primeiro** — é a superfície anônima + `service_role`, e depende das correções H3/H4:
   * Resolver a versão vigente exige **caminhar a cadeia `substitui_laudo_id` para frente** (filho → aponta para o pai): use CTE recursiva partindo do laudo do código até a folha não-substituída; o índice único do H3 garante determinismo.
   * Definir comportamento para código de versão substituída (“documento substituído — ver versão vigente”) em vez de 404: um QR impresso num laudo v1 corrigido continua circulando.
   * Servir o **snapshot** (H4), com whitelist explícita de campos; nunca joins com `evidencia_fotos`.
   * Rate limit 30 req/min/IP: contador em memória de Edge Function **não sobrevive a múltiplos isolates** — use uma tabela `rate_limit` (ou o próprio Postgres com janela deslizante) e documente a limitação.
2. **Portal do cliente (US17/US18):** o bucket `laudos` é eng-only por design — o download do cliente deve ser **URL assinada emitida por Edge Function/RPC** que valida `cliente_id` + `status='assinado'` via RLS. Não criar policy de Storage para `cliente` (superfície desnecessária).
3. **E-mails (US24):** worker idempotente + cron diário (CA3) + cap de tentativas; falha nunca bloqueia publicação (já respeitado no enqueue).
4. **Excel (US23) por último:** `exceljs` via esm.sh no Deno é o item de maior risco de compatibilidade da sprint — faça um spike de 1h no início da sprint para validar o import; se falhar, fallback para gerar CSV/`xlsx` via lib mais leve (`sheetjs` core).

**S010 — hardening que não pode esperar virou Fase 0/S009; o que resta:**

* E2E Playwright nos **fluxos jurídicos** (gerar PDF → assinar → validar público → corrigir → validar de novo) — é o teste que protege o negócio, mais que cobertura de UI.
* Teste de **restore** do backup (backup sem ensaio de restore não é backup).
* Dashboard operacional, CSP na página pública, revisão final de RLS com pgTAP ampliado (incluir o teste anti-escalada do C1).
* **Risco de entrega mobile:** impressão BLE exige dev client (EAS Build) — agende a validação física da impressora/etiquetas submersas com a engenheira **antes** do fim da S010; é o único requisito que software não consegue provar sozinho.

### Riscos transversais a monitorar

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Conta admin auto-provisionada (C1) | Alta (trivial de explorar) | Crítico | Fase 0 |
| PDF assinado sobrescrito (C2) | Média | Crítico (jurídico) | Fase 0 |
| Validação pública contradiz PDF (H4) | Média | Alto (reputacional) | Snapshot na S009 |
| exceljs incompatível no Deno | Média | Médio (atrasa S023) | Spike no início da S009 |
| Impressora BLE/etiquetas reprovarem em campo | Média | Alto (US03 é o coração do fluxo) | Teste físico antecipado |
| Dependência de provedor único p/ retenção vitalícia | Baixa | Alto | Export frio mensal |

---

## 7. O que está comprovadamente bom (não mexer)

* Fórmula MPa e vetores de referência batem com o laudo real (verificado nos testes e no RPC).
* Consolidação FCM/expurgo/idades e ressalvas centralizadas no shared — exatamente o DRY que a SPEC exigia.
* `prevent_physical_delete`, auditoria genérica via `to_jsonb`, `search_path` fixado em todo `SECURITY DEFINER`, `revoke ... from anon` em todas as RPCs.
* Optimistic locking do painel (F-S007-2) com desambiguação 404/409 — implementação correta e testada.
* Estrutura de erros (`{ error, message }` + catálogo PT) consistente entre Edge, RPC e UI.
