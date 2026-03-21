"use client";

import { useState } from "react";
import { Settings, User, Building2, Key, Bell, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Tab = "profile" | "tenant" | "api" | "notifications";

/**
 * SettingsPage Component
 * 
 * Provides a tabbed interface for managing user profiles, tenant details, 
 * API keys, and notification preferences.
 * 
 * Key Logic:
 * 1. Profile Management: Allows users to update their personal details (currently simulated).
 * 2. Tenant Visibility: Displays read-only information about the user's current tenant context.
 * 3. Tabbed Navigation: Decouples settings sections for a cleaner UX.
 */
export default function SettingsPage() {
  const { user } = useRequireAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email] = useState(user?.email ?? "");

  // Simulated save action for profile updates
  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Wire this to the NestJS user update endpoint
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
    setSaved(true);
    toast.success("Settings saved");
    setTimeout(() => setSaved(false), 2500);
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "tenant", label: "Tenant", icon: Building2 },
    { id: "api", label: "API Keys", icon: Key },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your account, tenant, and preferences
          </p>
        </div>

        <div className="flex gap-6">
          {/* Tab nav */}
          <nav className="w-44 shrink-0">
            <ul className="space-y-0.5">
              {tabs.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <button
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                      activeTab === id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Tab panels */}
          <div className="flex-1 min-w-0">
            {activeTab === "profile" && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                <h2 className="font-semibold text-sm">Profile Information</h2>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                    {user?.fullName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user?.fullName || "No name set"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 font-medium capitalize">
                      {user?.role}
                    </span>
                  </div>
                </div>

                <hr className="border-border" />

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-input bg-muted text-sm text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email is managed by Supabase Auth
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : saved ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : null}
                    {saved ? "Saved!" : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "tenant" && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                <h2 className="font-semibold text-sm">Tenant Information</h2>

                <div className="space-y-3">
                  <InfoRow label="Tenant Name" value={user?.tenantName ?? "—"} />
                  <InfoRow label="Tenant ID" value={user?.tenantId ?? "—"} mono />
                  <InfoRow label="Your Role" value={user?.role ?? "—"} capitalize />
                </div>

                <hr className="border-border" />

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3">Quota</p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <div className="h-full w-[47%] bg-primary rounded-full" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Approximately 47% used this billing period. Contact your admin for quota increases.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "api" && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-semibold text-sm mb-1">API Keys</h2>
                <p className="text-xs text-muted-foreground mb-5">
                  API keys are managed by your tenant admin. Contact them to create or revoke keys.
                </p>
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
                  <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    No API keys available — request one from your admin
                  </span>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-semibold text-sm mb-5">Notification Preferences</h2>
                <div className="space-y-4">
                  {[
                    { label: "Job completed", desc: "When a background async job finishes" },
                    { label: "Quota warning", desc: "When you reach 80% of your token quota" },
                    { label: "Weekly digest", desc: "Summary of your usage each week" },
                  ].map(({ label, desc }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <div className="w-9 h-5 rounded-full bg-primary/20 relative cursor-pointer">
                        <div className="w-4 h-4 rounded-full bg-primary absolute top-0.5 right-0.5 shadow-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm",
          mono && "font-mono text-xs",
          capitalize && "capitalize",
        )}
      >
        {value}
      </span>
    </div>
  );
}
