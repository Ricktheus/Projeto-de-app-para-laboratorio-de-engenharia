# Memória do Projeto - Aplicativo para Controle Tecnológico de Concreto

> **Atenção:** Este documento serve como base de conhecimento e memória técnica para que qualquer desenvolvedor humano ou inteligência artificial (IA) possa dar continuidade ao projeto do zero, sem perda de contexto operacional ou de regras de negócio.

---

## 📄 1. Contexto e Problema de Negócio

Este projeto visa solucionar os gargalos operacionais de um **Laboratório de Controle Tecnológico de Concreto**, especializado na moldagem e rompimento de corpos de prova (cilindros de concreto para ensaio de compressão).

### A Equipe e Rotina:
* **Sócio de Campo:** Realiza visitas a obras pela manhã (especialmente para a concreteira **Tarcal**, cliente fixa diária), faz ensaios de abatimento (Slump Test), molda corpos de prova e realiza coletas.
* **Engenheira de Laboratório (RT/CREA):** Realiza os rompimentos dos corpos de prova (CPs) na prensa no período da tarde, faz visitas técnicas, revisa os laudos e realiza a assinatura digital via gov.br (PDF).
* **Engenheiro de Escritório:** Recebe os dados de concretagem (atualmente por fotos de fichas de papel), digita as informações no Excel, gera os gráficos de resistência, monta os laudos PDFs e os disponibiliza para a engenheira assinar e enviar aos clientes.

---

## 🔍 2. Dores Críticas Resolvidas pelo Escopo do MVP

1. **Gargalo de Coleta (24 horas):** Os corpos de prova moldados em obra devem ser coletados e levados para o laboratório (cura úmida) em até 24 horas. Pela agenda lotada, esse prazo frequentemente estourava, prejudicando a cura e resistência do CP.
   * *Solução:* O app gerará uma **agenda diária automática** informando quais coletas de CPs de 24h devem ser feitas no dia seguinte.
2. **Perda de Rastreabilidade (Canetão):** Os CPs eram identificados com pincel atômico no concreto, gerando códigos ilegíveis ou apagados.
   * *Solução:* O Sócio usará uma **mini-impressora térmica Bluetooth** na própria obra para imprimir etiquetas adesivas impermeáveis com QR Code, vinculadas diretamente à nota fiscal.
3. **Transcrição Manual de Notas Fiscais:** O engenheiro de escritório digitava manualmente dados das fotos das notas fiscais para o Excel.
   * *Solução:* O app mobile usará a câmera para tirar foto da NF, e uma inteligência artificial (OCR contextual via GPT-4o-mini Vision) extrairá os dados automaticamente (FCK, volume, nº da NF, concreteira, data).
4. **Segurança contra Fraudes no Laudo:** Risco de clientes quebrarem o PDF do laudo para alterar o resultado da resistência (MPa) e burlar fiscalizações.
   * *Solução:* **Segurança em Três Camadas:**
     1. Assinatura digital gov.br (PAdES) no PDF, invalidando-o se alterado.
     2. Geração de código de verificação hash único e **QR Code de Validação Pública** no rodapé do laudo (aponta para uma página web oficial do laboratório mostrando os dados originais do banco).
     3. PDF gerado com travas de edição de texto e cópia.
5. **Gargalo no Envio de WhatsApp:** Laudos prontos demoravam a ser entregues porque a engenheira de campo estava offline ou ocupada.
   * *Solução:* **Portal do Cliente self-service** onde o cliente acessa diretamente e faz o download de seus laudos validados.

---

## 🚀 3. Especificações Técnicas e de Engenharia de Software

### Stack Proposta:
* **Mobile (Sócio & Engenheira):** React Native + Expo + TypeScript (para facilidade de integração Bluetooth e câmera nativa).
* **Painel Web (Escritório & Portal do Cliente):** React + Vite + Tailwind CSS.
* **Backend:** Supabase (Auth, Postgres Database, Storage para fotos e PDFs, Edge Functions para OCR e geração de laudos).
* **Prensa e Cálculos:** O técnico medirá peso (g) e dimensões reais (diâmetro e altura com paquímetro) e inserirá no app. O cálculo de MPa ($Tensão = Força / Área$) é automatizado no app.
* **Fotos no Laudo:** O PDF do laudo habitual para o cliente **não terá fotos**, para manter-se limpo e leve. As fotos de evidência de rompimento (Antes/Depois) serão salvas em um **laudo técnico anexo secundário**, para auditorias regulatórias (ISO 9001).

---

## 📋 4. Diretrizes para Próximas IAs (Como Continuar)

1. **Consultar o Plano de Implementação:** O arquivo `implementation_plan.md` na raiz contém a modelagem lógica do banco de dados (tabelas e chaves) e as fases de entrega.
2. **Padrões do Código:**
   * O código deve ser limpo, modular e aderir a boas práticas (ex: DRY, SOLID).
   * Os comentários e variáveis do código devem estar em **inglês**, mas a interface do usuário e as mensagens de resposta da IA devem estar em **português**.
3. **Ergonomia e Prensa:** Lembre-se que as telas de prensa no mobile precisam de botões confortáveis (grandes), pois o operador estará com as mãos sujas.
4. **Offline Mode:** O laboratório confirmou que **não há necessidade de modo offline** no aplicativo.
