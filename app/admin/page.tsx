"use client";

import { useRequireAuth } from "@/hooks/useAuth";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { cn, formatDate, formatTokens, getInitials } from "@/lib/utils";
import type { AdminUser, UserRole } from "@/types";
import {
  ChevronDown,
  Loader2,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  admin: ShieldAlert,
  user: Shield,
  viewer: ShieldCheck,
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "text-destructive bg-destructive/10 border-destructive/20",
  user: "text-primary bg-primary/10 border-primary/20",
  viewer: "text-muted-foreground bg-muted border-border",
};

function RoleBadge({ role }: { role: UserRole }) {
  const Icon = ROLE_ICONS[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium capitalize",
        ROLE_COLORS[role],
      )}
    >
      <Icon className="w-3 h-3" />
      {role}
    </span>
  );
}

function RoleSelector({
  userId,
  currentRole,
  onUpdate,
}: {
  userId: string;
  currentRole: UserRole;
  onUpdate: (role: UserRole) => void;
}) {
  const { token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const roles: UserRole[] = ["admin", "user", "viewer"];

  const handleSelect = async (role: UserRole) => {
    if (role === currentRole || !token) return;
    setOpen(false);
    setIsUpdating(true);
    try {
      await adminApi.updateUserRole(userId, role, token);
      onUpdate(role);
      toast.success(`Role updated to ${role}`);
    } catch {
      toast.error("Failed to update role");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isUpdating}
        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isUpdating ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
        Change
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 w-32">
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => handleSelect(r)}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors capitalize",
                  r === currentRole && "text-primary font-medium",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * AdminPage Component
 * 
 * Provides a management interface for administrators to view and 
 * manage users across all tenants.
 * 
 * Key Features:
 * 1. Role Management: Allows admins to update user roles (admin, user, viewer).
 * 2. User Lifecycle: Supports deactivating users to revoke access.
 * 3. Visibility: Displays aggregate token usage and last active timestamps.
 * 4. Security: Implements a client-side guard to prevent non-admins from viewing the content.
 */
export default function AdminPage() {
  const { user } = useRequireAuth();
  const { token } = useAuthStore();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filtered, setFiltered] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Load user data on mount
  useEffect(() => {
    if (!token) {
      return;
    }
    const load = async () => {
      setIsLoading(true);
      try {
        const { data } = await adminApi.listUsers(token);
        setUsers(data);
        setFiltered(data);
      } catch {
        // Fallback to mock data if API fails (useful for prototyping/testing)
        setUsers(MOCK_USERS);
        setFiltered(MOCK_USERS);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [token]);

  // Synchronize filtered list with search input
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? users.filter(
            (u) =>
              u.email.toLowerCase().includes(q) ||
              u.tenantName.toLowerCase().includes(q),
          )
        : users,
    );
  }, [search, users]);

  // Client-side guard: only users with the 'admin' role can access this page
  if (user && user.role !== "admin") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <ShieldAlert className="w-12 h-12 text-destructive/40 mb-4" />
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="text-muted-foreground text-sm mt-1">
          You need the admin role to view this page.
        </p>
      </div>
    );
  }

  const handleRoleUpdate = (userId: string, role: UserRole) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  };

  const handleDeactivate = async (userId: string) => {
    if (!token || !confirm("Deactivate this user?")) return;
    try {
      await adminApi.deactivateUser(userId, token);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: false } : u)),
      );
      toast.success("User deactivated");
    } catch {
      toast.error("Failed to deactivate user");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Management
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage roles and access for all tenants
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or tenant…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                      User
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                      Tenant
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                      Tokens
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                      Last Active
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {getInitials(undefined, u.email)}
                          </div>
                          <span className="truncate max-w-[160px]">
                            {u.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.tenantName}
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {formatTokens(u.totalTokens)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(u.lastActive)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium",
                            u.isActive
                              ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                              : "text-muted-foreground bg-muted border-border",
                          )}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <RoleSelector
                            userId={u.id}
                            currentRole={u.role}
                            onUpdate={(role) => handleRoleUpdate(u.id, role)}
                          />
                          {u.isActive && (
                            <button
                              onClick={() => handleDeactivate(u.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Deactivate user"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_USERS: AdminUser[] = [
  {
    id: "u1",
    email: "alice@acme.com",
    role: "admin",
    tenantId: "t1",
    tenantName: "Acme Corp",
    totalTokens: 48000,
    lastActive: new Date().toISOString(),
    isActive: true,
    createdAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "u2",
    email: "bob@acme.com",
    role: "user",
    tenantId: "t1",
    tenantName: "Acme Corp",
    totalTokens: 21000,
    lastActive: new Date(Date.now() - 3600000).toISOString(),
    isActive: true,
    createdAt: "2024-02-10T00:00:00Z",
  },
  {
    id: "u3",
    email: "carol@startup.io",
    role: "user",
    tenantId: "t2",
    tenantName: "Startup IO",
    totalTokens: 8500,
    lastActive: new Date(Date.now() - 86400000).toISOString(),
    isActive: true,
    createdAt: "2024-03-01T00:00:00Z",
  },
  {
    id: "u4",
    email: "dave@startup.io",
    role: "viewer",
    tenantId: "t2",
    tenantName: "Startup IO",
    totalTokens: 1200,
    lastActive: new Date(Date.now() - 604800000).toISOString(),
    isActive: false,
    createdAt: "2024-03-15T00:00:00Z",
  },
];
