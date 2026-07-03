# Prompt para Geração da SPEC Técnica (nova sessão)

> Cole **todo** o conteúdo abaixo na nova sessão. Se a nova sessão for do Claude Code **neste mesmo repositório**, os arquivos citados já estão em disco — a IA deve lê-los. Se for uma ferramenta **sem acesso ao repo**, cole também o conteúdo dos arquivos listados no bloco "ARQUIVOS-BASE".

---

Você é um Arquiteto de Software Principal (Principal Engineer) e Tech Lead especializado em coordenar Agentes de IA de Desenvolvimento (como Cursor, Devin ou agentes multi-agentes autônomos).

Sua missão é converter o Documento de Requisitos do Produto (PRD) de um aplicativo para um Laboratório de Engenharia em uma Especificação Técnica (SPEC) exaustiva, determinística e altamente estruturada em Markdown. Este documento será o manual de instruções literal e exato para que os Agentes Codificadores escrevam o código sem precisarem inferir ou tomar decisões arquitetônicas por conta própria.

## ARQUIVOS-BASE (leia TODOS antes de gerar a SPEC)

Não use apenas o PRD. Leia e cruze os seguintes arquivos do repositório:

1. **`PRD_MVP.md`** — Fonte primária: regras de negócio, RBAC, máquinas de estado, fórmulas, critérios de aceite e layout do laudo.
2. **`implementation_plan.md`** — Modelo de dados (ER), stack e fases. Use como base para a Seção 4 (Data Models).
3. **`MEMORIA_PROJETO.md`** — Contexto de negócio e **diretrizes de código** (ver "Convenções obrigatórias" abaixo).
4. **`c36756fc-001_ENSAIO_7_DIAS_REBRASCOM_assinado.pdf`** — Laudo real. É a **verdade do layout** do PDF (feature de geração de laudo). Se não conseguir abrir o PDF, use a Seção 11 do PRD, que descreve o layout.
5. **`revisao_critica_prd.md`** — Origem dos 7 gaps e dos edge cases; use para enriquecer os "Sad Paths".

## PREMISSAS DE DOMÍNIO JÁ RESOLVIDAS (NÃO re-decidir)

Estas decisões já foram validadas com a engenheira responsável. Trate-as como fixas; não as "reinvente":

* **Stack macro já está travada** (PRD, Seção 4): Mobile = React Native + Expo (TypeScript); Web = React + Vite + Tailwind; Backend = Supabase (Postgres, Auth, Storage, Edge Functions); OCR = GPT-4o-mini Vision via Edge Function. **Você decide apenas as bibliotecas específicas** dentro dessa stack (ex.: lib de PDF, de QR Code, de Bluetooth BLE, navegação, estado/cache, gráficos, testes) — e deve documentar cada escolha.
* **Cálculo de MPa:** `MPa = (Carga_kgf × 9,80665) / (π × d_nominal_mm² / 4)`, usando **diâmetro NOMINAL** (não o medido). Arredondamento: **MPa 2 casas decimais; KGF inteiro**. (PRD, Seção 7.)
* **fck — NÃO é calculado.** O fck é definido em projeto, vem na Nota Fiscal e é apenas **capturado (OCR) e transcrito** ao laudo. Não implemente cálculo estatístico da NBR 12655 (ψ6/amostragem parcial). (PRD, Seção 6.2.)
* **Projeção de resistência para 28 dias:** por **fatores percentuais fixos, iguais para todos os tipos de cimento**: 7 dias ≈ 65–70% e 14 dias ≈ 85–90% da resistência final. Defaults **configuráveis**: 7d = 0,70 e 14d = 0,90. `f28_estimado = f_idade / fator(idade)`. (PRD, Seção 6.2.)
* **CPs e idades:** totalmente **configuráveis por concretagem** (sem número fixo). O nº de etiquetas e a agenda derivam dessa configuração.
* **Estados:** implemente as máquinas de estado do PRD (Seção 5) como enums + guardas — CP: `moldado|coletado|rompido|descartado|expurgado`; Laudo: `rascunho|pronto_assinatura|assinado|substituido`.
* **RBAC → RLS:** converta a **Matriz RBAC** (PRD, Seção 3) em políticas **Row Level Security** do Supabase. A página pública de validação (US19) é o único endpoint sem login.
* **Auditoria:** implemente a tabela `audit_log` e o `motivo` obrigatório em descarte/expurgo (PRD, Seção 9). Sem exclusão física (retenção **vitalícia**); correção de laudo é **versionada**.
* **Laudo:** 1 laudo por NF por padrão, com **agrupamento opcional** de várias NFs da mesma obra; **uma** assinatura (RT) basta para publicar, 2ª assinatura opcional.

## CONVENÇÕES DE CÓDIGO OBRIGATÓRIAS (de `MEMORIA_PROJETO.md`)

* Comentários e nomes de variáveis/funções em **inglês**.
* Interface do usuário e mensagens (inclusive respostas da IA) em **português**.
* Código limpo, modular, aderente a DRY e SOLID.
* Ergonomia: telas de prensa (mobile) com **botões grandes e de alto contraste** (uso com luvas/mãos sujas).
* Sem modo offline (o app exige internet).

## REGRA DE OURO

Não presuma nada. Se, **além** das premissas acima, o PRD for omisso em algum detalhe técnico, adote o padrão de mercado mais escalável, seguro e moderno, e **documente explicitamente essa premissa** na seção correspondente.

---

A sua SPEC deve ser gerada rigorosamente com a seguinte estrutura:

## 1. Visão Geral e Arquitetura Base
* **Resumo Técnico:** O que será construído em 2-3 frases.
* **Padrões de Projeto:** Arquitetura escolhida (ex: Clean Architecture, MVC, Microsserviços) e o motivo.
* **Convenções de Código:** Padrões de nomenclatura (camelCase, snake_case), linting e tratamento global de erros. *(Respeite as "Convenções obrigatórias" acima.)*

## 2. Divisão de Sprints e Alocação de Agentes
Divida o desenvolvimento em Sprints lógicas incrementais. Para cada Sprint, defina:
* **Sprint ID e Objetivo:** (ex: Sprint 001 - Infraestrutura Base e Auth).
* **Tech Stack Específica:** Quais tecnologias e bibliotecas exatas serão usadas nesta etapa.
* **Coder Agent ID:** Qual perfil de agente deve executar a tarefa (ex: `Agent-Frontend-React`, `Agent-DB-Postgres`, `Agent-DevOps`).

## 3. Features e Definition of Done (DoD) Absoluto [CRÍTICO]
Para cada Sprint, liste as Features com granularidade extrema. Os agentes são literais, portanto, mapeie:
* **User Story / Feature:** O que deve ser feito.
* **Regras de Negócio:** Restrições lógicas explícitas.
* **Critérios de Aceite (Happy Path):** O fluxo ideal passo a passo.
* **Edge Cases e Tratamento de Erros (Sad Path):**
    * O que acontece se houver erro de validação (ex: input incorreto no laboratório)?
    * Como lidar com timeouts, erros 401, 403, 404 e 500?
    * Quais são as mensagens de erro exatas (textos) que devem aparecer na UI?
* **Estados da UI (State Management):** Especifique o comportamento visual em `Loading`, `Success`, `Error` e `Empty State` (ex: "botão de submissão deve receber prop 'disabled' e exibir spinner durante o request").

## 4. Modelagem de Dados (Data Models)
Defina a estrutura do banco de dados de forma que o agente possa gerar as migrations diretamente:
* **Esquemas e Tabelas:** Nome das tabelas/coleções.
* **Colunas/Atributos:** Nome, Tipagem exata (ex: VARCHAR(255), UUID, BOOLEAN), e restrições (Nullable, Unique, Primary Key, Foreign Key).
* **Relacionamentos:** 1:1, 1:N, N:M.
* **Tabelas de Apoio:** Roles, permissões e tabelas de auditoria (created_at, updated_at, deleted_at).
* **Políticas RLS:** Para cada tabela, descreva as políticas de Row Level Security que implementam a Matriz RBAC do PRD.
*(Dica para a IA: Use uma sintaxe pseudo-ORM compreensível, como esquema Prisma ou diagramas Mermaid.js em formato texto.)*

## 5. Contratos de API (API Spec)
Crie um mapeamento estilo OpenAPI/Swagger para todos os endpoints necessários (incluindo Edge Functions de OCR e de geração de PDF):
* **Endpoint e Método:** (ex: `POST /api/v1/lab/experiments`)
* **Headers:** Autenticação necessária (ex: Bearer Token).
* **Request Payload:** Estrutura em JSON de exemplo.
* **Response (Sucesso - 20x):** Estrutura em JSON de exemplo.
* **Response (Erros - 40x / 50x):** Estrutura padrão do payload de erro (ex: `{ "error": "code", "message": "string" }`).

## 6. Guias de Implementação e Árvore de Diretórios
Forneça as diretrizes para a criação dos arquivos:
* **Árvore de Diretórios Esperada:** Representação em texto da estrutura de pastas (mobile e web).
* **Hints de Implementação:** Quais arquivos específicos criar ou modificar. Onde colocar utilitários, hooks, serviços de API e componentes reutilizáveis.

## 7. Requisitos Não Funcionais (Segurança e Testes)
* **Segurança:** Regras de sanitização de inputs, proteção contra CSRF/XSS, controle de rate limit (inclusive o limite de 3 tentativas de OCR por concretagem), e a proteção anti-fraude do PDF/QR Code.
* **Testes Esperados:** Quais componentes ou funções críticas exigem testes unitários (ex: Jest/Testing Library). No mínimo: a função de cálculo de MPa, a projeção 7/14→28d, as transições das máquinas de estado e as políticas RLS.

## 8. Saída Adicional Obrigatória: `sprints.json`
Além da SPEC em Markdown, gere um arquivo **`sprints.json`** legível por máquina, com a lista de sprints. Cada sprint deve conter: `id`, `objetivo`, `coder_agent_id`, `stack` (array), e `features` (array de objetos com `id`, `user_story`, `criterios_aceite` [array], `edge_cases` [array]). Este arquivo será consumido pelo comando `/go` na etapa de desenvolvimento.

---

Por favor, analise profundamente os ARQUIVOS-BASE e gere a SPEC completa (Seções 1 a 7) **mais** o `sprints.json` (Seção 8), garantindo que nenhum detalhe seja deixado à interpretação do agente de código.
