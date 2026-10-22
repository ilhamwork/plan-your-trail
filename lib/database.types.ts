import type { GPXData } from "./types"

export interface InvoiceItemJson {
  id: string
  description: string
  amount: number
}

export interface Database {
  public: {
    Tables: {
      feedback: {
        Row: {
          id: number
          created_at: string
          name: string | null
          email: string | null
          message: string
          runner_name: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          name?: string | null
          email?: string | null
          message: string
          runner_name?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          name?: string | null
          email?: string | null
          message?: string
          runner_name?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          invoice_date: string
          client_name: string | null
          client_company: string | null
          client_address: string | null
          items: InvoiceItemJson[]
          tax_percentage: number | null
          total_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          invoice_date: string
          client_name?: string | null
          client_company?: string | null
          client_address?: string | null
          items: InvoiceItemJson[]
          tax_percentage?: number | null
          total_amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          invoice_date?: string
          client_name?: string | null
          client_company?: string | null
          client_address?: string | null
          items?: InvoiceItemJson[]
          tax_percentage?: number | null
          total_amount?: number
          created_at?: string
        }
        Relationships: []
      }
      shared_routes: {
        Row: {
          id: string
          created_at: string
          route_data: GPXData
          race_name: string | null
          user_name: string | null
          race_date: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          route_data: GPXData
          race_name?: string | null
          user_name?: string | null
          race_date?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          route_data?: GPXData
          race_name?: string | null
          user_name?: string | null
          race_date?: string | null
        }
        Relationships: []
      }
      tool_feedback: {
        Row: {
          id: number
          created_at: string
          rating: string
          name: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          rating: string
          name?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          rating?: string
          name?: string | null
        }
        Relationships: []
      }
      user_routes: {
        Row: {
          id: number
          created_at: string
          user_name: string | null
          race_name: string | null
          race_date: string | null
          file_name: string | null
          distance: number | null
          elevation_gain: number | null
        }
        Insert: {
          id?: number
          created_at?: string
          user_name?: string | null
          race_name?: string | null
          race_date?: string | null
          file_name?: string | null
          distance?: number | null
          elevation_gain?: number | null
        }
        Update: {
          id?: number
          created_at?: string
          user_name?: string | null
          race_name?: string | null
          race_date?: string | null
          file_name?: string | null
          distance?: number | null
          elevation_gain?: number | null
        }
        Relationships: []
      }
      user_shares: {
        Row: {
          id: number
          created_at: string
          user_name: string | null
          race_name: string | null
          race_date: string | null
          share_type: string | null
          distance: number | null
          elevation_gain: number | null
        }
        Insert: {
          id?: number
          created_at?: string
          user_name?: string | null
          race_name?: string | null
          race_date?: string | null
          share_type?: string | null
          distance?: number | null
          elevation_gain?: number | null
        }
        Update: {
          id?: number
          created_at?: string
          user_name?: string | null
          race_name?: string | null
          race_date?: string | null
          share_type?: string | null
          distance?: number | null
          elevation_gain?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      route_access: "read_write" | "read_only"
      subscription_plan: "monthly" | "annual"
      subscription_status: "active" | "grace_period" | "cancelled" | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
