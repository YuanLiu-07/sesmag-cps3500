import { useCallback, useEffect, useState } from "react";

const API_BASE = "/api";

const defaultForm = { fullName: "", email: "", password: "", role: "employee" };
const roleStyles = {
  manager: "bg-purple-500/20 text-purple-200 ring-purple-400/30",
  hr: "bg-cyan-500/20 text-cyan-200 ring-cyan-400/30",
  employee: "bg-zinc-500/20 text-zinc-200 ring-zinc-400/30",
};

function App() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);

  const isAdminView = currentUser && ["hr", "manager"].includes(currentUser.role);

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
  }

  const loadMe = useCallback(async () => {
    try {
      const data = await request("/auth/me");
      setCurrentUser({
        id: data.user.id,
        fullName: data.user.full_name,
        email: data.user.email,
        role: data.user.role,
      });
    } catch {
      setCurrentUser(null);
    }
  }, []);

  const loadAllUsers = useCallback(async () => {
    if (!isAdminView) return;
    const data = await request("/users");
    setUsers(data.users);
  }, [isAdminView]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    loadAllUsers();
  }, [loadAllUsers]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    try {
      if (mode === "register") {
        await request("/auth/register", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setMessage("Registration successful. Please sign in.");
        setMode("login");
      } else {
        await request("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        setMessage("Sign in successful.");
        await loadMe();
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleLogout() {
    await request("/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setUsers([]);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#27272a_0%,#09090b_45%,#030712_100%)] p-6 text-zinc-100">
      {!currentUser && (
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
          <section className="grid w-full gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <p className="mb-2 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs tracking-[0.15em] text-zinc-300 uppercase">
                CPS3500 Project
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                SESMag HR Portal
              </h1>
              <p className="mt-3 text-sm text-zinc-300">
                Student: Yuan Liu (1306116) | Stack: React + Express + PostgreSQL
              </p>

              <div className="mt-6 space-y-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                <p className="font-semibold">Demo Notes</p>
                <p>
                  1) Use seeded account: <code className="rounded bg-black/30 px-1">yuan.liu@example.com</code>
                </p>
                <p>
                  2) Password: <code className="rounded bg-black/30 px-1">Password123!</code>
                </p>
                <p>3) Manager/HR can view employee directory; employee has restricted access.</p>
              </div>

              <div className="mt-4 rounded-xl border border-zinc-700/60 bg-zinc-900/70 p-4 text-sm text-zinc-300">
                <p className="font-semibold text-zinc-100">Presentation Tips</p>
                <p className="mt-2">- Show sign in flow</p>
                <p>- Explain RBAC behavior by role</p>
                <p>- Open Neon + Vercel settings as deployment evidence</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="mb-4 flex gap-2">
                <button
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    mode === "login"
                      ? "bg-white text-black shadow-lg shadow-white/20"
                      : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  }`}
                  onClick={() => setMode("login")}
                >
                  Sign In
                </button>
                <button
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    mode === "register"
                      ? "bg-white text-black shadow-lg shadow-white/20"
                      : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  }`}
                  onClick={() => setMode("register")}
                >
                  Register
                </button>
              </div>

              <p className="mb-4 text-sm text-zinc-400">
                {mode === "login"
                  ? "Enter your account credentials to access the portal."
                  : "Create a new account and pick a role for RBAC demo."}
              </p>

              <form className="grid gap-3" onSubmit={handleSubmit}>
                {mode === "register" && (
                  <>
                    <input
                      className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-blue-500/40 transition focus:ring-2"
                      placeholder="Full Name"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    />
                    <select
                      className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-2.5 text-sm text-zinc-100 outline-none ring-blue-500/40 transition focus:ring-2"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                    >
                      <option value="employee">Employee</option>
                      <option value="hr">HR</option>
                      <option value="manager">Manager</option>
                    </select>
                  </>
                )}
                <input
                  className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-blue-500/40 transition focus:ring-2"
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <input
                  className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-blue-500/40 transition focus:ring-2"
                  placeholder="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 p-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/50 transition hover:from-blue-400 hover:to-indigo-400"
                  type="submit"
                >
                  {mode === "register" ? "Create Account" : "Sign In"}
                </button>
              </form>

              {message && (
                <p className="mt-3 rounded-lg border border-indigo-400/30 bg-indigo-500/10 p-3 text-sm text-indigo-200">
                  {message}
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {currentUser && (
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <p className="mb-2 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs tracking-[0.15em] text-zinc-300 uppercase">
              CPS3500 Project
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              SESMag HR Portal
            </h1>
            <p className="mt-3 text-sm text-zinc-300">
              Student: Yuan Liu (1306116) | Stack: React + Express + PostgreSQL
            </p>
          </header>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Welcome, {currentUser.fullName}</h2>
                <p className="mt-2 text-sm text-zinc-300">
                  Current role:{" "}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      roleStyles[currentUser.role] || roleStyles.employee
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </p>
              </div>
            </div>

            {isAdminView ? (
              <div className="mt-5 overflow-x-auto">
                <h3 className="mb-3 font-semibold text-zinc-100">
                  Employee Directory (Visible to HR/Manager)
                </h3>
                <table className="min-w-full overflow-hidden rounded-xl border border-zinc-700/60 text-left text-sm">
                  <thead className="bg-zinc-900/90 text-zinc-300">
                    <tr>
                      <th className="border border-zinc-700/60 p-2.5">ID</th>
                      <th className="border border-zinc-700/60 p-2.5">Name</th>
                      <th className="border border-zinc-700/60 p-2.5">Email</th>
                      <th className="border border-zinc-700/60 p-2.5">Role</th>
                    </tr>
                  </thead>
                  <tbody className="bg-zinc-950/60">
                    {users.map((user) => (
                      <tr key={user.id} className="transition hover:bg-zinc-900/80">
                        <td className="border border-zinc-700/60 p-2.5 text-zinc-200">{user.id}</td>
                        <td className="border border-zinc-700/60 p-2.5 text-zinc-100">
                          {user.full_name}
                        </td>
                        <td className="border border-zinc-700/60 p-2.5 text-zinc-300">{user.email}</td>
                        <td className="border border-zinc-700/60 p-2.5">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                              roleStyles[user.role] || roleStyles.employee
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-zinc-700/60 bg-zinc-900/70 p-3 text-sm text-zinc-300">
                You are in the employee role and can only access your own profile (RBAC enforced).
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
