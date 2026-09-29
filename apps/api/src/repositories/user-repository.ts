import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssignableUser, AppProfile } from "@chat-to-ticket/shared";

function toUser(row: {
  id: string;
  name: string;
  email: string;
  department: string | null;
  active: boolean;
}): AssignableUser {
  return { id: row.id, name: row.name, email: row.email, department: row.department, active: row.active };
}

export async function listAssignableUsers(db: SupabaseClient): Promise<AssignableUser[]> {
  const { data, error } = await db
    .from("app_users")
    .select("id, name, email, department, active")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as Array<{ id: string; name: string; email: string; department: string | null; active: boolean }>).map(toUser);
}

export async function searchAssignableUsers(db: SupabaseClient, search: string): Promise<AssignableUser[]> {
  const term = search.trim().slice(0, 200);
  const { data, error } = await db
    .from("app_users")
    .select("id, name, email, department, active")
    .eq("active", true)
    .or(`name.ilike.%${term}%,email.ilike.%${term}%,department.ilike.%${term}%`)
    .order("name", { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data as Array<{ id: string; name: string; email: string; department: string | null; active: boolean }>).map(toUser);
}

export async function getUserById(db: SupabaseClient, id: string): Promise<AssignableUser | null> {
  const { data, error } = await db
    .from("app_users")
    .select("id, name, email, department, active")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toUser(data as { id: string; name: string; email: string; department: string | null; active: boolean });
}

export interface CreateUserInput {
  name: string;
  email: string;
  department?: string | null | undefined;
  role?: "admin" | "member" | undefined;
}

export async function createUser(db: SupabaseClient, input: CreateUserInput): Promise<AppProfile> {
  const { data, error } = await db
    .from("app_users")
    .insert({
      name: input.name,
      email: input.email,
      department: input.department ?? null,
      role: input.role ?? "member",
    })
    .select("id, auth_user_id, name, email, role, department")
    .single();
  if (error) throw error;
  const row = data as { id: string; auth_user_id: string | null; name: string; email: string; role: "admin" | "member"; department: string | null };
  return { id: row.id, authUserId: row.auth_user_id, name: row.name, email: row.email, role: row.role, department: row.department };
}

/** Case-insensitive candidate lookup used by the assignee resolver. */
export async function findUsersByName(db: SupabaseClient, candidate: string): Promise<AssignableUser[]> {
  const term = candidate.trim().toLowerCase();
  if (!term) return [];
  const all = await listAssignableUsers(db);
  const exact = all.filter((u) => u.name.toLowerCase() === term);
  if (exact.length > 0) return exact;
  const tokens = term.split(/\s+/).filter(Boolean);
  // Full-name containment (either direction) or all-tokens match.
  return all.filter((u) => {
    const name = u.name.toLowerCase();
    if (name.includes(term) || term.includes(name)) return true;
    return tokens.every((t) => name.includes(t));
  });
}
