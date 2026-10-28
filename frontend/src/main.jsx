import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { api, dateTime, shortDate, uploadApi, downloadDocument } from "./api";
import "./style.css";
const C = createContext(null),
  useAuth = () => useContext(C),
  label = (s) => (s || "pending").replaceAll("_", " "),
  role = (s) => s?.[0]?.toUpperCase() + s?.slice(1);
function App() {
  const [session, setSession] = useState(null),
    [busy, setBusy] = useState(!!localStorage.getItem("edupass_token")),
    [restoreError, setRestoreError] = useState("");
  const restoreSession = () => {
    setBusy(true);
    setRestoreError("");
    api("/auth/me")
      .then(setSession)
      .catch((error) => {
        if (error.status === 401) localStorage.removeItem("edupass_token");
        else setRestoreError(error.message || "Unable to connect. Please try again.");
      })
      .finally(() => setBusy(false));
  };
  useEffect(restoreSession, []);
  const signIn = (d) => {
    localStorage.setItem("edupass_token", d.token);
    setSession(d);
  };
  const signOut = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("edupass_token");
    setSession(null);
  };
  if (busy)
    return (
      <div className="splash">
        <Brand />
        <span className="spinner" />
      </div>
    );
  if (restoreError)
    return (
      <div className="splash">
        <Brand />
        <p>{restoreError}</p>
        <button className="btn primary" onClick={restoreSession}>Retry</button>
      </div>
    );
  return (
    <C.Provider
      value={{
        session,
        signIn,
        signOut,
        refresh: async () => setSession(await api("/auth/me")),
      }}
    >
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" /> : <Login />}
        />
        <Route path="/forgot-password" element={<Forgot />} />
        <Route path="/reset-password" element={<Reset />} />
        <Route
          path="/*"
          element={session ? <Shell /> : <Navigate to="/login" />}
        />
      </Routes>
    </C.Provider>
  );
}
function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-mark">
        e<span>.</span>
      </span>
      <span>
        EduPass<small>Campus access, made clear</small>
      </span>
    </Link>
  );
}
function Alert({ children }) {
  return (
    <div role="alert" className="alert">
      {children}
    </div>
  );
}
function Login() {
  const { signIn } = useAuth(),
    nav = useNavigate(),
    [f, S] = useState({ loginId: "", password: "" }),
    [err, E] = useState(""),
    [busy, B] = useState(false),
    [show, T] = useState(false);
  async function submit(e) {
    e.preventDefault();
    E("");
    B(true);
    try {
      let d = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(f),
      });
      signIn(d);
      nav("/");
    } catch (x) {
      E(x.message);
    } finally {
      B(false);
    }
  }
  return (
    <main className="auth">
      <section className="auth-art">
        <Brand />
        <div>
          <span className="eyebrow light">YOUR CAMPUS, IN MOTION</span>
          <h1>
            Time outside.
            <br />
            <em>Peace of mind</em>
            <br />
            inside.
          </h1>
          <p>
            One thoughtful place to request permission, follow approvals, and
            carry a verified campus pass.
          </p>
          <div className="art-pass">
            <div>
              EDUPASS <b>◈</b>
            </div>
            <h3>Campus pass</h3>
            <small>STATUS · READY TO GO</small>
            <strong>▦</strong>
          </div>
        </div>
        <small className="art-foot">MADE FOR THE MOMENT YOU NEED IT</small>
      </section>
      <section className="auth-main">
        <div className="auth-card">
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to EduPass</h2>
          <p>Use the college ID provided by your institution.</p>
          <form onSubmit={submit} className="stack">
            <label>
              College ID
              <input
                autoComplete="username"
                placeholder="e.g. 21CSE001"
                value={f.loginId}
                onChange={(e) => S({ ...f, loginId: e.target.value })}
                required
              />
            </label>
            <label>
              Password
              <div className="pw">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={f.password}
                  onChange={(e) => S({ ...f, password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => T(!show)}>
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            {err && <Alert>{err}</Alert>}
            <button className="btn primary full" disabled={busy}>
              {busy ? "Signing in…" : "Continue"} <span>↗</span>
            </button>
          </form>
          <div className="login-links">
            <Link to="/forgot-password">Forgot password?</Link>
            <span>Need access? Contact your campus administrator.</span>
          </div>
          <div className="secure">
            ✳ &nbsp;Your campus credentials stay private and secure.
          </div>
        </div>
      </section>
    </main>
  );
}
function Forgot() {
  const [email, S] = useState(""),
    [done, D] = useState(false),
    [err, E] = useState("");
  async function submit(e) {
    e.preventDefault();
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      D(true);
    } catch (x) {
      E(x.message);
    }
  }
  return (
    <main className="auth">
      <section className="auth-art">
        <Brand />
        <div>
          <span className="eyebrow light">ACCOUNT SUPPORT</span>
          <h1>
            A little reset.
            <br />
            <em>Then you’re back.</em>
          </h1>
          <p>We’ll send a time-limited reset link to your account email.</p>
        </div>
      </section>
      <section className="auth-main">
        <div className="auth-card">
          <Link to="/login" className="back">
            ← Back to sign in
          </Link>
          <span className="eyebrow">PASSWORD HELP</span>
          <h2>Reset your password</h2>
          <p>Enter your registered college email.</p>
          {done ? (
            <div className="success">
              If that email is registered, a reset link has been sent.
            </div>
          ) : (
            <form className="stack" onSubmit={submit}>
              <label>
                College email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => S(e.target.value)}
                  required
                />
              </label>
              {err && <Alert>{err}</Alert>}
              <button className="btn primary full">Send reset link ↗</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
function Reset() {
  const [token] = useState(
      new URLSearchParams(location.search).get("token") || "",
    ),
    [password, P] = useState(""),
    [done, D] = useState(false),
    [err, E] = useState(""),
    [busy, B] = useState(false);
  async function submit(e) {
    e.preventDefault();
    E("");
    B(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      D(true);
    } catch (x) {
      E(x.message);
    } finally {
      B(false);
    }
  }
  return (
    <main className="auth">
      <section className="auth-art">
        <Brand />
        <div>
          <span className="eyebrow light">ACCOUNT SUPPORT</span>
          <h1>
            Choose a new
            <br />
            <em>password.</em>
          </h1>
          <p>Set a fresh password for your EduPass account.</p>
        </div>
      </section>
      <section className="auth-main">
        <div className="auth-card">
          <Link to="/login" className="back">
            ← Back to sign in
          </Link>
          <span className="eyebrow">PASSWORD HELP</span>
          <h2>Set new password</h2>
          <p>
            Use at least 8 characters, including uppercase, lowercase, and a
            number.
          </p>
          {done ? (
            <div className="success">
              Password updated. <Link to="/login">Sign in to EduPass →</Link>
            </div>
          ) : (
            <form className="stack" onSubmit={submit}>
              <label>
                New password
                <input
                  type="password"
                  minLength="8"
                  value={password}
                  onChange={(e) => P(e.target.value)}
                  required
                />
              </label>
              {err && <Alert>{err}</Alert>}
              <button className="btn primary full" disabled={busy}>
                {busy ? "Updating…" : "Update password"} ↗
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
function Shell() {
  const { session, signOut } = useAuth(),
    navigate = useNavigate(),
    [mobile, M] = useState(false),
    [noticeOpen, setNoticeOpen] = useState(false),
    [notifications, setNotifications] = useState([]),
    [unread, setUnread] = useState(0),
    [noticeError, setNoticeError] = useState(""),
    u = session.user,
    staff = ["faculty", "hod", "admin"].includes(u.role);
  const loadNotifications = async () => {
    try {
      const data = await api("/notifications");
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
      setNoticeError("");
    } catch (error) {
      setNoticeError(error.message || "Unable to load notifications");
    }
  };
  useEffect(() => { loadNotifications(); }, []);
  const markAllRead = async () => {
    try {
      await api("/notifications/read", { method: "PATCH" });
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
      setUnread(0);
    } catch (error) {
      setNoticeError(error.message || "Unable to update notifications");
    }
  };
  const openNotification = async (item) => {
    if (!item.isRead) {
      try {
        await api(`/notifications/${item._id}/read`, { method: "PATCH" });
        setNotifications((items) => items.map((entry) => entry._id === item._id ? { ...entry, isRead: true } : entry));
        setUnread((count) => Math.max(0, count - 1));
      } catch (error) {
        setNoticeError(error.message || "Unable to update notification");
        return;
      }
    }
    setNoticeOpen(false);
    if (item.request) navigate(`/requests/${item.request}`);
  };
  return (
    <div className="shell">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Brand />
        <span className="nav-label">WORKSPACE</span>
        <nav>
          <NavLink end to="/" onClick={() => M(false)}>
            ◫ &nbsp; Overview
          </NavLink>
          <NavLink to="/requests" onClick={() => M(false)}>
            ▤ &nbsp; {staff ? "All requests" : "My requests"}
          </NavLink>
          {staff && (
            <NavLink to="/review" onClick={() => M(false)}>
              ◷ &nbsp; Review queue
            </NavLink>
          )}
          {u.role === "student" && (
            <NavLink to="/new" onClick={() => M(false)}>
              ＋ &nbsp; New request
            </NavLink>
          )}
          {staff && (
            <NavLink to="/verify" onClick={() => M(false)}>
              ▦ &nbsp; Verify pass
            </NavLink>
          )}
          {u.role === "admin" && (
            <NavLink to="/people" onClick={() => M(false)}>
              ♙ &nbsp; Manage people
            </NavLink>
          )}
          <NavLink to="/profile" onClick={() => M(false)}>
            ♙ &nbsp; My profile
          </NavLink>
        </nav>
        <div className="side-bottom">
          <div className="help">
            <b>✳ &nbsp;Need a hand?</b>
            <span>Ask your campus administrator for account support.</span>
          </div>
          <button
            className="user-mini"
            onClick={() => location.assign("/profile")}
          >
            <i>{u.name?.[0]}</i>
            <span>
              <b>{u.name}</b>
              <small>{role(u.role)}</small>
            </span>
            <b>···</b>
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="menu" onClick={() => M(!mobile)}>
            ☰
          </button>
          <div>
            Campus portal <i>/</i> <b>EduPass</b>
          </div>
          <aside>
            <span>
              {new Date().toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
            <div className="notification-wrap">
              <button className="notification-button" aria-label="Notifications" aria-expanded={noticeOpen} onClick={() => { setNoticeOpen((open) => !open); if (!noticeOpen) loadNotifications(); }}>
                ♧{unread > 0 && <i className="notification-count">{unread > 99 ? "99+" : unread}</i>}
              </button>
              {noticeOpen && (
                <section className="notification-panel" aria-label="Notifications">
                  <header><b>Notifications</b>{unread > 0 && <button onClick={markAllRead}>Mark all read</button>}</header>
                  {noticeError && <p className="notification-error">{noticeError}</p>}
                  {!notifications.length && !noticeError && <p className="notification-empty">You’re all caught up.</p>}
                  {notifications.map((item) => (
                    <button key={item._id} className={`notification-item ${item.isRead ? "read" : "unread"}`} onClick={() => openNotification(item)}>
                      <b>{item.title}</b><span>{item.message}</span><small>{dateTime(item.createdAt)}</small>
                    </button>
                  ))}
                </section>
              )}
            </div>
            <button onClick={() => location.assign("/profile")}>
              {u.name?.split(" ")[0]}　⌄
            </button>
          </aside>
        </header>
        <div className="content">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="requests" element={<RequestList />} />
            <Route path="requests/:id" element={<Detail />} />
            <Route
              path="new"
              element={
                u.role === "student" ? <NewRequest /> : <Navigate to="/" />
              }
            />
            <Route
              path="review"
              element={staff ? <Review /> : <Navigate to="/" />}
            />
            <Route
              path="verify"
              element={staff ? <Verify /> : <Navigate to="/" />}
            />
            <Route path="profile" element={<Profile />} />
            <Route
              path="people"
              element={u.role === "admin" ? <People /> : <Navigate to="/" />}
            />
            <Route
              path="*"
              element={
                <>
                  <h1>Page not found</h1>
                  <Link to="/">Back to overview</Link>
                </>
              }
            />
          </Routes>
        </div>
        <footer>
          EDUPASS　•　CAMPUS PERMISSION PORTAL{" "}
          <span>Need help? Contact your institution</span>
        </footer>
      </main>
    </div>
  );
}
function Heading({ k, title, desc, action }) {
  return (
    <div className="heading">
      <div>
        <span className="eyebrow">{k}</span>
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {action}
    </div>
  );
}
function Status({ s }) {
  return <span className={"status " + (s || "pending")}>{label(s)}</span>;
}
function Loading() {
  return (
    <div className="loading">
      <span className="spinner small" /> Loading campus data…
    </div>
  );
}
function Dashboard() {
  const { session } = useAuth(),
    [d, D] = useState(null),
    [err, E] = useState(""),
    staff = ["faculty", "hod", "admin"].includes(session.user.role);
  useEffect(() => {
    api("/dashboard")
      .then(D)
      .catch((x) => E(x.message));
  }, []);
  return (
    <>
      <Heading
        k={`GOOD TO SEE YOU, ${session.user.name?.split(" ")[0]?.toUpperCase()}`}
        title={staff ? "Your review desk" : "Your campus, at a glance"}
        desc={
          staff
            ? "Keep requests moving with a clear view of what needs attention."
            : "Keep permission requests and campus passes together in one place."
        }
        action={
          !staff && (
            <Link className="btn primary" to="/new">
              ＋ New request
            </Link>
          )
        }
      />
      {err && <Alert>{err}</Alert>}
      {!d ? (
        <Loading />
      ) : (
        <>
          <div className="stats">
            {[
              ["All requests", d.stats.total, "blue"],
              [
                staff ? "Awaiting review" : "In progress",
                d.stats.pending,
                "amber",
              ],
              ["Approved", d.stats.approved, "green"],
              ["Declined", d.stats.rejected, "rose"],
            ].map(([n, v, c]) => (
              <div className="stat" key={n}>
                <span className={c}>◷</span>
                <small>{n}</small>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <div className="dash-grid">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">RECENT ACTIVITY</span>
                  <h2>{staff ? "Latest requests" : "Your latest requests"}</h2>
                </div>
                <Link to="/requests">View all →</Link>
              </div>
              {!d.recent.length ? (
                <Empty
                  title="Nothing here yet"
                  text="Your requests will appear here after you submit one."
                />
              ) : (
                d.recent.map((r) => (
                  <Link
                    className="recent"
                    key={r._id}
                    to={`/requests/${r._id}`}
                  >
                    <i>{r.category?.name?.[0] || "P"}</i>
                    <span>
                      <b>
                        {r.category?.name} <small>· {r.requestId}</small>
                      </b>
                      <small>
                        {staff ? `${r.student?.name} · ` : ""}
                        {r.destination}
                      </small>
                      <small className="recent-document">
                        {r.documents?.[0]?.originalName ||
                          (r.category?.requiresDocument
                            ? "Supporting document missing"
                            : "No document attached")}
                      </small>
                    </span>
                    <Status s={r.status} />
                  </Link>
                ))
              )}
            </section>
            <aside className="panel campus">
              <span className="eyebrow">YOUR EDU PASS</span>
              <div className="campus-art">
                <div />
              </div>
              <h3>
                A smoother way
                <br />
                to step out.
              </h3>
              <p>
                Submit, track, and carry campus permission — all in one place.
              </p>
              <Link to={staff ? "/review" : "/requests"}>
                Explore requests →
              </Link>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
function Empty({ title, text }) {
  return (
    <div className="empty">
      <span>⌁</span>
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}
function RequestList() {
  const { session } = useAuth(),
    staff = ["faculty", "hod", "admin"].includes(session.user.role),
    [rows, R] = useState(null),
    [err, E] = useState(""),
    [status, S] = useState("");
  useEffect(() => {
    R(null);
    api(`/permissions?limit=50${status ? `&status=${status}` : ""}`)
      .then((d) => R(d.requests))
      .catch((x) => E(x.message));
  }, [status]);
  return (
    <>
      <Heading
        k={staff ? "CAMPUS REQUESTS" : "YOUR ACTIVITY"}
        title={staff ? "Permission requests" : "My requests"}
        desc={
          staff
            ? "Requests within your college review scope."
            : "Every request, decision, and pass in one place."
        }
        action={
          !staff && (
            <Link className="btn primary" to="/new">
              ＋ New request
            </Link>
          )
        }
      />
      {err && <Alert>{err}</Alert>}
      <div className="toolbar">
        {rows?.length ?? "—"} requests{" "}
        <label>
          Filter{" "}
          <select value={status} onChange={(e) => S(e.target.value)}>
            <option value="">All statuses</option>
            {[
              "pending_faculty",
              "pending_hod",
              "pass_generated",
              "rejected",
              "cancelled",
              "expired",
              "completed",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="panel table-wrap">
        {!rows ? (
          <Loading />
        ) : !rows.length ? (
          <Empty
            title="No requests match"
            text="Try a different status filter, or create a new request."
          />
        ) : (
          <div className="overflow">
            <table>
              <thead>
                <tr>
                  <th>REQUEST</th>
                  {staff && <th>STUDENT</th>}
                  <th>WHEN</th>
                  <th>DESTINATION</th>
                  <th>STATUS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <Link to={`/requests/${r._id}`}>
                        <b>{r.category?.name}</b>
                        <small>{r.requestId}</small>
                      </Link>
                    </td>
                    {staff && (
                      <td>
                        {r.student?.name}
                        <small>{r.student?.loginId}</small>
                      </td>
                    )}
                    <td>{dateTime(r.startAt)}</td>
                    <td>{r.destination}</td>
                    <td>
                      <Status s={r.status} />
                    </td>
                    <td>
                      <Link to={`/requests/${r._id}`}>↗</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
function NewRequest() {
  const nav = useNavigate(),
    [cats, C] = useState([]),
    [maxSize, MS] = useState(5),
    [file, U] = useState(null),
    [preview, V] = useState(""),
    input = useRef(null),
    [f, F] = useState({
      category: "",
      reason: "",
      destination: "",
      contactPerson: "",
      contactPhone: "",
      startAt: "",
      endAt: "",
    }),
    [err, E] = useState(""),
    [busy, B] = useState(false);
  useEffect(() => {
    api("/categories")
      .then((d) => {
        C(d.categories);
        MS(d.uploadLimitMB || 5);
        if (d.categories[0])
          F((x) => ({ ...x, category: d.categories[0]._id }));
      })
      .catch((x) => E(x.message));
  }, []);
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      V("");
      return;
    }
    const url = URL.createObjectURL(file);
    V(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const set = (k, v) => F((x) => ({ ...x, [k]: v })),
    category = cats.find((c) => c._id === f.category);
  function chooseFile(next) {
    E("");
    if (!next) return;
    const types = ["application/pdf", "image/jpeg", "image/png"];
    const extensionAllowed = /\.(pdf|jpe?g|png)$/i.test(next.name);
    if (!extensionAllowed || (next.type && !types.includes(next.type))) {
      U(null);
      E("Choose a PDF, JPG, JPEG, or PNG document.");
      if (input.current) input.current.value = "";
      return;
    }
    if (next.size > maxSize * 1024 * 1024) {
      U(null);
      E(`The document must be ${maxSize} MB or smaller.`);
      if (input.current) input.current.value = "";
      return;
    }
    U(next);
  }
  async function submit(e) {
    e.preventDefault();
    if (category?.requiresDocument && !file) {
      E("Add the supporting document required for this category.");
      return;
    }
    B(true);
    E("");
    try {
      const body = new FormData();
      Object.entries({
        ...f,
        startAt: new Date(f.startAt).toISOString(),
        endAt: new Date(f.endAt).toISOString(),
      }).forEach(([k, v]) => body.append(k, v));
      if (file) body.append("document", file);
      const d = await uploadApi("/permissions", body);
      nav(`/requests/${d.request._id}`);
    } catch (x) {
      E(x.message);
    } finally {
      B(false);
    }
  }
  const size = file
    ? file.size < 1024 * 1024
      ? `${Math.max(1, Math.round(file.size / 1024))} KB`
      : `${(file.size / 1024 / 1024).toFixed(2)} MB`
    : "";
  return (
    <>
      <Heading
        k="NEW REQUEST"
        title="Plan your time away"
        desc="Tell us where you’re going and when. Your request will reach the right people for review."
      />
      <div className="form-grid">
        <form className="panel request-form" onSubmit={submit}>
          <h2>
            <i>01</i> Permission details
          </h2>
          <p className="muted">Give us the essentials.</p>
          <label>
            Reason for leaving
            <select
              value={f.category}
              onChange={(e) => set("category", e.target.value)}
              required
            >
              <option value="" disabled>
                Select a category
              </option>
              {cats.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.requiresHod ? " · HOD review" : ""}
                  {c.requiresDocument ? " · document required" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="upload-field">
            <div className="upload-title">
              <b>Supporting document</b>
              <small>
                {category?.requiresDocument ? "REQUIRED" : "OPTIONAL"}
              </small>
            </div>
            <label className="upload-picker">
              <span className="upload-symbol">↑</span>
              <span>
                {file ? "Choose a replacement" : "Choose a document"}
                <small>PDF, JPG, JPEG, or PNG · up to {maxSize} MB</small>
              </span>
              <input
                ref={input}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                required={Boolean(category?.requiresDocument)}
                onChange={(e) => chooseFile(e.target.files?.[0])}
              />
            </label>
            {file && (
              <div className="file-preview">
                {preview ? (
                  <img
                    src={preview}
                    alt="Selected supporting document preview"
                  />
                ) : (
                  <span className="pdf-preview">PDF</span>
                )}
                <span className="file-info">
                  <b>{file.name}</b>
                  <small>{size} · Ready to upload</small>
                </span>
                <button
                  type="button"
                  className="remove-file"
                  onClick={() => {
                    U(null);
                    if (input.current) input.current.value = "";
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <label>
            Why do you need permission?
            <textarea
              rows="4"
              minLength="10"
              maxLength="2000"
              placeholder="Share a little context for your request…"
              value={f.reason}
              onChange={(e) => set("reason", e.target.value)}
              required
            />
            <small>
              At least 10 characters helps your reviewer understand.
            </small>
          </label>
          <label>
            Destination
            <input
              maxLength="200"
              placeholder="Where will you be going?"
              value={f.destination}
              onChange={(e) => set("destination", e.target.value)}
              required
            />
          </label>
          <div className="two">
            <label>
              Contact person <small>OPTIONAL</small>
              <input
                value={f.contactPerson}
                onChange={(e) => set("contactPerson", e.target.value)}
              />
            </label>
            <label>
              Contact phone <small>OPTIONAL</small>
              <input
                type="tel"
                value={f.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
            </label>
          </div>
          <h2 className="second-title">
            <i>02</i> Time window
          </h2>
          <p className="muted">Requests can be made up to 30 days ahead.</p>
          <div className="two">
            <label>
              Leaving campus
              <input
                type="datetime-local"
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                value={f.startAt}
                onChange={(e) => set("startAt", e.target.value)}
                required
              />
            </label>
            <label>
              Returning by
              <input
                type="datetime-local"
                min={f.startAt || new Date().toISOString().slice(0, 16)}
                value={f.endAt}
                onChange={(e) => set("endAt", e.target.value)}
                required
              />
            </label>
          </div>
          {err && <Alert>{err}</Alert>}
          <div className="submit-row">
            <small>
              By submitting, you confirm these details are accurate.
            </small>
            <button className="btn primary" disabled={busy || !cats.length}>
              {busy ? "Uploading document and submitting…" : "Submit request"} ↗
            </button>
          </div>
        </form>
        <aside className="panel next-steps">
          <span className="eyebrow">WHAT HAPPENS NEXT</span>
          <h3>Good to know</h3>
          <ol>
            <li>
              <b>Faculty review</b>
              <span>Your section faculty reviews the request.</span>
            </li>
            <li>
              <b>HOD review</b>
              <span>Some categories need an extra approval.</span>
            </li>
            <li>
              <b>Your campus pass</b>
              <span>Approved requests include a QR pass.</span>
            </li>
          </ol>
          <p>
            ▣ &nbsp;Only you and the responsible staff can see this request.
          </p>
        </aside>
      </div>
    </>
  );
}
function Detail() {
  const { id } = useParams(),
    { session } = useAuth(),
    [data, D] = useState(null),
    [err, E] = useState(""),
    nav = useNavigate();
  const load = () =>
    api(`/permissions/${id}`)
      .then(D)
      .catch((x) => E(x.message));
  useEffect(() => {
    load();
  }, [id]);
  async function cancel() {
    if (!confirm("Cancel this request?")) return;
    try {
      await api(`/permissions/${id}/cancel`, { method: "POST" });
      load();
    } catch (x) {
      E(x.message);
    }
  }
  if (err && !data)
    return (
      <>
        <Heading k="REQUEST" title="Request unavailable" />
        <Alert>{err}</Alert>
        <Link to="/requests">← Back to requests</Link>
      </>
    );
  if (!data) return <Loading />;
  const r = data.request,
    student = session.user.role === "student";
  return (
    <>
      <Link className="back" to="/requests">
        ← Back to requests
      </Link>
      <Heading
        k={`REQUEST ${r.requestId}`}
        title={r.category?.name || "Permission request"}
        desc={`Submitted ${shortDate(r.submittedAt || r.createdAt)}`}
        action={<Status s={r.status} />}
      />
      {err && <Alert>{err}</Alert>}
      <div className="detail-grid">
        <section className="panel detail-card">
          <span className="eyebrow">REQUEST DETAILS</span>
          <h2>{r.destination}</h2>
          <p>{r.reason}</p>
          <div className="facts">
            {[
              ["Leaving campus", dateTime(r.startAt)],
              ["Returning by", dateTime(r.endAt)],
              ["Student", r.student?.name || session.user.name],
              [
                "Section",
                [r.department?.code, r.academicYear?.name, r.section?.name]
                  .filter(Boolean)
                  .join(" · ") || "On file",
              ],
              ["Contact person", r.contactPerson || "Not provided"],
              ["Contact phone", r.contactPhone || "Not provided"],
            ].map(([k, v]) => (
              <div key={k}>
                <small>{k}</small>
                <b>{v}</b>
              </div>
            ))}
          </div>
          {r.category?.requiresDocument && (
            <div
              className={`document-status ${r.documents?.length ? "is-ready" : "is-missing"}`}
            >
              {r.documents?.length
                ? "Supporting document attached"
                : "Supporting document missing"}
            </div>
          )}
          {r.documents?.length > 0 && (
            <div className="attachments">
              <h3>Supporting documents</h3>
              {r.documents.map((d) => (
                <button
                  type="button"
                  key={d._id}
                  onClick={() => downloadDocument(d._id)}
                >
                  ▣ &nbsp;{d.originalName}{" "}
                  <small>
                    {Math.ceil(d.size / 1024)} KB · Uploaded{" "}
                    {shortDate(d.uploadedAt || d.createdAt)} · Open
                  </small>
                </button>
              ))}
            </div>
          )}
          <h3>Review journey</h3>
          {data.history.map((h) => (
            <div className="history" key={h._id}>
              <b>{label(h.action)}</b>
              <small>
                {h.actor?.name || "EduPass"} · {dateTime(h.createdAt)}
              </small>
              {h.remarks && <p>{h.remarks}</p>}
            </div>
          ))}
          {student &&
            ["submitted", "pending_faculty", "pending_hod"].includes(
              r.status,
            ) && (
              <button className="btn danger" onClick={cancel}>
                Cancel request
              </button>
            )}
        </section>
        <aside>
          {r.pass?.qrCodeDataURL ? (
            <div className="panel pass">
              <span className="eyebrow">YOUR DIGITAL PASS</span>
              <b className="approved">✓ APPROVED</b>
              <img src={r.pass.qrCodeDataURL} alt="QR code campus pass" />
              <strong>{r.requestId}</strong>
              <p>
                Show this code to campus staff during the approved time window.
              </p>
              <small>
                VALID WINDOW
                <br />
                <b>
                  {dateTime(r.pass.validFrom)} – {dateTime(r.pass.validUntil)}
                </b>
              </small>
            </div>
          ) : (
            <div className="panel">
              <span className="eyebrow">CURRENT STATUS</span>
              <p>
                <Status s={r.status} />
              </p>
              <p>
                {r.status === "rejected"
                  ? r.facultyDecision?.remarks ||
                    r.hodDecision?.remarks ||
                    "Please contact faculty for details."
                  : "We’ll keep you updated as your request moves through review."}
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
function Review() {
  const { session } = useAuth(),
    [rows, R] = useState(null),
    [err, E] = useState(""),
    [busy, B] = useState("");
  async function load() {
    try {
      R((await api("/permissions/pending")).requests);
    } catch (x) {
      E(x.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function decide(r, action) {
    let remarks =
      action === "reject"
        ? prompt("Add a reason for declining this request:")
        : "";
    if (action === "reject" && !remarks) return;
    B(r._id);
    E("");
    try {
      await api(
        `/permissions/${r._id}/${session.user.role === "hod" ? "review-hod" : "review"}`,
        {
          method: "POST",
          body: JSON.stringify({ action, remarks: remarks || "" }),
        },
      );
      await load();
    } catch (x) {
      E(x.message);
    } finally {
      B("");
    }
  }
  return (
    <>
      <Heading
        k="REVIEW QUEUE"
        title="Requests needing you"
        desc="A focused list within your assigned review scope."
      />
      <div className="queue-count">
        ● &nbsp;{rows?.length ?? "—"} waiting for{" "}
        {session.user.role === "hod" ? "HOD" : "faculty"} review
      </div>
      {err && <Alert>{err}</Alert>}
      {!rows ? (
        <Loading />
      ) : !rows.length ? (
        <div className="panel">
          <Empty
            title="You’re all caught up"
            text="New requests assigned to you will appear here."
          />
        </div>
      ) : (
        rows.map((r) => (
          <article className="panel review-card" key={r._id}>
            <div className="review-head">
              <i>{r.student?.name?.[0] || "S"}</i>
              <span>
                <b>
                  {r.student?.name} <small>{r.student?.loginId}</small>
                </b>
                <small>
                  {r.category?.name} · {r.requestId}
                </small>
              </span>
              <Status s={r.status} />
            </div>
            <blockquote>“{r.reason}”</blockquote>
            <div className="review-facts">
              <div>
                <small>Destination</small>
                <b>{r.destination}</b>
              </div>
              <div>
                <small>Requested</small>
                <b>
                  {dateTime(r.startAt)} –{" "}
                  {new Date(r.endAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </b>
              </div>
              <div>
                <small>Section</small>
                <b>
                  {r.department?.code} {r.academicYear?.name} {r.section?.name}
                </b>
              </div>
            </div>
            <div className="review-actions">
              <Link to={`/requests/${r._id}`}>View full request →</Link>
              <div>
                <button
                  className="btn outline"
                  disabled={!!busy}
                  onClick={() => decide(r, "reject")}
                >
                  Decline
                </button>
                <button
                  className="btn primary"
                  disabled={!!busy}
                  onClick={() => decide(r, "approve")}
                >
                  {busy === r._id ? "Saving…" : "Approve ✓"}
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </>
  );
}
function Verify() {
  const [raw, S] = useState(""),
    [result, R] = useState(null),
    [err, E] = useState(""),
    [busy, B] = useState(false);
  async function submit(e) {
    e.preventDefault();
    E("");
    R(null);
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      E("Paste the contents of an EduPass QR code.");
      return;
    }
    B(true);
    try {
      R(
        await api("/permissions/verify-pass", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
    } catch (x) {
      E(x.message);
    } finally {
      B(false);
    }
  }
  return (
    <>
      <Heading
        k="CAMPUS VERIFICATION"
        title="Check a campus pass"
        desc="Scan a student QR code, then paste its decoded contents here."
      />
      <div className="verify-grid">
        <form className="panel verify" onSubmit={submit}>
          <span className="verify-icon">▦</span>
          <h2>Verify permission</h2>
          <p>Paste the JSON payload from the QR code.</p>
          <label>
            QR code contents
            <textarea
              rows="6"
              placeholder={'{"requestId":"PR-…","token":"…"}'}
              value={raw}
              onChange={(e) => S(e.target.value)}
              required
            />
          </label>
          {err && <Alert>{err}</Alert>}
          <button className="btn primary full" disabled={busy}>
            {busy ? "Checking…" : "Verify pass"} ↗
          </button>
          {result && (
            <div className={`result ${result.success ? "ok" : "bad"}`}>
              <b>{result.success ? "✓ Pass verified" : "× Pass not valid"}</b>
              <span>{result.message}</span>
              {result.request && (
                <small>
                  {result.request.student?.name} · {result.request.destination}
                </small>
              )}
            </div>
          )}
        </form>
        <aside className="panel verify-help">
          <span className="eyebrow">BEFORE YOU VERIFY</span>
          <h3>What the check confirms</h3>
          <ul>
            <li>Pass was issued by EduPass.</li>
            <li>The approved time window includes now.</li>
            <li>The pass has not been revoked.</li>
          </ul>
          <p>▣ &nbsp;Verification attempts are recorded for campus safety.</p>
        </aside>
      </div>
    </>
  );
}
function Profile() {
  const { session, refresh, signOut } = useAuth(),
    [f, F] = useState({
      name: session.user.name || "",
      phone: session.user.phone || "",
    }),
    [pw, P] = useState({ currentPassword: "", password: "" }),
    [msg, M] = useState(""),
    [err, E] = useState(""),
    [busy, B] = useState(false);
  async function save(e) {
    e.preventDefault();
    B(true);
    E("");
    M("");
    try {
      await api("/auth/profile", { method: "PUT", body: JSON.stringify(f) });
      await refresh();
      M("Your profile has been updated.");
    } catch (x) {
      E(x.message);
    } finally {
      B(false);
    }
  }
  async function change(e) {
    e.preventDefault();
    B(true);
    E("");
    M("");
    try {
      let d = await api("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify(pw),
      });
      localStorage.setItem("edupass_token", d.token);
      P({ currentPassword: "", password: "" });
      M("Password updated successfully.");
    } catch (x) {
      E(x.message);
    } finally {
      B(false);
    }
  }
  return (
    <>
      <Heading
        k="YOUR ACCOUNT"
        title="My profile"
        desc="Manage your campus details and account security."
      />
      <div className="profile-grid">
        <section className="panel profile-summary">
          <div className="profile-cover">
            <i>{session.user.name?.[0]}</i>
          </div>
          <h2>{session.user.name}</h2>
          <p>
            {role(session.user.role)} ·{" "}
            {session.profile?.department?.code || "EduPass member"}
          </p>
          <div className="profile-data">
            <small>
              College ID<b>{session.user.loginId}</b>
            </small>
            <small>
              Email address<b>{session.user.email}</b>
            </small>
            <small>
              Role<b>{role(session.user.role)}</b>
            </small>
          </div>
          <button className="btn outline full" onClick={signOut}>
            Sign out ↗
          </button>
        </section>
        <div className="profile-edit">
          {(err || msg) && (
            <div className={err ? "alert" : "success"}>{err || msg}</div>
          )}
          <form className="panel edit-form" onSubmit={save}>
            <span className="eyebrow">PERSONAL DETAILS</span>
            <h2>Contact information</h2>
            <label>
              Full name
              <input
                minLength="2"
                maxLength="100"
                value={f.name}
                onChange={(e) => F({ ...f, name: e.target.value })}
                required
              />
            </label>
            <label>
              Phone number
              <input
                type="tel"
                value={f.phone}
                onChange={(e) => F({ ...f, phone: e.target.value })}
              />
            </label>
            <button className="btn primary" disabled={busy}>
              Save changes
            </button>
          </form>
          <form className="panel edit-form" onSubmit={change}>
            <span className="eyebrow">ACCOUNT SECURITY</span>
            <h2>Change password</h2>
            <label>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                value={pw.currentPassword}
                onChange={(e) => P({ ...pw, currentPassword: e.target.value })}
                required
              />
            </label>
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength="8"
                value={pw.password}
                onChange={(e) => P({ ...pw, password: e.target.value })}
                required
              />
              <small>
                8+ characters with uppercase, lowercase, and a number.
              </small>
            </label>
            <button className="btn outline" disabled={busy}>
              Update password
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

function People() {
  const [look, L] = useState(null),
    [users, U] = useState([]),
    [q, Q] = useState(""),
    [err, E] = useState(""),
    [msg, M] = useState(""),
    [busy, B] = useState(false),
    [form, F] = useState({
      name: "",
      email: "",
      loginId: "",
      password: "",
      role: "student",
      department: "",
      academicYear: "",
      section: "",
    });
  async function load() {
    try {
      const [a, b] = await Promise.all([
        api("/admin/lookups"),
        api(`/admin/users?q=${encodeURIComponent(q)}`),
      ]);
      L(a);
      U(b.users);
    } catch (x) {
      E(x.message);
    }
  }
  useEffect(() => {
    load();
  }, [q]);
  const set = (k, v) => F((f) => ({ ...f, [k]: v }));
  const opts =
    look?.sections?.filter(
      (s) =>
        s.department === form.department &&
        (form.role !== "student" || s.academicYear === form.academicYear),
    ) || [];
  async function create(e) {
    e.preventDefault();
    B(true);
    E("");
    M("");
    try {
      const body = {
        ...form,
        sections: form.role === "faculty" && form.section ? [form.section] : [],
      };
      delete body.section;
      await api("/admin/users", { method: "POST", body: JSON.stringify(body) });
      F({
        name: "",
        email: "",
        loginId: "",
        password: "",
        role: "student",
        department: "",
        academicYear: "",
        section: "",
      });
      M("Account created. Share the college ID and initial password securely.");
      await load();
    } catch (x) {
      E(x.message);
    } finally {
      B(false);
    }
  }
  async function toggle(u) {
    E("");
    try {
      await api(`/admin/users/${u._id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      await load();
    } catch (x) {
      E(x.message);
    }
  }
  return (
    <>
      <Heading
        k="ADMINISTRATION"
        title="Manage people"
        desc="Provision campus accounts and keep role access current."
      />
      <div className="people-grid">
        <form className="panel edit-form" onSubmit={create}>
          <span className="eyebrow">NEW ACCOUNT</span>
          <h2>Provision a user</h2>
          {err && <Alert>{err}</Alert>}
          {msg && <div className="success">{msg}</div>}
          <label>
            Full name
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </label>
          <label>
            College email
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
          </label>
          <label>
            College ID
            <input
              value={form.loginId}
              onChange={(e) => set("loginId", e.target.value)}
              required
            />
          </label>
          <label>
            Initial password
            <input
              type="password"
              minLength="8"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
            />
            <small>
              8+ characters with uppercase, lowercase, and a number.
            </small>
          </label>
          <label>
            Role
            <select
              value={form.role}
              onChange={(e) =>
                F({
                  ...form,
                  role: e.target.value,
                  department: "",
                  academicYear: "",
                  section: "",
                })
              }
            >
              {["student", "faculty", "hod", "admin"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          {form.role !== "admin" && (
            <label>
              Department
              <select
                value={form.department}
                onChange={(e) =>
                  F({ ...form, department: e.target.value, section: "" })
                }
                required
              >
                <option value="">Select department</option>
                {look?.departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {form.role === "student" && (
            <label>
              Academic year
              <select
                value={form.academicYear}
                onChange={(e) =>
                  F({ ...form, academicYear: e.target.value, section: "" })
                }
                required
              >
                <option value="">Select year</option>
                {look?.academicYears.map((y) => (
                  <option key={y._id} value={y._id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {["student", "faculty"].includes(form.role) && (
            <label>
              {form.role === "student" ? "Section" : "Assigned section"}
              <select
                value={form.section}
                onChange={(e) => set("section", e.target.value)}
                required
              >
                <option value="">Select section</option>
                {opts.map((s) => (
                  <option key={s._id} value={s._id}>
                    {
                      look?.academicYears.find((y) => y._id === s.academicYear)
                        ?.name
                    }{" "}
                    · {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="btn primary" disabled={busy || !look}>
            {busy ? "Creating…" : "Create account"} ↗
          </button>
        </form>
        <section className="panel users-panel">
          <div className="users-head">
            <div>
              <span className="eyebrow">CAMPUS DIRECTORY</span>
              <h2>Accounts</h2>
            </div>
            <input
              placeholder="Search name, email, or college ID"
              value={q}
              onChange={(e) => Q(e.target.value)}
            />
          </div>
          {!users.length ? (
            <Empty
              title="No accounts found"
              text="Try another search or provision an account."
            />
          ) : (
            <div className="overflow">
              <table>
                <thead>
                  <tr>
                    <th>PERSON</th>
                    <th>ROLE</th>
                    <th>DEPARTMENT</th>
                    <th>STATUS</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <b>{u.name}</b>
                        <small>
                          {u.loginId} · {u.email}
                        </small>
                      </td>
                      <td>{role(u.role)}</td>
                      <td>{u.department?.code || "—"}</td>
                      <td>
                        <Status s={u.isActive ? "active" : "cancelled"} />
                      </td>
                      <td>
                        <button
                          className="table-action"
                          onClick={() => toggle(u)}
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
