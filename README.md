# 🚧 Controle Tecnológico de Concreto — MVP

Este repositório contém os documentos de concepção e especificação para o novo aplicativo de gestão e operação de um laboratório de concreto.

---

## 📌 Status Atual do Projeto

**Fase Atual:** PRD consolidado (v2.0) & Pronto para a Geração da SPEC Técnica.

1. **Revisão Crítica Realizada:** Foi mapeado um conjunto de gaps críticos e edge cases no PRD original, gerando o relatório [revisao_critica_prd.md](file:///c:/Users/rickt/OneDrive/Desktop/Criação de app/revisao_critica_prd.md).
2. **Respostas da Engenheira Recebidas:** As 25 perguntas de validação foram respondidas pela engenheira e, junto com um laudo real de referência, usadas para atualizar o PRD.
3. **7 Gaps Críticos Resolvidos:** O [PRD_MVP.md](file:///c:/Users/rickt/OneDrive/Desktop/Criação de app/PRD_MVP.md) (v2.0) resolve formalmente os 7 gaps — Critérios de Aceite em todas as User Stories, Matriz RBAC, Audit Trail, Máquinas de Estado (CP e Laudo), Normas Técnicas, Fórmula kgf→MPa e CRUD de Obras (ver o índice na Seção 1.1 do PRD).
4. **Próximo Passo:** Rodar o prompt de geração de SPEC em uma nova sessão (Passo 2 abaixo), usando o PRD atualizado.

---

## 📂 Mapeamento de Arquivos do Projeto

- 📄 [PRD_MVP.md](file:///c:/Users/rickt/OneDrive/Desktop/Criação de app/PRD_MVP.md) — Documento de Requisitos do Produto (MVP). Contém o escopo e regras de negócio simplificadas.
- 📄 [revisao_critica_prd.md](file:///c:/Users/rickt/OneDrive/Desktop/Criação de app/revisao_critica_prd.md) — Análise implacável do PRD com **7 Gaps Críticos**, edge cases e as **25 perguntas de validação**.
- 📄 [implementation_plan.md](file:///c:/Users/rickt/OneDrive/Desktop/Criação de app/implementation_plan.md) — Esboço inicial da modelagem lógica do banco de dados (PostgreSQL/Supabase) e fluxo de telas.
- 📄 [roteiro_entrevista_laboratorio.md](file:///c:/Users/rickt/OneDrive/Desktop/Criação de app/roteiro_entrevista_laboratorio.md) — Mapeamento do fluxo operacional atual e gargalos detectados na entrevista inicial.
- 📄 [MEMORIA_PROJETO.md](file:///c:/Users/rickt/OneDrive/Desktop/Criação de app/MEMORIA_PROJETO.md) — Histórico conceitual do projeto e diretrizes de desenvolvimento.

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
Uma vez que o SPEC técnico estiver gerado e validado, você poderá usar o prompt abaixo na sua nova sessão para iniciar o desenvolvimento da Sprint 001.

#### 🚀 Prompt para Desenvolvimento da [Sprint 001]:
```text
Construa EXATAMENTE a [Sprint 001] descrita no documento SPEC (ou arquivo sprints.json).
A sua missão é atuar como o agente desenvolvedor e entregar apenas esta Sprint. Siga rigorosamente as instruções abaixo:
1. Escopo e Referências: Use o documento PRD para entender o contexto de negócio. Siga rigorosamente todas as diretrizes de código definidas no arquivo cloud.md (ou gemini.md). Utilize as notas de arquitetura e modelos de dados mapeados na SPEC.
2. Critérios de Aceite: Para cada Feature listada na [Sprint 001], você deve implementar e verificar todos os Critérios de Aceite (Definition of Done) e Cenários Alternativos (Edge Cases). O agente gerente deve validar se todas as mensagens de erro (ex: 401, campos inválidos) estão aparecendo corretamente na interface como definido na SPEC.
3. Execução Autônoma: Use seus agentes (executor e gerente) para avaliar continuamente o seu próprio trabalho. Se algo falhar nos critérios de aceite, refaça antes de me devolver a resposta.
4. Condição de Conclusão: O objetivo só deve ser considerado completo e a execução encerrada quando:
- Todas as tarefas da [Sprint 001] estiverem implementadas.
- O aplicativo estiver rodando localmente sem erros.
- O melhor comando de validação disponível (como build ou typecheck) passar.
- O resultado estiver perfeitamente alinhado com a SPEC e os Critérios de Aceite.
```

