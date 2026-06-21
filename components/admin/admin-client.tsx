"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  createUser,
  updateUserRole,
  setUserActive,
  type ActionState,
} from "@/app/(app)/admin/actions";
import { createClient } from "@/lib/supabase/client";
import { clientSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/forms/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Client, UserRole } from "@/types/database.types";

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
};

const ROLES: UserRole[] = ["admin", "manager", "viewer"];

export function AdminClient({
  users,
  clients,
  currentUserId,
}: {
  users: AdminUser[];
  clients: Client[];
  currentUserId: string;
}) {
  return (
    <Tabs defaultValue="users">
      <TabsList>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="clients">Clients</TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="mt-4">
        <UsersPanel users={users} currentUserId={currentUserId} />
      </TabsContent>
      <TabsContent value="clients" className="mt-4">
        <ClientsPanel clients={clients} />
      </TabsContent>
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
const initialState: ActionState = { error: null };

function UsersPanel({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createUser, initialState);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  function changeRole(id: string, role: UserRole) {
    startTransition(async () => {
      const res = await updateUserRole(id, role);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Role updated");
        router.refresh();
      }
    });
  }

  function toggleActive(id: string, next: boolean) {
    startTransition(async () => {
      const res = await setUserActive(id, next);
      if (res.error) toast.error(res.error);
      else {
        toast.success(next ? "User activated" : "User deactivated");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* User list */}
      <Card className="order-2 lg:order-1">
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Email</TableHead>
                  <TableHead className="w-36">Role</TableHead>
                  <TableHead className="w-28 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">
                        {u.full_name || "—"}
                        {u.id === currentUserId ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (you)
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <NativeSelect
                        value={u.role}
                        disabled={isPending}
                        onChange={(e) =>
                          changeRole(u.id, e.target.value as UserRole)
                        }
                        aria-label={`Role for ${u.email}`}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </NativeSelect>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        disabled={isPending || u.id === currentUserId}
                        onClick={() => toggleActive(u.id, !u.is_active)}
                        className="disabled:opacity-60"
                      >
                        <Badge
                          variant={u.is_active ? "secondary" : "destructive"}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create user */}
      <Card className="order-1 h-fit lg:order-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="size-4" />
            Add user
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="u_name">Full name</Label>
              <Input id="u_name" name="full_name" placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u_email">Email</Label>
              <Input
                id="u_email"
                name="email"
                type="email"
                placeholder="jane@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u_password">Temporary password</Label>
              <Input
                id="u_password"
                name="password"
                type="text"
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u_role">Role</Label>
              <NativeSelect id="u_role" name="role" defaultValue="manager">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating…" : "Create user"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Share the email and temporary password with the new admin. They can
              change it after signing in.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
function ClientsPanel({ clients }: { clients: Client[] }) {
  const router = useRouter();
  // The list comes straight from the server prop; after each mutation we
  // router.refresh() to re-fetch it, so no local copy is needed.
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [pending, setPending] = useState(false);

  function startEdit(c: Client) {
    setEditing(c);
    setName(c.name);
    setContact(c.contact ?? "");
  }
  function resetForm() {
    setEditing(null);
    setName("");
    setContact("");
  }

  function refresh() {
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = clientSchema.safeParse({
      name,
      contact: contact.trim() || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error } = editing
      ? await supabase.from("clients").update(parsed.data).eq("id", editing.id)
      : await supabase.from("clients").insert(parsed.data);
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Client updated" : "Client added");
    resetForm();
    void refresh();
  }

  async function handleDelete(c: Client) {
    if (!window.confirm(`Delete client "${c.name}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Client deleted");
    if (editing?.id === c.id) resetForm();
    void refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="order-2 lg:order-1">
        <CardHeader>
          <CardTitle className="text-base">Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No clients yet.
            </p>
          ) : (
            <ul className="divide-y">
              {clients.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    {c.contact ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {c.contact}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${c.name}`}
                      onClick={() => startEdit(c)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${c.name}`}
                      onClick={() => handleDelete(c)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="order-1 h-fit lg:order-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4" />
            {editing ? "Edit client" : "Add client"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="c_name">Name</Label>
              <Input
                id="c_name"
                value={name}
                dir="auto"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royani Poultry"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c_contact">Contact</Label>
              <Input
                id="c_contact"
                value={contact}
                dir="auto"
                onChange={(e) => setContact(e.target.value)}
                placeholder="Phone or email (optional)"
              />
            </div>
            <div className="flex gap-2">
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
              ) : null}
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? "Saving…" : editing ? "Save" : "Add client"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
