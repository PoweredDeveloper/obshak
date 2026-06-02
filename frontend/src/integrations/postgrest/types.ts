export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string | null
          id: string
          telegram_id: number
          username: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          telegram_id: number
          username?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          telegram_id?: number
          username?: string | null
        }
        Relationships: []
      }
      app_notifications: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          key: string
          link: string | null
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          key: string
          link?: string | null
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          key?: string
          link?: string | null
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      directions: {
        Row: {
          code: string
          created_at: string | null
          id: string
          institute_id: string | null
          level: string | null
          name: string
          profile: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          institute_id?: string | null
          level?: string | null
          name: string
          profile?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          institute_id?: string | null
          level?: string | null
          name?: string
          profile?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directions_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_groups: {
        Row: {
          course: number | null
          created_at: string | null
          group_id: string
          group_name: string
          id: string
          institute: string | null
          user_id: string
        }
        Insert: {
          course?: number | null
          created_at?: string | null
          group_id: string
          group_name: string
          id?: string
          institute?: string | null
          user_id: string
        }
        Update: {
          course?: number | null
          created_at?: string | null
          group_id?: string
          group_name?: string
          id?: string
          institute?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          course: number | null
          created_at: string | null
          direction_id: string | null
          form: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          course?: number | null
          created_at?: string | null
          direction_id?: string | null
          form?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          course?: number | null
          created_at?: string | null
          direction_id?: string | null
          form?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_direction_id_fkey"
            columns: ["direction_id"]
            isOneToOne: false
            referencedRelation: "directions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutes: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          end_date: string | null
          group_id: string
          id: number
          lesson_number: number | null
          room: string | null
          semester: string | null
          start_date: string | null
          subgroup: number | null
          subject: string
          teacher: string | null
          time_end: string
          time_start: string
          type: string | null
          updated_at: string | null
          week_type: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          end_date?: string | null
          group_id: string
          id?: number
          lesson_number?: number | null
          room?: string | null
          semester?: string | null
          start_date?: string | null
          subgroup?: number | null
          subject: string
          teacher?: string | null
          time_end: string
          time_start: string
          type?: string | null
          updated_at?: string | null
          week_type?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          end_date?: string | null
          group_id?: string
          id?: number
          lesson_number?: number | null
          room?: string | null
          semester?: string | null
          start_date?: string | null
          subgroup?: number | null
          subject?: string
          teacher?: string | null
          time_end?: string
          time_start?: string
          type?: string | null
          updated_at?: string | null
          week_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons_test: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          end_date: string | null
          group_id: string
          id: number
          lesson_number: number | null
          room: string | null
          semester: string | null
          start_date: string | null
          subgroup: number | null
          subject: string
          teacher: string | null
          time_end: string
          time_start: string
          type: string | null
          updated_at: string | null
          week_type: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          end_date?: string | null
          group_id: string
          id?: number
          lesson_number?: number | null
          room?: string | null
          semester?: string | null
          start_date?: string | null
          subgroup?: number | null
          subject: string
          teacher?: string | null
          time_end: string
          time_start: string
          type?: string | null
          updated_at?: string | null
          week_type?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          end_date?: string | null
          group_id?: string
          id?: number
          lesson_number?: number | null
          room?: string | null
          semester?: string | null
          start_date?: string | null
          subgroup?: number | null
          subject?: string
          teacher?: string | null
          time_end?: string
          time_start?: string
          type?: string | null
          updated_at?: string | null
          week_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_test_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          course: number | null
          created_at: string | null
          first_name: string
          group_id: string | null
          group_name: string | null
          id: string
          institute: string | null
          last_active: string | null
          last_name: string | null
          onboarded: boolean | null
          photo_url: string | null
          semester: number | null
          telegram_id: number
          updated_at: string | null
          username: string | null
        }
        Insert: {
          course?: number | null
          created_at?: string | null
          first_name: string
          group_id?: string | null
          group_name?: string | null
          id: string
          institute?: string | null
          last_active?: string | null
          last_name?: string | null
          onboarded?: boolean | null
          photo_url?: string | null
          semester?: number | null
          telegram_id: number
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          course?: number | null
          created_at?: string | null
          first_name?: string
          group_id?: string | null
          group_name?: string | null
          id?: string
          institute?: string | null
          last_active?: string | null
          last_name?: string | null
          onboarded?: boolean | null
          photo_url?: string | null
          semester?: number | null
          telegram_id?: number
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      schedule_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: number | null
          table_name: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: number | null
          table_name: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: number | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      service_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          service_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          service_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          service_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          author_id: string | null
          author_name: string
          author_rating: number | null
          author_username: string | null
          category_id: string | null
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          price: number
          reviews_count: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          author_name: string
          author_rating?: number | null
          author_username?: string | null
          category_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          price: number
          reviews_count?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string
          author_rating?: number | null
          author_username?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          price?: number
          reviews_count?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_ratings: {
        Row: {
          created_at: string | null
          id: string
          rating: number
          teacher_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating: number
          teacher_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number
          teacher_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_ratings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_ratings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          average_rating: number | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string
          id: string
          ratings_count: number | null
          updated_at: string | null
        }
        Insert: {
          average_rating?: number | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          ratings_count?: number | null
          updated_at?: string | null
        }
        Update: {
          average_rating?: number | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          ratings_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      teachers_with_ratings: {
        Row: {
          average_rating: number | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string | null
          ratings_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: { user_telegram_id: number }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
