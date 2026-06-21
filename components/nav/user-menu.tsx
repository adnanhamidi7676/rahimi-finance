"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/types/database.types";

const ROLE_LABEL: Record<Profile["role"], string> = {
  admin: "Administrator",
  manager: "Manager",
  viewer: "Viewer",
};

export function UserMenu({ profile }: { profile: Profile }) {
  const name = profile.full_name?.trim() || "Account";
  const initial = name.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Account menu">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initial}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="truncate font-medium">{name}</span>
            <span className="text-xs text-muted-foreground">
              {ROLE_LABEL[profile.role]}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon className="mr-2 size-4" />
          {profile.role === "viewer" ? "Read-only access" : "Signed in"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-destructive/10"
          >
            <LogOut className="mr-2 size-4" />
            Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
