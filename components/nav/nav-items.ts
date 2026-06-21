import {
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  Users,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/database.types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** If set, only these roles see the item. */
  roles?: UserRole[];
  /** Show in the mobile bottom bar (limited space). */
  mobile?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/projects", label: "Projects", icon: FolderKanban, mobile: true },
  { href: "/cashbook", label: "Cash Book", icon: BookOpen, mobile: true },
  { href: "/employees", label: "Employees", icon: Users, mobile: true },
  { href: "/admin", label: "Admin", icon: Shield, roles: ["admin"], mobile: false },
];

export function visibleNavItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
