/**
 * Typed database schema for the concrete-testing MVP.
 *
 * This mirrors the output shape of `supabase gen types typescript` for the
 * `public` schema defined in supabase/migrations/*. It is checked in so the
 * monorepo type-checks without a live project; regenerate it against a real
 * Supabase instance (or `supabase db reset` + local stack) with:
 *
 *   pnpm db:types
 *   # => supabase gen types typescript --local > packages/supabase/src/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string;
          nome: string;
          cnpj: string | null;
          email: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          cnpj?: string | null;
          email?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          cnpj?: string | null;
          email?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      usuarios: {
        Row: {
          id: string;
          nome: string;
          email: string;
          role: Database['public']['Enums']['user_role'];
          is_admin: boolean;
          cliente_id: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nome: string;
          email: string;
          role?: Database['public']['Enums']['user_role'];
          is_admin?: boolean;
          cliente_id?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string;
          role?: Database['public']['Enums']['user_role'];
          is_admin?: boolean;
          cliente_id?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'usuarios_cliente_id_fkey';
            columns: ['cliente_id'];
            isOneToOne: false;
            referencedRelation: 'clientes';
            referencedColumns: ['id'];
          },
        ];
      };
      obras: {
        Row: {
          id: string;
          cliente_id: string;
          nome: string;
          sigla: string;
          endereco: string | null;
          contato: string | null;
          gps_latitude: number | null;
          gps_longitude: number | null;
          criado_por: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          nome: string;
          sigla: string;
          endereco?: string | null;
          contato?: string | null;
          gps_latitude?: number | null;
          gps_longitude?: number | null;
          criado_por: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          nome?: string;
          sigla?: string;
          endereco?: string | null;
          contato?: string | null;
          gps_latitude?: number | null;
          gps_longitude?: number | null;
          criado_por?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'obras_cliente_id_fkey';
            columns: ['cliente_id'];
            isOneToOne: false;
            referencedRelation: 'clientes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'obras_criado_por_fkey';
            columns: ['criado_por'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
        ];
      };
      concretagens: {
        Row: {
          id: string;
          obra_id: string;
          data_concretagem: string;
          nf_numero: string;
          nf_foto_url: string | null;
          fck_projeto: number;
          volume_m3: number;
          concreteira: string | null;
          slump_projeto: number | null;
          slump_tolerancia: number | null;
          slump_medido: number | null;
          diametro_nominal_mm: number;
          altura_nominal_mm: number;
          quadra: string | null;
          lote: string | null;
          traco: string | null;
          placa_caminhao: string | null;
          lacre_caminhao: string | null;
          aditivo: string | null;
          cadastrado_por: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          obra_id: string;
          data_concretagem: string;
          nf_numero: string;
          nf_foto_url?: string | null;
          fck_projeto: number;
          volume_m3: number;
          concreteira?: string | null;
          slump_projeto?: number | null;
          slump_tolerancia?: number | null;
          slump_medido?: number | null;
          diametro_nominal_mm?: number;
          altura_nominal_mm?: number;
          quadra?: string | null;
          lote?: string | null;
          traco?: string | null;
          placa_caminhao?: string | null;
          lacre_caminhao?: string | null;
          aditivo?: string | null;
          cadastrado_por: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          obra_id?: string;
          data_concretagem?: string;
          nf_numero?: string;
          nf_foto_url?: string | null;
          fck_projeto?: number;
          volume_m3?: number;
          concreteira?: string | null;
          slump_projeto?: number | null;
          slump_tolerancia?: number | null;
          slump_medido?: number | null;
          diametro_nominal_mm?: number;
          altura_nominal_mm?: number;
          quadra?: string | null;
          lote?: string | null;
          traco?: string | null;
          placa_caminhao?: string | null;
          lacre_caminhao?: string | null;
          aditivo?: string | null;
          cadastrado_por?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'concretagens_obra_id_fkey';
            columns: ['obra_id'];
            isOneToOne: false;
            referencedRelation: 'obras';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'concretagens_cadastrado_por_fkey';
            columns: ['cadastrado_por'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
        ];
      };
      corpos_prova: {
        Row: {
          id: string;
          concretagem_id: string;
          codigo_rastreio: string;
          data_moldagem: string;
          idade_alvo_dias: number;
          data_ruptura_planejada: string;
          status: Database['public']['Enums']['cp_status'];
          mandatorio_28d: boolean;
          coleta_atrasada: boolean;
          motivo_descarte: string | null;
          coletado_por: string | null;
          coletado_em: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          concretagem_id: string;
          codigo_rastreio: string;
          data_moldagem: string;
          idade_alvo_dias: number;
          data_ruptura_planejada: string;
          status?: Database['public']['Enums']['cp_status'];
          mandatorio_28d?: boolean;
          coleta_atrasada?: boolean;
          motivo_descarte?: string | null;
          coletado_por?: string | null;
          coletado_em?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          concretagem_id?: string;
          codigo_rastreio?: string;
          data_moldagem?: string;
          idade_alvo_dias?: number;
          data_ruptura_planejada?: string;
          status?: Database['public']['Enums']['cp_status'];
          mandatorio_28d?: boolean;
          coleta_atrasada?: boolean;
          motivo_descarte?: string | null;
          coletado_por?: string | null;
          coletado_em?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'corpos_prova_concretagem_id_fkey';
            columns: ['concretagem_id'];
            isOneToOne: false;
            referencedRelation: 'concretagens';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corpos_prova_coletado_por_fkey';
            columns: ['coletado_por'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
        ];
      };
      rupturas: {
        Row: {
          id: string;
          corpo_prova_id: string;
          data_ruptura_real: string;
          peso_g: number | null;
          diametro_mm: number | null;
          altura_mm: number | null;
          diametro_nominal_mm: number;
          fator_correcao_hd: number;
          carga_ruptura_kgf: number;
          mpa_calculado: number;
          tipo_fratura: Database['public']['Enums']['tipo_fratura'];
          motivo_expurgo: string | null;
          executado_por: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          corpo_prova_id: string;
          data_ruptura_real?: string;
          peso_g?: number | null;
          diametro_mm?: number | null;
          altura_mm?: number | null;
          diametro_nominal_mm: number;
          fator_correcao_hd?: number;
          carga_ruptura_kgf: number;
          mpa_calculado: number;
          tipo_fratura: Database['public']['Enums']['tipo_fratura'];
          motivo_expurgo?: string | null;
          executado_por: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          corpo_prova_id?: string;
          data_ruptura_real?: string;
          peso_g?: number | null;
          diametro_mm?: number | null;
          altura_mm?: number | null;
          diametro_nominal_mm?: number;
          fator_correcao_hd?: number;
          carga_ruptura_kgf?: number;
          mpa_calculado?: number;
          tipo_fratura?: Database['public']['Enums']['tipo_fratura'];
          motivo_expurgo?: string | null;
          executado_por?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rupturas_corpo_prova_id_fkey';
            columns: ['corpo_prova_id'];
            isOneToOne: true;
            referencedRelation: 'corpos_prova';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rupturas_executado_por_fkey';
            columns: ['executado_por'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
        ];
      };
      evidencia_fotos: {
        Row: {
          id: string;
          ruptura_id: string;
          tipo: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ruptura_id: string;
          tipo: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ruptura_id?: string;
          tipo?: string;
          storage_path?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'evidencia_fotos_ruptura_id_fkey';
            columns: ['ruptura_id'];
            isOneToOne: false;
            referencedRelation: 'rupturas';
            referencedColumns: ['id'];
          },
        ];
      };
      laudos: {
        Row: {
          id: string;
          cliente_id: string;
          obra_id: string;
          tipo_laudo: Database['public']['Enums']['laudo_tipo'];
          numero: string;
          versao: number;
          substitui_laudo_id: string | null;
          codigo_verificacao: string;
          status: Database['public']['Enums']['laudo_status'];
          data_emissao: string | null;
          pdf_original_url: string | null;
          pdf_assinado_url: string | null;
          assinatura_rt_url: string | null;
          assinatura_elaborador_url: string | null;
          criado_por: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          obra_id: string;
          tipo_laudo: Database['public']['Enums']['laudo_tipo'];
          numero: string;
          versao?: number;
          substitui_laudo_id?: string | null;
          codigo_verificacao: string;
          status?: Database['public']['Enums']['laudo_status'];
          data_emissao?: string | null;
          pdf_original_url?: string | null;
          pdf_assinado_url?: string | null;
          assinatura_rt_url?: string | null;
          assinatura_elaborador_url?: string | null;
          criado_por: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          obra_id?: string;
          tipo_laudo?: Database['public']['Enums']['laudo_tipo'];
          numero?: string;
          versao?: number;
          substitui_laudo_id?: string | null;
          codigo_verificacao?: string;
          status?: Database['public']['Enums']['laudo_status'];
          data_emissao?: string | null;
          pdf_original_url?: string | null;
          pdf_assinado_url?: string | null;
          assinatura_rt_url?: string | null;
          assinatura_elaborador_url?: string | null;
          criado_por?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'laudos_cliente_id_fkey';
            columns: ['cliente_id'];
            isOneToOne: false;
            referencedRelation: 'clientes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'laudos_obra_id_fkey';
            columns: ['obra_id'];
            isOneToOne: false;
            referencedRelation: 'obras';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'laudos_substitui_laudo_id_fkey';
            columns: ['substitui_laudo_id'];
            isOneToOne: false;
            referencedRelation: 'laudos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'laudos_criado_por_fkey';
            columns: ['criado_por'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
        ];
      };
      laudo_concretagens: {
        Row: {
          laudo_id: string;
          concretagem_id: string;
        };
        Insert: {
          laudo_id: string;
          concretagem_id: string;
        };
        Update: {
          laudo_id?: string;
          concretagem_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'laudo_concretagens_laudo_id_fkey';
            columns: ['laudo_id'];
            isOneToOne: false;
            referencedRelation: 'laudos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'laudo_concretagens_concretagem_id_fkey';
            columns: ['concretagem_id'];
            isOneToOne: false;
            referencedRelation: 'concretagens';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: Database['public']['Enums']['audit_action'];
          table_name: string;
          record_id: string;
          old_value: Json | null;
          new_value: Json | null;
          motivo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: Database['public']['Enums']['audit_action'];
          table_name: string;
          record_id: string;
          old_value?: Json | null;
          new_value?: Json | null;
          motivo?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: Database['public']['Enums']['audit_action'];
          table_name?: string;
          record_id?: string;
          old_value?: Json | null;
          new_value?: Json | null;
          motivo?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
        ];
      };
      ocr_attempts: {
        Row: {
          id: string;
          concretagem_ref: string;
          user_id: string;
          success: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          concretagem_ref: string;
          user_id: string;
          success?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          concretagem_ref?: string;
          user_id?: string;
          success?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ocr_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
        ];
      };
      email_events: {
        Row: {
          id: string;
          evento: string;
          destinatario: string;
          payload: Json | null;
          status: string;
          tentativas: number;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          evento: string;
          destinatario: string;
          payload?: Json | null;
          status?: string;
          tentativas?: number;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          evento?: string;
          destinatario?: string;
          payload?: Json | null;
          status?: string;
          tentativas?: number;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      current_role_name: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['user_role'];
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      current_cliente_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      criar_concretagem_com_cps: {
        Args: { concretagem: Json; cps: Json[] };
        Returns: Json;
      };
    };
    Enums: {
      user_role: 'socio_campo' | 'eng_lab' | 'eng_escritorio' | 'cliente';
      cp_status: 'moldado' | 'coletado' | 'rompido' | 'descartado' | 'expurgado';
      laudo_status: 'rascunho' | 'pronto_assinatura' | 'assinado' | 'substituido';
      laudo_tipo: 'parcial_7d' | 'parcial_14d' | 'final_28d';
      audit_action: 'INSERT' | 'UPDATE' | 'DELETE';
      tipo_fratura:
        | 'ruptura_cabeca'
        | 'ruptura_face'
        | 'ruptura_parcial'
        | 'ruptura_total'
        | 'ruptura_cisalhamento'
        | 'ruptura_trinca';
    };
    CompositeTypes: Record<never, never>;
  };
};

type PublicSchema = Database['public'];

export type Tables<TableName extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][TableName]['Row'];

export type TablesInsert<TableName extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][TableName]['Insert'];

export type TablesUpdate<TableName extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][TableName]['Update'];

export type Enums<EnumName extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][EnumName];

export const Constants = {
  public: {
    Enums: {
      user_role: ['socio_campo', 'eng_lab', 'eng_escritorio', 'cliente'],
      cp_status: ['moldado', 'coletado', 'rompido', 'descartado', 'expurgado'],
      laudo_status: ['rascunho', 'pronto_assinatura', 'assinado', 'substituido'],
      laudo_tipo: ['parcial_7d', 'parcial_14d', 'final_28d'],
      audit_action: ['INSERT', 'UPDATE', 'DELETE'],
      tipo_fratura: [
        'ruptura_cabeca',
        'ruptura_face',
        'ruptura_parcial',
        'ruptura_total',
        'ruptura_cisalhamento',
        'ruptura_trinca',
      ],
    },
  },
} as const;
