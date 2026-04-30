import { useCallback, useEffect, useState } from "react";

const API_BASE = "/api";

const defaultForm = { fullName: "", email: "", password: "", role: "employee" };
const defaultTaskForm = { title: "", description: "", assignedTo: "", dueDate: "" };
const defaultProgressForm = { status: "in_progress", progressPercent: 0, note: "" };
const roleStyles = {
  manager: "bg-purple-500/20 text-purple-200 ring-purple-400/30",
  hr: "bg-cyan-500/20 text-cyan-200 ring-cyan-400/30",
  employee: "bg-zinc-500/20 text-zinc-200 ring-zinc-400/30",
};
const RETRYABLE_MESSAGES = [
  "Internal server error",
  "Internal server error. Please retry.",
  "Database is waking up. Please retry in a few seconds.",
  "Failed to fetch",
];

function App() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(defaultForm);
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [progressDrafts, setProgressDrafts] = useState({});
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatEngine, setChatEngine] = useState("unknown");
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      text: "Hi, I am your Project Manager AI Copilot. Ask me about manager tasks, progress ETA, CS architecture, or presentation tips.",
    },
  ]);

  const isAdminView = currentUser && ["hr", "manager"].includes(currentUser.role);
  const isManager = currentUser?.role === "manager";

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
    return data;
  }

  async function requestWithRetry(path, options = {}, retries = 1) {
    try {
      return await request(path, options);
    } catch (error) {
      const shouldRetry =
        retries > 0 &&
        RETRYABLE_MESSAGES.some((text) => `${error.message}`.includes(text));
      if (!shouldRetry) throw error;
      await new Promise((resolve) => setTimeout(resolve, 700));
      return requestWithRetry(path, options, retries - 1);
    }
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

  const loadTasks = useCallback(async () => {
    if (!currentUser) return;
    if (currentUser.role === "manager") {
      const data = await request("/tasks/all");
      setTasks(data.tasks || []);
      setNotes(data.notes || []);
    } else {
      const data = await request("/tasks/my");
      setTasks(data.tasks || []);
      setNotes([]);
    }
  }, [currentUser]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    loadAllUsers();
  }, [loadAllUsers]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

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
        await requestWithRetry("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: form.email, password: form.password }),
        }, 2);
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
    setTasks([]);
    setNotes([]);
  }

  async function handleAssignTask(event) {
    event.preventDefault();
    try {
      await request("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          assignedTo: Number(taskForm.assignedTo),
          dueDate: taskForm.dueDate || undefined,
        }),
      });
      setTaskForm(defaultTaskForm);
      setMessage("Task assigned successfully.");
      await loadTasks();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function setDraft(taskId, nextValue) {
    setProgressDrafts((prev) => ({
      ...prev,
      [taskId]: {
        ...defaultProgressForm,
        ...(prev[taskId] || {}),
        ...nextValue,
      },
    }));
  }

  async function handleUpdateTask(taskId) {
    const draft = progressDrafts[taskId] || defaultProgressForm;
    try {
      await request("/tasks/" + taskId + "/progress", {
        method: "POST",
        body: JSON.stringify({
          status: draft.status,
          progressPercent: Number(draft.progressPercent),
          note: draft.note,
        }),
      });
      setMessage("Progress note added.");
      setProgressDrafts((prev) => ({ ...prev, [taskId]: defaultProgressForm }));
      await loadTasks();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function notesForTask(taskId) {
    return notes.filter((item) => item.task_id === taskId).slice(0, 3);
  }

  async function handleSendChat(event) {
    event.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userText = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userText }]);
    setChatLoading(true);
    try {
      const data = await request("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: userText }),
      });
      setChatEngine(data.engine || "unknown");
      const etaLine = data.estimate?.summary ? `\n\nETA: ${data.estimate.summary}` : "";
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: `${data.reply}${etaLine}` },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Assistant error: ${error.message}` },
      ]);
    } finally {
      setChatLoading(false);
    }
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
                Project Manager Portal
              </h1>
              <p className="mt-3 text-sm text-zinc-300">
                CPS3500 Final Project | Manage members, tasks, and progress notes
              </p>

              <div className="mt-6 space-y-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                <p className="font-semibold">Demo Notes</p>
                <p>
                  1) Use seeded account: <code className="rounded bg-black/30 px-1">yuan.liu@example.com</code>
                </p>
                <p>
                  2) Password: <code className="rounded bg-black/30 px-1">Password123!</code>
                </p>
                <p>3) Manager can assign tasks; users update progress + notes.</p>
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
              Project Manager Portal
            </h1>
            <p className="mt-3 text-sm text-zinc-300">
              CPS3500 Final Project | Manage members, tasks, and progress notes
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

            {isManager && (
              <div className="mt-5 rounded-xl border border-zinc-700/60 bg-zinc-950/50 p-4">
                <h3 className="mb-3 font-semibold text-zinc-100">Assign New Task</h3>
                <form className="grid gap-3 md:grid-cols-2" onSubmit={handleAssignTask}>
                  <input
                    className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-blue-500/40 transition focus:ring-2"
                    placeholder="Task title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                  <select
                    className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-2.5 text-sm text-zinc-100 outline-none ring-blue-500/40 transition focus:ring-2"
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                  >
                    <option value="">Assign to member</option>
                    {users.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.role})
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-blue-500/40 transition focus:ring-2 md:col-span-2"
                    placeholder="Task description"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                  <input
                    className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-2.5 text-sm text-zinc-100 outline-none ring-blue-500/40 transition focus:ring-2"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  />
                  <button
                    className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 p-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/50 transition hover:from-indigo-400 hover:to-purple-400"
                    type="submit"
                  >
                    Assign Task
                  </button>
                </form>
              </div>
            )}

            {isAdminView ? (
              <div className="mt-5 overflow-x-auto">
                <h3 className="mb-3 font-semibold text-zinc-100">
                  Team Directory
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
                You can update your own assigned tasks with progress and notes.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <h3 className="mb-3 font-semibold text-zinc-100">
              {isManager ? "All Project Tasks" : "My Assigned Tasks"}
            </h3>
            <div className="space-y-4">
              {tasks.map((task) => {
                const draft = progressDrafts[task.id] || defaultProgressForm;
                const taskNotes = notesForTask(task.id);
                const canUpdate = isManager || task.assigned_to === currentUser.id;
                return (
                  <article
                    key={task.id}
                    className="rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-zinc-100">{task.title}</h4>
                      <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 ring-1 ring-zinc-600">
                        {task.status} | {task.progress_percent}%
                      </span>
                    </div>
                    <p className="mt-2 text-zinc-300">{task.description || "No description."}</p>
                    <p className="mt-2 text-xs text-zinc-400">
                      Assigned to: {task.assigned_to_name} | Due: {task.due_date || "No due date"}
                    </p>

                    {canUpdate && (
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <select
                          className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-100"
                          value={draft.status}
                          onChange={(e) => setDraft(task.id, { status: e.target.value })}
                        >
                          <option value="todo">todo</option>
                          <option value="in_progress">in_progress</option>
                          <option value="blocked">blocked</option>
                          <option value="done">done</option>
                        </select>
                        <input
                          className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-100"
                          type="number"
                          min="0"
                          max="100"
                          value={draft.progressPercent}
                          onChange={(e) => setDraft(task.id, { progressPercent: e.target.value })}
                          placeholder="Progress %"
                        />
                        <button
                          className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-500"
                          type="button"
                          onClick={() => handleUpdateTask(task.id)}
                        >
                          Update Progress
                        </button>
                        <textarea
                          className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-100 md:col-span-3"
                          rows="2"
                          value={draft.note}
                          onChange={(e) => setDraft(task.id, { note: e.target.value })}
                          placeholder="Add note: what did you complete, blockers, next step..."
                        />
                      </div>
                    )}

                    {isManager && taskNotes.length > 0 && (
                      <div className="mt-3 rounded-lg border border-zinc-700/60 bg-zinc-900/70 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Latest Notes
                        </p>
                        <div className="space-y-2">
                          {taskNotes.map((item) => (
                            <div key={item.id} className="text-xs text-zinc-300">
                              <span className="font-semibold text-zinc-100">{item.full_name}:</span>{" "}
                              {item.note} ({item.progress_percent ?? "n/a"}%)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              {tasks.length === 0 && (
                <p className="rounded-xl border border-zinc-700/60 bg-zinc-900/70 p-4 text-sm text-zinc-300">
                  No tasks yet. {isManager ? "Assign a task to start tracking progress." : "Ask your manager to assign tasks."}
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {currentUser && (
        <div className="fixed right-4 bottom-4 z-50 w-[min(420px,calc(100vw-2rem))]">
          <div className="rounded-2xl border border-zinc-700/70 bg-zinc-950/90 shadow-2xl shadow-black/60 backdrop-blur-xl">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-t-2xl border-b border-zinc-800 px-4 py-3 text-left"
              onClick={() => setChatOpen((prev) => !prev)}
            >
              <span className="text-sm font-semibold text-zinc-100">
                AI Project Chat ({chatOpen ? "Hide" : "Show"})
              </span>
              <span className="text-xs text-zinc-400">
                {isManager ? "Manager Mode" : "Member Mode"} | AI: {chatEngine}
              </span>
            </button>
            {chatOpen && (
              <div className="space-y-3 p-3">
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-zinc-800 bg-black/30 p-3 text-sm">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={`${msg.role}-${idx}`}
                      className={`rounded-lg px-3 py-2 ${
                        msg.role === "assistant"
                          ? "bg-zinc-800/80 text-zinc-100"
                          : "bg-blue-600/30 text-blue-100"
                      }`}
                    >
                      <p className="mb-1 text-[11px] uppercase tracking-wide opacity-70">{msg.role}</p>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ))}
                  {chatLoading && (
                    <p className="text-xs text-zinc-400">Thinking about your project context...</p>
                  )}
                </div>
                <form className="space-y-2" onSubmit={handleSendChat}>
                  <textarea
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-sm text-zinc-100"
                    rows="2"
                    placeholder="Ask: what does a manager task mean? / estimate completion / presentation tips..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading}
                    className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {chatLoading ? "Sending..." : "Send to AI Copilot"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
