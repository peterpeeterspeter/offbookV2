export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      scripts: {
        Row: {
          id: string
          title: string
          content: string
          created_at: string
          updated_at: string
          user_id: string
          is_public: boolean
        }
        Insert: {
          id?: string
          title: string
          content: string
          created_at?: string
          updated_at?: string
          user_id: string
          is_public?: boolean
        }
        Update: {
          id?: string
          title?: string
          content?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          is_public?: boolean
        }
      }
      practice_sessions: {
        Row: {
          id: string
          script_id: string
          user_id: string
          created_at: string
          updated_at: string
          status: 'active' | 'completed' | 'cancelled'
        }
        Insert: {
          id?: string
          script_id: string
          user_id: string
          created_at?: string
          updated_at?: string
          status?: 'active' | 'completed' | 'cancelled'
        }
        Update: {
          id?: string
          script_id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          status?: 'active' | 'completed' | 'cancelled'
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
