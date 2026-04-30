import { useCallback, useEffect, useState } from "react";

const API_BASE = "/api";

const defaultForm = { fullName: "", email: "", password: "", role: "employee" };

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
        setMessage("注册成功，请登录。");
        setMode("login");
      } else {
        await request("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        setMessage("登录成功。");
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
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">CPS3500 - SESMag HR Portal</h1>
          <p className="mt-2 text-sm text-slate-600">
            Student: Yuan Liu (1306116) | Stack: React + Express + PostgreSQL
          </p>
        </header>

        {!currentUser && (
          <section className="rounded-xl bg-white p-6 shadow">
            <div className="mb-4 flex gap-2">
              <button
                className={`rounded px-4 py-2 ${mode === "login" ? "bg-slate-900 text-white" : "bg-slate-200"}`}
                onClick={() => setMode("login")}
              >
                登录
              </button>
              <button
                className={`rounded px-4 py-2 ${mode === "register" ? "bg-slate-900 text-white" : "bg-slate-200"}`}
                onClick={() => setMode("register")}
              >
                注册
              </button>
            </div>

            <form className="grid gap-3" onSubmit={handleSubmit}>
              {mode === "register" && (
                <>
                  <input
                    className="rounded border p-2"
                    placeholder="Full Name"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                  <select
                    className="rounded border p-2"
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
                className="rounded border p-2"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                className="rounded border p-2"
                placeholder="Password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button className="rounded bg-blue-600 p-2 font-medium text-white" type="submit">
                {mode === "register" ? "创建账号" : "登录系统"}
              </button>
            </form>
            {message && <p className="mt-3 text-sm text-indigo-700">{message}</p>}
          </section>
        )}

        {currentUser && (
          <section className="rounded-xl bg-white p-6 shadow">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">欢迎，{currentUser.fullName}</h2>
                <p className="text-sm text-slate-600">
                  当前角色: <span className="font-medium">{currentUser.role}</span>
                </p>
              </div>
              <button className="rounded bg-slate-900 px-4 py-2 text-white" onClick={handleLogout}>
                退出登录
              </button>
            </div>

            {isAdminView ? (
              <div className="mt-5 overflow-x-auto">
                <h3 className="mb-2 font-semibold">员工信息列表（HR/Manager 可见）</h3>
                <table className="min-w-full border text-left text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border p-2">ID</th>
                      <th className="border p-2">Name</th>
                      <th className="border p-2">Email</th>
                      <th className="border p-2">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="border p-2">{user.id}</td>
                        <td className="border p-2">{user.full_name}</td>
                        <td className="border p-2">{user.email}</td>
                        <td className="border p-2">{user.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 rounded bg-slate-100 p-3 text-sm">
                你是 employee 角色，只能访问自己的个人资料（符合 RBAC 访问控制要求）。
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default App;
