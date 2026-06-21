// ============================================================================
// Zod validation schemas — shared by client forms and server-side checks.
// Money/percent values are validated here; the split math itself is the DB's
// job (generated columns), so these schemas never include computed fields.
// ============================================================================

import { z } from "zod";

const currency = z.enum(["USD", "AFN"]);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

const money = z
  .number({ message: "Enter a number" })
  .min(0, "Cannot be negative")
  .max(99_999_999_999.99, "Amount is too large");

const pct = z
  .number({ message: "Enter a percentage" })
  .min(0, "Cannot be negative")
  .max(1, "Use a fraction between 0 and 1 (e.g. 0.10 for 10%)");

// ----------------------------------------------------------------------------
// Cash Book entry
// ----------------------------------------------------------------------------
export const cashEntrySchema = z
  .object({
    entry_date: isoDate,
    description: z.string().trim().min(1, "Description is required"),
    debit: money,
    credit: money,
    currency,
    station: z.string().trim().min(1).default("Jalalabad Main Office"),
    department: z.string().trim().min(1).default("Finance"),
  })
  .refine((v) => v.debit > 0 || v.credit > 0, {
    message: "Enter a debit (cash in) or a credit (cash out)",
    path: ["debit"],
  })
  .refine((v) => !(v.debit > 0 && v.credit > 0), {
    message: "An entry is either cash in or cash out, not both",
    path: ["credit"],
  });

export type CashEntryInput = z.infer<typeof cashEntrySchema>;

// ----------------------------------------------------------------------------
// Project
// ----------------------------------------------------------------------------
export const projectSchema = z.object({
  entry_date: isoDate,
  project_name: z.string().trim().min(1, "Project name is required"),
  client_id: z.string().uuid().nullable().optional(),
  client_name: z.string().trim().nullable().optional(),
  total_amount: money,
  currency,
  employee_id: z.string().uuid().nullable().optional(),
  employee_pct: pct,
  office_pct: pct,
  amount_paid: money,
  notes: z.string().trim().nullable().optional(),
});

export type ProjectInput = z.infer<typeof projectSchema>;

// ----------------------------------------------------------------------------
// Clients & employees
// ----------------------------------------------------------------------------
export const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  contact: z.string().trim().nullable().optional(),
});
export type ClientInput = z.infer<typeof clientSchema>;

export const employeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  default_share_pct: pct,
  is_active: z.boolean().default(true),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;

// ----------------------------------------------------------------------------
// Auth
// ----------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;
