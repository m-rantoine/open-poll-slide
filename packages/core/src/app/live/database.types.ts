export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      answer_keys: {
        Row: {
          correct_option_ids: string[];
          question_id: string;
          session_id: string;
        };
        Insert: {
          correct_option_ids?: string[];
          question_id: string;
          session_id: string;
        };
        Update: {
          correct_option_ids?: string[];
          question_id?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'answer_keys_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      answers: {
        Row: {
          id: string;
          is_correct: boolean | null;
          option_id: string;
          question_id: string;
          session_id: string;
          submitted_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          is_correct?: boolean | null;
          option_id: string;
          question_id: string;
          session_id: string;
          submitted_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          is_correct?: boolean | null;
          option_id?: string;
          question_id?: string;
          session_id?: string;
          submitted_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'answers_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
        };
        Insert: {
          key: string;
          value: Json;
        };
        Update: {
          key?: string;
          value?: Json;
        };
        Relationships: [];
      };
      deck_answer_keys: {
        Row: {
          correct_option_ids: string[];
          deck_id: string;
          question_id: string;
          updated_at: string;
        };
        Insert: {
          correct_option_ids?: string[];
          deck_id: string;
          question_id: string;
          updated_at?: string;
        };
        Update: {
          correct_option_ids?: string[];
          deck_id?: string;
          question_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      hosts: {
        Row: {
          email: string;
        };
        Insert: {
          email: string;
        };
        Update: {
          email?: string;
        };
        Relationships: [];
      };
      presence_events: {
        Row: {
          at: string;
          id: number;
          session_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          at?: string;
          id?: never;
          session_id: string;
          status: string;
          user_id: string;
        };
        Update: {
          at?: string;
          id?: never;
          session_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'presence_events_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          email: string;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
        };
        Relationships: [];
      };
      session_participants: {
        Row: {
          display_name: string;
          email: string;
          inactive_since: string | null;
          inactive_total_seconds: number;
          joined_at: string;
          last_seen: string;
          self_index: number;
          session_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          display_name: string;
          email: string;
          inactive_since?: string | null;
          inactive_total_seconds?: number;
          joined_at?: string;
          last_seen?: string;
          self_index?: number;
          session_id: string;
          status?: string;
          user_id: string;
        };
        Update: {
          display_name?: string;
          email?: string;
          inactive_since?: string | null;
          inactive_total_seconds?: number;
          joined_at?: string;
          last_seen?: string;
          self_index?: number;
          session_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'session_participants_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      session_question_state: {
        Row: {
          ends_at: string | null;
          key_version: number;
          question_id: string;
          session_id: string;
          show_results: boolean;
          state: string;
        };
        Insert: {
          ends_at?: string | null;
          key_version?: number;
          question_id: string;
          session_id: string;
          show_results?: boolean;
          state: string;
        };
        Update: {
          ends_at?: string | null;
          key_version?: number;
          question_id?: string;
          session_id?: string;
          show_results?: boolean;
          state?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'session_question_state_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      sessions: {
        Row: {
          code: string;
          created_at: string;
          current_index: number;
          current_step: number;
          deck_id: string;
          deck_title: string | null;
          ended_at: string | null;
          host_id: string;
          id: string;
          mode: Database['public']['Enums']['session_mode'];
          page_count: number;
          questions: Json;
          status: Database['public']['Enums']['session_status'];
        };
        Insert: {
          code: string;
          created_at?: string;
          current_index?: number;
          current_step?: number;
          deck_id: string;
          deck_title?: string | null;
          ended_at?: string | null;
          host_id: string;
          id?: string;
          mode: Database['public']['Enums']['session_mode'];
          page_count?: number;
          questions?: Json;
          status?: Database['public']['Enums']['session_status'];
        };
        Update: {
          code?: string;
          created_at?: string;
          current_index?: number;
          current_step?: number;
          deck_id?: string;
          deck_title?: string | null;
          ended_at?: string | null;
          host_id?: string;
          id?: string;
          mode?: Database['public']['Enums']['session_mode'];
          page_count?: number;
          questions?: Json;
          status?: Database['public']['Enums']['session_status'];
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_session: {
        Args: {
          p_deck_id: string;
          p_deck_title: string;
          p_mode: Database['public']['Enums']['session_mode'];
          p_page_count: number;
          p_questions: Json;
        };
        Returns: {
          code: string;
          created_at: string;
          current_index: number;
          current_step: number;
          deck_id: string;
          deck_title: string | null;
          ended_at: string | null;
          host_id: string;
          id: string;
          mode: Database['public']['Enums']['session_mode'];
          page_count: number;
          questions: Json;
          status: Database['public']['Enums']['session_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      delete_session: { Args: { p_session: string }; Returns: undefined };
      end_session: { Args: { p_session: string }; Returns: undefined };
      gen_session_code: { Args: never; Returns: string };
      hook_restrict_signup_domain: { Args: { event: Json }; Returns: Json };
      host_question_action: {
        Args: {
          p_action: string;
          p_question: string;
          p_seconds?: number;
          p_session: string;
        };
        Returns: {
          ends_at: string | null;
          key_version: number;
          question_id: string;
          session_id: string;
          show_results: boolean;
          state: string;
        };
        SetofOptions: {
          from: '*';
          to: 'session_question_state';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_host: { Args: never; Returns: boolean };
      is_participant: { Args: { p_session: string }; Returns: boolean };
      join_session: {
        Args: { p_code: string };
        Returns: {
          code: string;
          created_at: string;
          current_index: number;
          current_step: number;
          deck_id: string;
          deck_title: string | null;
          ended_at: string | null;
          host_id: string;
          id: string;
          mode: Database['public']['Enums']['session_mode'];
          page_count: number;
          questions: Json;
          status: Database['public']['Enums']['session_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      list_active_sessions: {
        Args: never;
        Returns: {
          code: string;
          created_at: string;
          deck_id: string;
          deck_title: string;
          id: string;
          mode: Database['public']['Enums']['session_mode'];
        }[];
      };
      my_answers: {
        Args: { p_session: string };
        Returns: {
          is_correct: boolean;
          option_id: string;
          question_id: string;
          show_results: boolean;
        }[];
      };
      my_score: {
        Args: { p_session: string };
        Returns: {
          class_average: number;
          correct: number;
          graded: number;
        }[];
      };
      require_host: { Args: never; Returns: undefined };
      server_time: { Args: never; Returns: string };
      session_summaries: {
        Args: { p_limit?: number };
        Returns: {
          class_average: number | null;
          session_id: string;
          students: number;
        }[];
      };
      set_position: {
        Args: { p_index: number; p_session: string; p_step?: number };
        Returns: undefined;
      };
      set_presence: {
        Args: { p_active: boolean; p_session: string };
        Returns: undefined;
      };
      set_show_results: {
        Args: { p_question: string; p_session: string; p_value: boolean };
        Returns: undefined;
      };
      submit_answer: {
        Args: { p_option: string; p_question: string; p_session: string };
        Returns: {
          id: string;
          is_correct: boolean | null;
          option_id: string;
          question_id: string;
          session_id: string;
          submitted_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'answers';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      toggle_correct_option: {
        Args: { p_option: string; p_question: string; p_session: string };
        Returns: string[];
      };
    };
    Enums: {
      session_mode: 'self' | 'host';
      session_status: 'active' | 'ended';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      session_mode: ['self', 'host'],
      session_status: ['active', 'ended'],
    },
  },
} as const;
