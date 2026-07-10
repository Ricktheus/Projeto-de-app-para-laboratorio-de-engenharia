# 🚧 Controle Tecnológico de Concreto — MVP

Este repositório contém os documentos de concepção e especificação para o novo aplicativo de gestão e operação de um laboratório de concreto.

---

## 📌 Status Atual do Projeto

**Fase Atual:** ✅ MVP completo (S001–S010) — **S001 (Fundação Supabase), S002 (Núcleo de Domínio), S003 (Auth & Navegação), S004 (Clientes/Usuários/Obras + Concretagem + OCR), S005 (Corpos de prova: etiquetas Bluetooth, agenda de coleta, bipagem QR), S006 (Prensa: lista de ruptura, cálculo de MPa, tipo de fratura, descarte/expurgo, fotos de evidência com marca d'água), S007 (Painel web do escritório: concretagens em tempo real, edição com optimistic locking, laudos pré-prontos), S008 (Geração do PDF travado, download/upload do PDF assinado e versionamento de correção), S009 (Portal do cliente, página pública de validação por QR, exportação Excel por concreteira e notificações por e-mail) e S010 (Hardening: dashboard operacional no web, cobertura de testes unit/RLS/E2E, rate limiting e revisão de segurança) concluídas**.

1. **Revisão Crítica Realizada:** Foi mapeado um conjunto de gaps críticos e edge cases no PRD original, gerando o relatório [revisao_critica_prd.md](./revisao_critica_prd.md).
2. **Respostas da Engenheira Recebidas:** As 25 perguntas de validação foram respondidas pela engenheira e, junto com um laudo real de referência, usadas para atualizar o PRD.
3. **7 Gaps Críticos Resolvidos:** O [PRD_MVP.md](./PRD_MVP.md) (v2.0) resolve formalmente os 7 gaps — Critérios de Aceite em todas as User Stories, Matriz RBAC, Audit Trail, Máquinas de Estado (CP e Laudo), Normas Técnicas, Fórmula kgf→MPa e CRUD de Obras (ver o índice na Seção 1.1 do PRD).
4. **✅ SPEC Técnica Gerada:** [SPEC_TECNICA.md](./SPEC_TECNICA.md) e [sprints.json](./sprints.json) traduzem o PRD em um manual de implementação determinístico — arquitetura (monorepo modular), **10 sprints** incrementais (S001–S010), **38 features** com Definition of Done/edge cases/mensagens de erro exatas, modelo de dados (DDL + RLS + auditoria + RPCs), contratos de API e requisitos não funcionais.
5. **✅ Prompt de Desenvolvimento Pronto:** [prompt_desenvolver_sprint.md](./prompt_desenvolver_sprint.md) — prompt rigoroso do comando `/go`, configurado para a Sprint `S001`.

### 🧭 Progresso das Sprints

| Sprint | Objetivo | Status |
|---|---|---|
| **S001** | Fundação Supabase: schema, RLS/RBAC, auditoria, Auth | ✅ Concluída |
| **S002** | Núcleo de domínio (MPa, projeção, máquinas de estado) | ✅ Concluída |
| **S003** | Auth & navegação (mobile + web), UI kit | ✅ Concluída |
| **S004** | Clientes/Usuários/Obras + Concretagem + OCR da NF | ✅ Concluída |
| **S005** | Corpos de prova, etiquetas Bluetooth, coleta | ✅ Concluída |
| **S006** | Prensa: ruptura, MPa, fratura, descarte, fotos | ✅ Concluída |
| **S007** | Painel web escritório: realtime, edição, laudos pré-prontos | ✅ Concluída |
| **S008** | Geração de PDF travado, assinatura, versionamento | ✅ Concluída |
| **S009** | Portal do cliente, validação pública, Excel, e-mails | ✅ Concluída |
| **S010** | Hardening: dashboard, testes, segurança | ✅ Concluída |
| **H1** | Auditoria técnica pós-S010 + correções de segurança/integridade | ✅ Concluída |
| **UX** | Auditoria de UI/UX + 23 quick wins (frontend-only) + backlog V2 | ✅ Concluída |

### 🛡️ Hardening pós-S010 (auditoria técnica)

Após concluir as 10 sprints, foi feita uma **auditoria técnica** ([AUDITORIA_POS_S008.md](./AUDITORIA_POS_S008.md)) cruzando o código com o PRD/SPEC. Os achados foram corrigidos em uma migration forward-only (`supabase/migrations/0018_security_hardening.sql`) + Edge Functions + `packages/shared` + UI web:

| # | Achado | Correção |
|---|---|---|
| **C1** | Escalada de privilégio via signup público + `user_metadata` | Signup público desabilitado; `handle_new_user` lê papel **apenas** de `app_metadata` (server-only); provisionamento autoritativo em `admin-provisionar-usuario`. |
| **C2** | PDF assinado sobrescrito antes da checagem de estado | Estado validado **antes** do upload; publicação via RPC `publicar_laudo_assinado` (row-lock) + hash `sha256` de integridade. |
| **C3** | Auditoria sem ator em escritas `service_role` | Transições de laudo agora via RPC com **JWT do usuário** — `auth.uid()` registra o engenheiro no `audit_log`. |
| **C4** | Sem fluxo para o número definitivo do laudo | RPC `definir_numero_laudo` + guarda `NUMERO_PENDENTE` na geração do PDF + editor de número na UI. |
| **H1** | Máquina de estados contornável por PATCH direto | `CHECK (assinado ⇒ pdf_assinado_url)` + imutabilidade de resultados de ruptura. |
| **H2** | Rate limit de OCR burlável / sem teto | Teto de payload + limite por usuário/dia + registro da tentativa antes da chamada. |
| **H3** | Concorrência em `corrigir_laudo` | `SELECT … FOR UPDATE` + índice único parcial (uma versão substituída uma vez). |
| **M1/M2/M5/M6** | Débitos menores | Arredondamento de carga, `data_emissao` preservada, evidências write-once, acessibilidade do PDF. |

Cobertura pgTAP nova: `supabase/tests/13_hardening_0018_test.sql`. Detalhamento completo (incl. residuais conscientes **H4** e **M4**) na Seção 8 do relatório de auditoria. Suítes verdes na entrega: shared 225, web 55, mobile 68; lint e typecheck limpos. **Antes do deploy:** rodar `pnpm db:reset && pnpm db:test` para validar os invariantes de banco (pgTAP).

### 🎨 Refinamento de UI/UX pós-S010

Uma auditoria de produto (PM Sênior + UI/UX) avaliou o **código real** das telas e priorizou os ganhos de "último quilômetro". O relatório completo — atritos por jornada, quick wins com esforço×impacto e o **Backlog V2** — está em [auditoria_ux_quickwins_backlog_v2.md](./auditoria_ux_quickwins_backlog_v2.md). **23 dos 24 quick wins** foram implementados em 4 lotes, **sem tocar em banco/RLS/RPCs/Edge Functions** — apenas frontend, `packages/shared` e queries de leitura já cobertas pela RLS:

| Lote | Entregas principais |
|---|---|
| **1º** | Veredito **fck** no display da prensa (verde/âmbar/vermelho + projeção 28d) · "Próximo CP →" · contagem/atraso na fila · preview de rompimentos na moldagem · pill de slump · filtro de status + "Aguardando assinatura" nos laudos · "Copiar link de validação" · **veredito conforme/abaixo** no portal e na página pública |
| **2º** | Scanner de **QR** na prensa (reuso do `expo-camera`) · **data em BR** (DD/MM/AAAA mascarada) · **háptica** (`expo-haptics`) na prensa e coleta |
| **3º** | **Identidade visual** (logo SVG inline + wordmark) no login, portal e validação pública · **bloqueio do app por biometria** (`expo-local-authentication`, opt-in por aparelho, defensivo) |
| **4º** | Aterrissar na concretagem **recém-criada** · "Reimprimir falhas (N)" em lote · **busca** no painel do escritório |

Domínio novo em `packages/shared`: `fckVerdict` (comparação indicativa vs fck, reusa a projeção 7/14→28d), helpers `maskBrDate`/`brDateToIso` e `BRAND` (identidade centralizada). Dois **bugs latentes** foram corrigidos de passagem: a data da concretagem era editável mas ignorada no salvamento (usava sempre "hoje"), e datas ISO vazavam cruas na tela de etiquetas. Suítes verdes na entrega: **shared 238, mobile 80, web 56** (374 no total); lint e typecheck limpos. **Único item adiado:** QW-23 (migração emoji→biblioteca de ícones), por ser decisão de design system melhor feita isolada.

### 🎯 Próximos Passos

1. **Iniciar a Sprint 001** com o comando `/go`, usando [prompt_desenvolver_sprint.md](./prompt_desenvolver_sprint.md) (já configurado para `S001`). Entrega: monorepo base + migrations Supabase + RLS/RBAC + auditoria + Auth, com testes pgTAP passando.
2. **Provisionar o projeto Supabase** (chaves, buckets `evidencias`/`laudos`, variáveis de ambiente `OPENAI_API_KEY`/`RESEND_API_KEY`) antes das sprints que os consomem (S004/S006/S008/S009).
3. **Avançar sprint a sprint**, trocando o "Sprint alvo" no topo do prompt (`S002`, `S003`…) e atualizando a tabela de progresso acima ao concluir cada uma.

---

## 📂 Mapeamento de Arquivos do Projeto

**Especificação e execução (novos):**
- 📐 [SPEC_TECNICA.md](./SPEC_TECNICA.md) — **Especificação Técnica** determinística: arquitetura, sprints, features/DoD, modelo de dados, API, segurança e testes.
- 🗂️ [sprints.json](./sprints.json) — Sprints e features legíveis por máquina, consumidas pelo comando `/go`.
- 🚀 [prompt_desenvolver_sprint.md](./prompt_desenvolver_sprint.md) — Prompt de desenvolvimento de sprint (Sprint alvo `S001`).
- 📋 [prompt_gerar_spec.md](./prompt_gerar_spec.md) — Prompt usado para gerar a SPEC a partir do PRD.

**Concepção e requisitos:**
- 📄 [PRD_MVP.md](./PRD_MVP.md) — Documento de Requisitos do Produto (MVP). Contém o escopo e regras de negócio.
- 📄 [revisao_critica_prd.md](./revisao_critica_prd.md) — Análise crítica do PRD com **7 Gaps Críticos**, edge cases e as **25 perguntas de validação**.
- 📄 [implementation_plan.md](./implementation_plan.md) — Esboço inicial da modelagem lógica do banco de dados (PostgreSQL/Supabase) e fluxo de telas.
- 📄 [roteiro_entrevista_laboratorio.md](./roteiro_entrevista_laboratorio.md) — Mapeamento do fluxo operacional atual e gargalos detectados na entrevista inicial.
- 📄 [MEMORIA_PROJETO.md](./MEMORIA_PROJETO.md) — Histórico conceitual do projeto e diretrizes de desenvolvimento.

**Produto e UX (pós-MVP):**
- 🎨 [auditoria_ux_quickwins_backlog_v2.md](./auditoria_ux_quickwins_backlog_v2.md) — Auditoria de UI/UX (atritos por jornada), os **24 quick wins** (com status de implementação) e o **Backlog V2** estratégico.

---

## 🤖 Instruções para a Próxima Sessão (Como Retomar)

Quando iniciar uma nova conversa com o agente de IA, siga os passos abaixo para garantir a continuidade:

### Passo 1: Atualizar o PRD com as Respostas da Engenheira
Cole as respostas recebidas da engenheira para as perguntas do arquivo [revisao_critica_prd.md](file:///c:/Users/rickt/OneDrive/Desktop/Criação de app/revisao_critica_prd.md) e peça para a IA ajustar o [PRD_MVP.md](file:///c:/Users/rickt/OneDrive/Desktop/Criação de app/PRD_MVP.md). Os 7 gaps críticos devem ser formalmente resolvidos dentro do PRD.

### Passo 2: Rodar o Prompt de Geração da SPEC Técnica
Após consolidar o PRD, use o prompt abaixo para pedir à IA a criação do documento de especificações técnicas completo.

#### 📋 Prompt para Geração da SPEC Técnica:
```text
Você vai atuar agora como um Arquiteto de Software Sênior e Tech Lead. Eu vou te fornecer abaixo o Documento de Requisitos do Produto (PRD) de um aplicativo para um Laboratório de Engenharia.

A sua missão é transformar este PRD em uma Especificação Técnica (SPEC) completa, detalhada e estruturada em formato Markdown altamente estruturado. Este documento servirá como um manual de instruções exato para que os agentes de IA de desenvolvimento escrevam o código sem precisarem tomar decisões por conta própria.

A sua SPEC deve rigorosamente conter a seguinte estrutura:

1. Divisão em Sprints: Divida o desenvolvimento em Sprints lógicas (ex: Sprint 001, Sprint 002). Cada Sprint deve ter um objetivo claro (ex: Configurar infraestrutura base, Criar módulo de autenticação, etc.).

2. Stack de Tecnologias e Coder Agent ID: Para cada Sprint, defina a stack de tecnologias necessária e o "Coder Agent ID" (ex: Agente Front-end, Agente Back-end, Agente Full-Stack, Agente Banco de Dados) que será responsável por codar aquela etapa.

3. Features e Critérios de Aceite (Definition of Done) - [MUITO IMPORTANTE]: Dentro de cada Sprint, liste as Features (entregáveis). Para cada Feature, crie Critérios de Aceite exaustivos. Atenção: Não documente apenas o 'caminho feliz'. Você precisa mapear Cenários Alternativos (Edge Cases). O que acontece se o usuário inserir um dado errado no laboratório? Como tratar erros 401 ou 500? Quais mensagens de erro exatas devem aparecer na interface? Os botões devem ficar desabilitados durante o loading? Seja metódico.

4. Data Models (Modelos de Dados): Especifique os esquemas de banco de dados, tabelas, tipagens de variáveis e as relações necessárias para o aplicativo do laboratório funcionar (incluindo tabelas de auditoria e roles).

5. API Spec (Especificação de API): Mapeie todos os endpoints, os métodos (GET, POST, etc.), os payloads de envio e, obrigatoriamente, as respostas esperadas tanto para sucesso (200) quanto para erros (ex: 400, 404, 500).

6. Hints e Notas de Arquitetura: Forneça dicas de quais arquivos devem ser criados/modificados e padrões de arquitetura a serem seguidos (ex: arquitetura de pastas, uso de componentes específicos).

Por favor, gere a SPEC completa com base nessas regras e no PRD abaixo.

[COLE O CONTEÚDO ATUALIZADO DO PRD_MVP.md AQUI]
```

### Passo 3: Executar a Sprint 001 (Usando o comando `/go` na nova sessão)
Uma vez que o SPEC técnico (`SPEC_TECNICA.md`) e o `sprints.json` estiverem gerados e validados, use o prompt de desenvolvimento de sprint para iniciar a construção.

#### 🚀 Prompt para Desenvolvimento de Sprint:
O prompt completo, rigoroso e determinístico está em **[`prompt_desenvolver_sprint.md`](./prompt_desenvolver_sprint.md)**. Ele já vem configurado com a **Sprint alvo `S001`**; para rodar outra sprint (`S002`, `S003`…), basta trocar o ID do "Sprint alvo" no topo do arquivo.

Principais melhorias em relação ao prompt inicial:
- Referencia os arquivos reais do projeto (`SPEC_TECNICA.md`, `sprints.json`, `PRD_MVP.md`, `MEMORIA_PROJETO.md`) em vez de `cloud.md`/`gemini.md` inexistentes.
- Fixa o escopo exato (só a sprint alvo, sem antecipar features futuras) e lista as features de `S001`.
- Traz as diretrizes de código obrigatórias (idioma, nomenclatura, DRY/SOLID, RLS default-deny, ergonomia).
- Adapta a "condição de conclusão" a sprints de banco/infra (ex.: `supabase db reset`, `gen types`, pgTAP), já que a Sprint 001 não tem UI executável.
- Define o ciclo executor→revisor, o Definition of Done em checklist, as regras de Git da branch designada e o formato do relatório final.

