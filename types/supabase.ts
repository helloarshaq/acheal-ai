export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_id: string | null
          name: string | null
          age: string | null
          skintype: string | null
          imageurl: string | null
          acnetype: string | null
          created_at: string | null
          severity: string | null
          severity_num: number | null
        }
        Insert: {
          id?: string
          auth_id?: string | null
          name?: string | null
          age?: string | null
          skintype?: string | null
          imageurl?: string | null
          acnetype?: string | null
          created_at?: string | null
          severity?: string | null
          severity_num?: number | null
        }
        Update: {
          id?: string
          auth_id?: string | null
          name?: string | null
          age?: string | null
          skintype?: string | null
          imageurl?: string | null
          acnetype?: string | null
          created_at?: string | null
          severity?: string | null
          severity_num?: number | null
        }
      }
      treatments: {
        Row: {
          id: string
          user_id: string
          acne_type: string
          treatment_date: string
          treatment_plan: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          acne_type: string
          treatment_date?: string
          treatment_plan: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          acne_type?: string
          treatment_date?: string
          treatment_plan?: Json
          created_at?: string
        }
      }
    }
  }
}
