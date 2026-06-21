// ============================================================================
// Supabase database types.
//
// Hand-maintained to match supabase/migrations. After applying migrations to a
// live project you can regenerate authoritatively with:
//
//   supabase gen types typescript --project-id <ref> --schema public \
//     > types/database.types.ts
//
// Keep this file in sync with the SQL until then.
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "manager" | "viewer";
export type Currency = "USD" | "AFN";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: UserRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          name: string;
          contact: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          contact?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          contact?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          name: string;
          default_share_pct: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          default_share_pct?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          default_share_pct?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          entry_date: string;
          project_name: string;
          client_id: string | null;
          client_name: string | null;
          total_amount: number;
          currency: Currency;
          employee_id: string | null;
          employee_pct: number;
          office_pct: number;
          amount_paid: number;
          // Generated columns — read-only.
          employee_share: number;
          office_share: number;
          manager_share: number;
          remaining_balance: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          entry_date?: string;
          project_name: string;
          client_id?: string | null;
          client_name?: string | null;
          total_amount?: number;
          currency?: Currency;
          employee_id?: string | null;
          employee_pct?: number;
          office_pct?: number;
          amount_paid?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          entry_date?: string;
          project_name?: string;
          client_id?: string | null;
          client_name?: string | null;
          total_amount?: number;
          currency?: Currency;
          employee_id?: string | null;
          employee_pct?: number;
          office_pct?: number;
          amount_paid?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_employee_id_fkey";
            columns: ["employee_id"];
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_entries: {
        Row: {
          id: string;
          entry_date: string;
          description: string;
          debit: number;
          credit: number;
          currency: Currency;
          station: string;
          department: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          entry_date?: string;
          description: string;
          debit?: number;
          credit?: number;
          currency?: Currency;
          station?: string;
          department?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          entry_date?: string;
          description?: string;
          debit?: number;
          credit?: number;
          currency?: Currency;
          station?: string;
          department?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      cash_entries_with_balance: {
        Row: {
          id: string;
          entry_date: string;
          description: string;
          debit: number;
          credit: number;
          currency: Currency;
          station: string;
          department: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          seq_no: number;
          balance: number;
        };
        Relationships: [];
      };
      cash_book_summary: {
        Row: {
          total_debit: number;
          total_credit: number;
          current_balance: number;
          entry_count: number;
        };
        Relationships: [];
      };
      employee_earnings: {
        Row: {
          employee_id: string;
          name: string;
          default_share_pct: number;
          is_active: boolean;
          total_earned: number;
          project_count: number;
        };
        Relationships: [];
      };
      office_account_total: {
        Row: { total: number };
        Relationships: [];
      };
      manager_account_total: {
        Row: { total: number };
        Relationships: [];
      };
      project_totals: {
        Row: {
          total_amount: number;
          total_employee_share: number;
          total_office_share: number;
          total_manager_share: number;
          total_amount_paid: number;
          total_remaining: number;
          project_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: string };
      is_active_user: { Args: Record<string, never>; Returns: boolean };
      can_write_finance: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// ---------------------------------------------------------------------------
// Convenience row aliases
// ---------------------------------------------------------------------------
type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> =
  PublicSchema["Views"][T]["Row"];

export type Profile = Tables<"profiles">;
export type Client = Tables<"clients">;
export type Employee = Tables<"employees">;
export type Project = Tables<"projects">;
export type CashEntry = Tables<"cash_entries">;

export type CashEntryWithBalance = Views<"cash_entries_with_balance">;
export type CashBookSummary = Views<"cash_book_summary">;
export type EmployeeEarning = Views<"employee_earnings">;
export type ProjectTotals = Views<"project_totals">;
