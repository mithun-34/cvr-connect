import { useState, useEffect } from "react";
import { ArrowLeft, Check, X, Ban, Eye, EyeOff } from "lucide-react";
import { useAdminApi } from "../lib/api";

interface Props {
  onBack: () => void;
}

type AdminUser = {
  id: string;
  email: string;
  name: string;
  status: "pending" | "approved" | "rejected" | "banned";
  id_card: string | null;
  age: number;
  gender: string;
  department: string;
  year: number;
  reports_count: number;
  created_at: string;
};

type Filter = "all" | "pending" | "approved" | "rejected" | "banned";

export default function AdminPanel({ onBack }: Props) {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [authError, setAuthError] = useState("");

  const adminApi = useAdminApi(token);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  async function login() {
    if (!tokenInput.trim()) return setAuthError("Enter admin token.");
    setLoading(true);
    setAuthError("");
    try {
      const api = useAdminApi(tokenInput.trim());
      await api.users(); // test the token
      setToken(tokenInput.trim());
      setAuthed(true);
    } catch {
      setAuthError("Invalid token. Check ADMIN_TOKEN in your .env file.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    adminApi
      .users()
      .then(({ users }) => setUsers(users))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(userId: string, status: string) {
    setActing(userId);
    try {
      await adminApi.setStatus(userId, status);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: status as any } : u))
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActing(null);
    }
  }

  const filtered = users.filter((u) => filter === "all" || u.status === filter);
  const counts: Record<Filter, number> = {
    all: users.length,
    pending: users.filter((u) => u.status === "pending").length,
    approved: users.filter((u) => u.status === "approved").length,
    rejected: users.filter((u) => u.status === "rejected").length,
    banned: users.filter((u) => u.status === "banned").length,
  };

  // ─── Token gate ─────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 shrink-0">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100">
            <ArrowLeft className="w-4 h-4 text-zinc-600" />
          </button>
          <h2 className="font-semibold text-lg text-zinc-900">Admin panel</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-4">
            <p className="text-sm text-zinc-500 text-center">Enter your admin token to continue.</p>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                placeholder="Admin token"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
                className="w-full px-4 py-2.5 pr-10 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                onClick={() => setShowToken((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {authError && <p className="text-xs text-red-500">{authError}</p>}
            <button
              onClick={login}
              disabled={loading}
              className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:bg-purple-300 transition-colors"
            >
              {loading ? "Checking…" : "Access admin panel"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Admin content ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100">
          <ArrowLeft className="w-4 h-4 text-zinc-600" />
        </button>
        <h2 className="font-semibold text-lg text-zinc-900">Admin panel</h2>
        <span className="ml-auto text-xs text-zinc-400">{users.length} users</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-zinc-100 overflow-x-auto shrink-0">
        {(["pending", "approved", "rejected", "banned", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-purple-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            <span className="capitalize">{f}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              filter === f ? "bg-white/30 text-white" : "bg-zinc-200 text-zinc-600"
            }`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-zinc-400">
            No {filter === "all" ? "" : filter} users
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {filtered.map((user) => (
              <div key={user.id} className="px-4 py-3">
                {/* Row */}
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setExpanded(expanded === user.id ? null : user.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-zinc-900 truncate">{user.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${statusStyle[user.status]}`}>
                        {user.status}
                      </span>
                      {user.reports_count > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-100 shrink-0">
                          {user.reports_count} report{user.reports_count !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {user.email} · {user.department ?? "—"} · Yr {user.year ?? "—"}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-400 shrink-0">
                    {new Date(user.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                </div>

                {/* Expanded */}
                {expanded === user.id && (
                  <div className="mt-3 space-y-3">
                    {/* ID card */}
                    {user.id_card ? (
                      <img
                        src={user.id_card}
                        className="w-full rounded-2xl border border-zinc-200 object-cover max-h-48"
                        alt="ID card"
                      />
                    ) : (
                      <p className="text-xs text-zinc-400 bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100">
                        No ID card uploaded
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {user.status !== "approved" && (
                        <ActionBtn
                          label="Approve"
                          icon={<Check className="w-3.5 h-3.5" />}
                          color="green"
                          loading={acting === user.id}
                          onClick={() => setStatus(user.id, "approved")}
                        />
                      )}
                      {user.status !== "rejected" && (
                        <ActionBtn
                          label="Reject"
                          icon={<X className="w-3.5 h-3.5" />}
                          color="zinc"
                          loading={acting === user.id}
                          onClick={() => setStatus(user.id, "rejected")}
                        />
                      )}
                      {user.status !== "banned" && (
                        <ActionBtn
                          label="Ban"
                          icon={<Ban className="w-3.5 h-3.5" />}
                          color="red"
                          loading={acting === user.id}
                          onClick={() => setStatus(user.id, "banned")}
                        />
                      )}
                      {user.status === "banned" && (
                        <ActionBtn
                          label="Unban"
                          icon={<Check className="w-3.5 h-3.5" />}
                          color="green"
                          loading={acting === user.id}
                          onClick={() => setStatus(user.id, "pending")}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  label, icon, color, loading, onClick,
}: {
  label: string;
  icon: React.ReactNode;
  color: "green" | "red" | "zinc";
  loading: boolean;
  onClick: () => void;
}) {
  const colors = {
    green: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
    red:   "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    zinc:  "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50 ${colors[color]}`}
    >
      {loading ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : icon}
      {label}
    </button>
  );
}

const statusStyle: Record<string, string> = {
  pending:  "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-zinc-100 text-zinc-600 border-zinc-200",
  banned:   "bg-red-50 text-red-700 border-red-200",
};
