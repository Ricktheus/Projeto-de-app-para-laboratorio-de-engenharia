# Plano de Implementação - App para Controle Tecnológico de Concreto

Este documento define a arquitetura técnica, modelo de dados, fluxos de tela e etapas de desenvolvimento para o MVP do aplicativo de ensaios de concreto.

---

## 🛠️ Stack Tecnológica Proposta

Para garantir rapidez de entrega, estabilidade e capacidade de integração com hardware (impressoras Bluetooth), propomos:

1. **Aplicativo Mobile (Campo & Prensa):** 
   * **Framework:** React Native + Expo (TypeScript).
   * **Justificativa:** Acesso nativo a Bluetooth (para impressora portátil), câmera rápida e possibilidade de build para Android/iOS de forma ágil.
2. **Painel Web (Escritório & Portal do Cliente):**
   * **Framework:** React + Vite + Tailwind CSS.
   * **Justificativa:** Interface responsiva, carregamento instantâneo, e facilidade para geração e visualização de PDF.
3. **Backend & Banco de Dados:**
   * **Plataforma:** Supabase (Postgres).
   * **Serviços Utilizados:** 
     * *Auth:* Controle de login e níveis de acesso (Sócio, Engenheiros, Clientes).
     * *Database:* Postgres relacional com suporte a consultas complexas (análise de concreteiras).
     * *Storage:* Armazenamento de fotos dos CPs, NFs e laudos PDFs gerados.
     * *Edge Functions:* Processamento do OCR (leitura da foto da NF) e geração/travamento dos PDFs.
4. **Extração de Dados (OCR):**
   * **Serviço:** OpenAI GPT-4o-mini Vision (via Supabase Edge Function).
   * **Justificativa:** Muito superior a leitores OCR tradicionais, pois consegue interpretar notas fiscais com amassados, sombras e de diferentes layouts/concreteiras de forma contextual.

---

## 🗄️ Modelagem do Banco de Dados (PostgreSQL)

```mermaid
erDiagram
    USUARIOS {
        uuid id PK
        string email
        string role "socio_campo | eng_lab | eng_escritorio | cliente"
        bool is_admin "true p/ os 2 sócios (gestão de usuários)"
    }
    CLIENTES {
        uuid id PK
        string nome
        string cnpj
        string email
    }
    OBRAS {
        uuid id PK
        uuid cliente_id FK
        string nome
        string sigla "único por cliente"
        string gps_latitude
        string gps_longitude
        uuid criado_por FK
        bool ativo "soft-delete (retenção vitalícia)"
    }
    CONCRETAGENS {
        uuid id PK
        uuid obra_id FK
        date data_concretagem
        float slump_medido
        float slump_projeto "alvo definido em projeto"
        float slump_tolerancia "ex: 2 (±)"
        string placa_caminhao
        string lacre_caminhao
        string aditivo
        string nf_numero
        string nf_foto_url
        float fck_projeto
        float volume_m3
        string concreteira
        uuid cadastrado_por FK
        timestamp updated_at "optimistic locking"
    }
    CORPOS_PROVA {
        uuid id PK
        uuid concretagem_id FK
        string codigo_rastreio "QR Code"
        date data_moldagem
        int idade_alvo_dias "livre: 3|7|14|28|63|91..."
        date data_ruptura_planejada
        string status "moldado | coletado | rompido | descartado | expurgado"
        string motivo_descarte "obrigatório em descarte/expurgo"
        uuid coletado_por FK
        timestamp coletado_em
    }
    RUPTURAS {
        uuid id PK
        uuid corpo_prova_id FK "1 para 1"
        date data_ruptura_real
        float peso_g
        float diametro_mm "medido (rastreabilidade)"
        float altura_mm "medido (rastreabilidade)"
        float diametro_nominal_mm "base do cálculo de MPa"
        float fator_correcao_hd "default 1.00 (retífica futura)"
        float carga_ruptura_kgf
        float mpa_calculado
        string tipo_fratura "cabeça|face|parcial|total|cisalhamento|trinca"
        string foto_antes_url
        string foto_depois_url
        uuid executado_por FK
    }
    LAUDOS {
        uuid id PK
        uuid cliente_id FK "Para consultas do portal"
        string tipo_laudo "parcial_7d | parcial_14d | final_28d"
        int versao "versionamento (correção)"
        uuid substitui_laudo_id FK "aponta p/ versão anterior"
        string codigo_verificacao UK "Código Anti-Fraude"
        date data_emissao
        string pdf_original_url
        string assinatura_rt_url "obrigatória p/ publicar"
        string assinatura_elaborador_url "2ª assinatura (opcional)"
        string status "rascunho | pronto_assinatura | assinado | substituido"
    }
    LAUDO_CONCRETAGENS {
        uuid laudo_id FK "junção: 1 laudo por NF (padrão) ou agrupado"
        uuid concretagem_id FK
    }
    AUDIT_LOG {
        uuid id PK
        uuid user_id FK
        string action "INSERT | UPDATE | DELETE"
        string table_name
        uuid record_id
        json old_value
        json new_value
        string motivo
        timestamp created_at
    }
```

> **Nota:** o vínculo laudo↔concretagem passou de FK direta para a tabela de junção `LAUDO_CONCRETAGENS`, suportando o padrão **1 laudo por NF** e o **agrupamento opcional** de várias NFs da mesma obra (ver PRD, Seção 2.3).

---

## 📱 Fluxo de Telas e Interface

### 1. Aplicativo Mobile (Sócio de Campo - Moldagem e Coleta)
* **Tela de Moldagem:**
  * Botão de câmera para tirar foto da NF (dispara o OCR) e opção de "Preenchimento Manual" (fallback). Ao salvar a concretagem, o sistema gera automaticamente 4 registros de Corpos de Prova (2x 7 dias, 2x 28 dias).
  * Campos manuais: Slump (abatimento), Placa, Lacre, Aditivo, nº de CPs (padrão 4).
  * Botão "Gerar Etiquetas": Envia comando Bluetooth e imprime as 4 etiquetas (contendo QR Code + Texto visível: Obra, Data, Idade e ID).
* **Tela de Coleta:**
  * Lista de CPs pendentes de coleta (aqueles que completaram 24h em obra).
  * O sócio escaneia o QR Code do CP ao tirá-lo do molde para confirmar a coleta e iniciar o processo de cura úmida no laboratório.

### 2. Aplicativo Mobile (Engenheira - Prensa)
* **Tela de Prensa/Rompimento:**
  * Lista unificada de CPs a serem rompidos no dia (Cura concluída de 7 ou 28 dias).
  * Campo de busca rápida via scanner de QR Code.
  * Inputs grandes: Peso (g), Diâmetro (mm), Altura (mm) e Carga de Ruptura (kgf).
  * Seletor de Tipo de Fratura (Guia visual com desenhos de fratura cônica, cisalhamento, etc.).
  * O app calcula o MPa na hora e gera o rascunho do laudo.

### 3. Painel Web (Engenheiro de Escritório & Portal do Cliente)
* **Área do Escritório:**
  * Visualização instantânea e tela de **edição** das concretagens recebidas do campo.
  * Tela de validação final e emissão do Laudo Parcial (7d) e Laudo Final (28d) em PDF (criptografado, com QR code de verificação no rodapé).
* **Área da Engenheira:**
  * Recebe aviso de laudos prontos, baixa o PDF, assina via gov.br e faz o upload da versão assinada de volta no painel.
* **Portal do Cliente:**
  * Visualização e download dos laudos liberados (filtrado pelo CNPJ/CNPJ do cliente).
  * Painel de consulta pública de autenticidade (onde fiscais validam o laudo via código único).

---

## 🎯 Plano de Entrega (Fases de Desenvolvimento)

### Fase 1: Fundação & Banco de Dados (1 semana)
* Setup do projeto web/mobile e banco de dados Supabase.
* Implementação das tabelas, regras de segurança (RLS) e autenticação de usuários.

### Fase 2: Aplicativo Mobile de Campo & Conexão Bluetooth (2 semanas)
* Fluxo de entrada da concretagem e foto da NF.
* Integration do OCR (OpenAI Vision) para leitura da NF.
* Integração e teste de impressão de etiquetas via Bluetooth em impressora portátil.
* Módulo de coletas de 24h e geração da agenda diária no app.

### Fase 3: Módulo Prensa & Geração de Laudos (2 semanas)
* Tela de rompimento (prensa), cálculos de MPa e seletor gráfico de fratura.
* Script de geração automática de PDF protegido contra edição, com inclusão de código hash de rastreamento e QR Code de verificação.
* Painel de aprovação de relatórios da engenheira responsável.

### Fase 4: Portal do Cliente & Validação Anti-Fraude (1 semana)
* Portal de downloads dos laudos em PDF para os clientes.
* Tela de consulta pública para verificação de laudos legítimos pelo código de segurança.
* Exportador Excel cruzando dados de desempenho de concreteiras.

---

## 🛡️ Plano de Segurança e Verificação

### Testes de Validação:
1. **Teste do OCR:** Envio de notas fiscais reais (Tarcal e outras) para garantir que fck, placa e número da NF sejam extraídos perfeitamente.
2. **Teste da Impressora Bluetooth:** Garantir que o app envie comandos ESC/POS e o QR code seja impresso com clareza.
3. **Teste Anti-Fraude (PDF):** Tentar editar o PDF gerado em leitores comuns para garantir que a permissão está bloqueada e que o QR Code aponta para o registro correto.
