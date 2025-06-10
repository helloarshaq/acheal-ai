export interface UserProfile {
    id: string
    auth_id?: string | null
    name: string | null
    email: string | null
    age: string | null
    skintype: string | null
    acnetype: string | null
    imageurl?: string | null
    created_at: string | null
  }
  
  export interface TreatmentHistoryItem {
    id: string
    user_id: string
    acne_type: string
    treatment_date: string
    treatment_plan: any // Consider defining this more strictly, e.g., { mode: 'daily' | 'weekly', day1?: string, week1?: string, ... }
  }
  