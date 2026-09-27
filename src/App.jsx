import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, User, Sparkles, BookOpen, Award, FolderGit2,
  ClipboardCheck, FileText, Bell, Users, BarChart3, Target, Briefcase,
  Search, ChevronDown, ChevronUp, X, Check, Plus, GraduationCap, Upload,
  Trophy, Zap, TrendingUp, CheckCircle2, Flame, Mail, Rocket,
  LogIn, LogOut, Lock, ShieldCheck
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

/* ---------------------------------------------------------------------
   DESIGN TOKENS — an "EdTech" palette: confident indigo as the brand
   color, with four saturated accents that double as a subject/domain
   color-code (the way a school timetable color-codes classes), plus a
   warm/cool pair for status. Headings use a rounded display face,
   body/data uses a plain grotesque so numbers stay legible.
--------------------------------------------------------------------- */
const INK = "#211B4E";       // headings / primary text
const SLATE = "#6B7094";     // secondary text
const CANVAS = "#F4F5FC";    // page background
const LINE = "#E7E7F6";      // hairline borders

const INDIGO = "#4F46E5";
const VIOLET = "#8B5CF6";
const SKY = "#0EA5E9";
const TEAL = "#10B981";
const AMBER = "#F59E0B";
const CORAL = "#F43F5E";

const heading = { fontFamily: "'Baloo 2', 'Poppins', sans-serif" };

function withAlpha(hex, a) {
  const h = hex.replace("#", "");
  const v = parseInt(h, 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

/* ---------------------------------------------------------------------
   CONFIG (mirrors SystemConfig model — admin-configurable in real system)
--------------------------------------------------------------------- */
const SKILL_WEIGHTS = { test: 0.40, course: 0.25, cert: 0.20, project: 0.15 };
const READINESS_WEIGHTS = { skill: 0.35, cgpa: 0.30, test: 0.20, profile: 0.15 };
const READINESS_LEVELS = [
  { max: 39, label: "Beginner", color: CORAL },
  { max: 59, label: "Developing", color: AMBER },
  { max: 74, label: "Good", color: SKY },
  { max: 89, label: "Placement Ready", color: TEAL },
  { max: 100, label: "Highly Ready", color: VIOLET },
];
const DOMAINS = {
  "Software Development": ["Java", "React", "Node.js", "Spring Boot", "DSA"],
  "Data Science": ["Python", "Machine Learning", "SQL", "Data Analytics"],
  "AI / ML": ["Python", "Machine Learning", "Deep Learning", "NLP"],
  "Cloud / DevOps": ["AWS", "Azure", "Docker", "Kubernetes", "CI/CD"],
  "Biotechnology": ["Bioinformatics", "Genomics", "Biostatistics", "Lab Techniques", "Genetic Engineering"],
};
const DOMAIN_COLORS = {
  "Software Development": INDIGO,
  "Data Science": SKY,
  "AI / ML": VIOLET,
  "Cloud / DevOps": TEAL,
  "Biotechnology": "#EC4899",
};
const ALL_SKILLS = [...new Set(Object.values(DOMAINS).flat())];
const BRANCHES = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Biotechnology"];
const CERT_DOMAINS = Object.keys(DOMAINS).concat(["Cyber Security", "General"]);

// Single college-admin account for this demo tenant. In production this
// would be a real User document with a hashed password, verified by the
// backend — never trusted from the frontend.
const ADMIN_ACCOUNT = { email: "admin@talentx.edu", dob: "1988-05-02", name: "Placement Admin" };

// Points at the Node/Express + MongoDB backend (see the accompanying
// talentx-backend project). If that server isn't running — e.g. you're just
// previewing this file — every call below fails fast and the app falls
// back to the in-memory demo data automatically.
const API_BASE = "https://portal-backend-rust.vercel.app/api";


async function callApi(path, options = {}, timeoutMs = 1800) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { reached: true, ok: false, message: data.message || "Request failed." };
    return { reached: true, ok: true, data };
  } catch (err) {
    clearTimeout(timer);
    return { reached: false, ok: false, message: "Backend not reachable." };
  }
}

function readinessOf(score) {
  return READINESS_LEVELS.find((l) => score <= l.max);
}
function domainOfSkill(name) {
  return Object.entries(DOMAINS).find(([, list]) => list.includes(name))?.[0] || null;
}
function skillColor(name) {
  const d = domainOfSkill(name);
  return d ? DOMAIN_COLORS[d] : INDIGO;
}
function levelColor(level) {
  if (level === "Expert") return VIOLET;
  if (level === "Advanced") return INDIGO;
  if (level === "Intermediate") return SKY;
  if (level === "Beginner") return AMBER;
  return SLATE;
}

/* ---------------------------------------------------------------------
   SCORING — pure functions, reused on generation AND on every edit
--------------------------------------------------------------------- */
function scoreOf(sk) {
  return Math.round(
    sk.test * SKILL_WEIGHTS.test + sk.course * SKILL_WEIGHTS.course +
    sk.cert * SKILL_WEIGHTS.cert + sk.project * SKILL_WEIGHTS.project
  );
}
function levelOf(score) {
  if (score === 0) return "Not yet evidenced";
  if (score >= 85) return "Expert";
  if (score >= 65) return "Advanced";
  if (score >= 40) return "Intermediate";
  return "Beginner";
}

// Recomputes every derived field on a student from its raw building blocks.
// Called after every add/edit so the meters always reflect real evidence,
// never a self-reported claim alone.
function deriveStudent(base) {
  const skills = base.skills.map((sk) => ({ ...sk, score: scoreOf(sk), level: levelOf(scoreOf(sk)) }));
  const testAvg = skills.length ? Math.round(skills.reduce((a, s) => a + s.test, 0) / skills.length) : 0;
  const overallSkillScore = skills.length ? Math.round(skills.reduce((a, s) => a + s.score, 0) / skills.length) : 0;

  const profileFields = [true, true, true, skills.length > 0, base.certifications.length > 0,
    base.courses.length > 0, base.projects.length > 0, base.resumeUploaded];
  const profileCompletion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  const placementReadiness = Math.round(
    overallSkillScore * READINESS_WEIGHTS.skill +
    (base.cgpa / 10) * 100 * READINESS_WEIGHTS.cgpa +
    testAvg * READINESS_WEIGHTS.test +
    profileCompletion * READINESS_WEIGHTS.profile
  );

  const domainScores = Object.fromEntries(
    Object.entries(DOMAINS).map(([domain, dSkills]) => {
      const relevant = skills.filter((s) => dSkills.includes(s.name));
      const avg = relevant.length ? Math.round(relevant.reduce((a, s) => a + s.score, 0) / relevant.length) : 0;
      return [domain, avg];
    })
  );

  const status = placementReadiness >= 75 ? "Placement Ready" : profileCompletion < 60 ? "Profile Incomplete" : "Profile Complete";

  return { ...base, skills, testAvg, overallSkillScore, profileCompletion, placementReadiness, domainScores, status };
}

/* ---------------------------------------------------------------------
   MOCK DATA GENERATION
--------------------------------------------------------------------- */
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const FIRST = ["Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Ishita", "Karan", "Meera",
  "Arjun", "Neha", "Siddharth", "Divya", "Rahul", "Sanya", "Aditya", "Pooja",
  "Nikhil", "Riya", "Yash", "Tanya", "Manish", "Kavya", "Dev", "Simran"];
const LAST = ["Sharma", "Verma", "Patel", "Gupta", "Reddy", "Nair", "Iyer", "Kapoor",
  "Chatterjee", "Joshi", "Malhotra", "Bose", "Rao", "Menon", "Singh"];

function makeStudent(i) {
  const rand = seededRand(i * 37 + 11);
  const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`;
  const branch = BRANCHES[Math.floor(rand() * BRANCHES.length)];
  const semester = 4 + Math.floor(rand() * 5);
  const gradYear = 2026 + Math.floor(rand() * 3);
  const cgpa = +(6 + rand() * 3.6).toFixed(2);

  const skillNames = ALL_SKILLS.filter(() => rand() > 0.45).slice(0, 6 + Math.floor(rand() * 3));
  const skills = skillNames.map((name) => ({
    name,
    test: Math.round(40 + rand() * 60),
    course: Math.round(40 + rand() * 60),
    cert: rand() > 0.4 ? Math.round(50 + rand() * 50) : 0,
    project: rand() > 0.3 ? Math.round(50 + rand() * 50) : 0,
  }));

  const certNames = ["Cloud Practitioner", "Data Analytics Pro", "Full Stack Dev", "ML Foundations", "Java SE 17", "Certified Bioinformatics Associate"];
  const certOrgs = ["AWS", "Google", "Coursera", "Udemy", "Oracle", "NPTEL"];
  const domainKeys = Object.keys(DOMAINS);
  const certifications = Array.from({ length: Math.floor(rand() * 4) }, (_, k) => ({
    name: certNames[k % certNames.length],
    org: certOrgs[k % certOrgs.length],
    domain: domainKeys[k % domainKeys.length],
    issueDate: `202${3 + (k % 3)}-0${1 + k}-15`,
  }));

  const courseNames = ["Full Stack Web Development", "DSA Masterclass", "SQL for Data Analysis",
    "Cloud Fundamentals", "React Advanced Patterns", "Python for ML",
    "Bioinformatics Fundamentals", "Genomics & Precision Medicine",
    "Lab Techniques for Biotechnology", "CRISPR & Genetic Engineering Basics"];
  const courseProviders = ["Coursera", "Udemy", "NPTEL", "internal", "edX", "MIT OpenCourseWare"];
  const courses = Array.from({ length: 2 + Math.floor(rand() * 4) }, (_, k) => ({
    name: courseNames[k % courseNames.length],
    provider: courseProviders[k % courseProviders.length],
    status: rand() > 0.2 ? "Completed" : "In Progress",
  }));

  const projectNames = ["Campus Marketplace App", "Attendance Tracker", "Sentiment Analyzer", "Expense Split Tool", "DNA Sequence Classifier"];
  const projects = Array.from({ length: 1 + Math.floor(rand() * 3) }, (_, k) => ({
    name: projectNames[k % projectNames.length],
    tech: skillNames.slice(0, 3).join(", ") || "JavaScript",
  }));

  const birthYear = 2002 + Math.floor(rand() * 4);
  const birthMonth = 1 + Math.floor(rand() * 12);
  const birthDay = 1 + Math.floor(rand() * 28);
  const dob = `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;
  const email = `${name.toLowerCase().replace(/\s+/g, ".")}.${1000 + i}@talentx.edu`;

  const base = {
    id: `S${1000 + i}`,
    name, branch, semester, gradYear, cgpa,
    course: "B.Tech",
    skills, certifications, courses, projects,
    resumeUploaded: rand() > 0.3,
    resumeVersion: rand() > 0.3 ? 2 : 0,
    email, dob,
  };
  return deriveStudent(base);
}

const INITIAL_STUDENTS = Array.from({ length: 26 }, (_, i) => makeStudent(i));

/* ---------------------------------------------------------------------
   SMALL UI PRIMITIVES
--------------------------------------------------------------------- */
function GradientBar({ value, height = 10, color }) {
  const c = color || readinessOf(value).color;
  return (
    <div style={{ background: withAlpha(c, 0.14), height, borderRadius: 999, position: "relative", overflow: "hidden" }}>
      <div style={{
        width: `${Math.max(value, 3)}%`, height: "100%", borderRadius: 999,
        background: `linear-gradient(90deg, ${withAlpha(c, 0.75)}, ${c})`,
        transition: "width 400ms ease",
      }} />
    </div>
  );
}

function Meter({ label, value, icon: Icon }) {
  const r = readinessOf(value);
  return (
    <div className="py-3.5" style={{ borderBottom: `1px solid ${LINE}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm flex items-center gap-2" style={{ color: INK, fontWeight: 500 }}>
          {Icon && <Icon size={15} color={r.color} />} {label}
        </span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: r.color }}>
          {value}% <span style={{ color: SLATE, fontWeight: 400 }}>· {r.label}</span>
        </span>
      </div>
      <GradientBar value={value} color={r.color} />
    </div>
  );
}

function Pill({ children, color = SLATE, icon: Icon }) {
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1"
      style={{ background: withAlpha(color, 0.14), color }}>
      {Icon && <Icon size={11} />} {children}
    </span>
  );
}

function Card({ children, className = "", style, accent }) {
  return (
    <div className={`bg-white ${className}`} style={{
      border: `1px solid ${LINE}`, borderRadius: 16,
      borderTop: accent ? `3px solid ${accent}` : undefined,
      boxShadow: "0 2px 10px rgba(79,70,229,0.05)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, right, icon: Icon, color = INDIGO }) {
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h2 style={{ ...heading, color: INK }} className="text-xl flex items-center gap-2">
        {Icon && (
          <span className="w-8 h-8 rounded-xl inline-flex items-center justify-center" style={{ background: withAlpha(color, 0.14) }}>
            <Icon size={16} color={color} />
          </span>
        )}
        {children}
      </h2>
      {right}
    </div>
  );
}

function AddButton({ label = "Add", onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full text-white transition-shadow hover:shadow-md"
      style={{ background: `linear-gradient(120deg, ${INDIGO}, ${VIOLET})` }}>
      <Plus size={13} /> {label}
    </button>
  );
}

function FieldLabel({ children }) {
  return <label className="text-xs block mb-1 font-medium" style={{ color: SLATE }}>{children}</label>;
}
function TextInput(props) {
  return <input {...props} className={`w-full px-3 py-2 text-sm rounded-lg outline-none ${props.className || ""}`}
    style={{ border: `1px solid ${LINE}`, ...props.style }} />;
}
function Select(props) {
  return <select {...props} className={`w-full px-3 py-2 text-sm rounded-lg bg-white outline-none ${props.className || ""}`}
    style={{ border: `1px solid ${LINE}`, ...props.style }} />;
}

// Inline "add" form panel — appears under the section title, not a modal,
// so it stays in the flow of the page the student is already on.
function AddPanel({ title, onCancel, onSubmit, submitLabel = "Save", children, disabled }) {
  return (
    <div className="mb-5 p-4 rounded-2xl" style={{ background: withAlpha(INDIGO, 0.05), border: `1.5px dashed ${withAlpha(INDIGO, 0.35)}` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: INK }}>{title}</span>
        <button onClick={onCancel} style={{ color: SLATE }}><X size={16} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
      <div className="flex justify-end mt-3">
        <button onClick={onSubmit} disabled={disabled}
          className="text-xs font-semibold px-4 py-2 rounded-full text-white disabled:opacity-40"
          style={{ background: `linear-gradient(120deg, ${INDIGO}, ${VIOLET})` }}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   NAV
--------------------------------------------------------------------- */
const STUDENT_NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: User },
  { id: "skills", label: "Skills", icon: Sparkles },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "certifications", label: "Certifications", icon: Award },
  { id: "projects", label: "Projects", icon: FolderGit2 },
  { id: "tests", label: "Skill Tests", icon: ClipboardCheck },
  { id: "resume", label: "Resume", icon: FileText },
  { id: "notifications", label: "Notifications", icon: Bell },
];
const ADMIN_NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "students", label: "Students", icon: Users },
  { id: "rankings", label: "Rankings", icon: Trophy },
  { id: "opportunities", label: "Opportunities", icon: Briefcase },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

/* ---------------------------------------------------------------------
   AUTH — a login/sign-up gate. Students authenticate with their college
   email and their date of birth as the password (matches the Personal
   Information model, where DOB is on file); the admin account uses the
   same email + DOB pattern for consistency in this demo.
--------------------------------------------------------------------- */
function AuthModal({ students, defaultStudent, backendOnline, onLogin, onSignup, onClose }) {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signupForm, setSignupForm] = useState({ name: "", email: "", dob: "", branch: BRANCHES[0], gradYear: "2028" });
  const [showDemo, setShowDemo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submitLogin(e) {
    e.preventDefault();
    setSubmitting(true);
    const err = await onLogin(email, password);
    setSubmitting(false);
    setError(err || "");
  }
  async function submitSignup(e) {
    e.preventDefault();
    setSubmitting(true);
    const err = await onSignup(signupForm);
    setSubmitting(false);
    setError(err || "");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(33,27,78,0.55)" }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden bg-white" style={{ boxShadow: "0 20px 60px rgba(33,27,78,0.35)" }}>
        <div className="relative px-7 pt-7 pb-8 text-white" style={{ background: `linear-gradient(120deg, ${INDIGO}, ${VIOLET})` }}>
          <button onClick={onClose} className="absolute right-4 top-4 opacity-80 hover:opacity-100"><X size={18} /></button>
          <div className="absolute -right-8 -top-10 w-32 h-32 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-10 h-10 rounded-2xl inline-flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
              <GraduationCap size={20} />
            </span>
            <span style={{ ...heading }} className="text-xl">TalentX</span>
          </div>
          <div className="text-sm opacity-90">Academic &amp; Placement Hub — sign in to continue</div>
          <div className="mt-3">
            {backendOnline === null && (
              <span className="text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.18)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#fff" }} /> Checking database connection…
              </span>
            )}
            {backendOnline === true && (
              <span className="text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.22)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#6EE7B7" }} /> Connected — accounts save to MongoDB
              </span>
            )}
            {backendOnline === false && (
              <span className="text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.22)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#FCD34D" }} /> No backend found — using local demo data
              </span>
            )}
          </div>
        </div>

        <div className="px-7 pt-5">
          <div className="flex rounded-full p-1 mb-5" style={{ background: withAlpha(INDIGO, 0.08) }}>
            {[["login", "Log in"], ["signup", "Sign up"]].map(([id, label]) => (
              <button key={id} onClick={() => { setTab(id); setError(""); }}
                className="flex-1 text-sm font-semibold py-2 rounded-full transition-colors"
                style={{ background: tab === id ? INDIGO : "transparent", color: tab === id ? "#fff" : SLATE }}>
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="text-xs font-medium px-3 py-2.5 rounded-xl mb-4" style={{ background: withAlpha(CORAL, 0.12), color: "#9F1239" }}>
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={submitLogin} className="space-y-3">
              <div>
                <FieldLabel>College email</FieldLabel>
                <div className="flex items-center gap-2 px-3 rounded-xl" style={{ border: `1px solid ${LINE}` }}>
                  <Mail size={14} color={SLATE} />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
                    placeholder="you@talentx.edu" className="w-full py-2.5 text-sm outline-none" />
                </div>
              </div>
              <div>
                <FieldLabel>Password (date of birth)</FieldLabel>
                <div className="flex items-center gap-2 px-3 rounded-xl" style={{ border: `1px solid ${LINE}` }}>
                  <Lock size={14} color={SLATE} />
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type="text" required
                    placeholder="YYYY-MM-DD" className="w-full py-2.5 text-sm outline-none" />
                </div>
                <div className="text-xs mt-1.5" style={{ color: SLATE }}>Your password is your date of birth on file, e.g. 2003-07-21.</div>
              </div>
              <button type="submit" disabled={submitting} className="w-full text-sm font-semibold py-2.5 rounded-full text-white mt-2 disabled:opacity-60"
                style={{ background: `linear-gradient(120deg, ${INDIGO}, ${VIOLET})` }}>
                {submitting ? "Signing in…" : "Log in"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitSignup} className="space-y-3">
              <div>
                <FieldLabel>Full name</FieldLabel>
                <TextInput value={signupForm.name} onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} placeholder="e.g. Rohan Sharma" required />
              </div>
              <div>
                <FieldLabel>College email</FieldLabel>
                <TextInput value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} type="email" placeholder="you@talentx.edu" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Date of birth</FieldLabel>
                  <TextInput value={signupForm.dob} onChange={(e) => setSignupForm({ ...signupForm, dob: e.target.value })} type="date" required />
                </div>
                <div>
                  <FieldLabel>Graduation year</FieldLabel>
                  <TextInput value={signupForm.gradYear} onChange={(e) => setSignupForm({ ...signupForm, gradYear: e.target.value })} />
                </div>
              </div>
              <div>
                <FieldLabel>Branch</FieldLabel>
                <Select value={signupForm.branch} onChange={(e) => setSignupForm({ ...signupForm, branch: e.target.value })}>
                  {BRANCHES.map((b) => <option key={b}>{b}</option>)}
                </Select>
              </div>
              <div className="text-xs" style={{ color: SLATE }}>This date of birth becomes your login password — remember it.</div>
              <button type="submit" disabled={submitting} className="w-full text-sm font-semibold py-2.5 rounded-full text-white mt-2 disabled:opacity-60"
                style={{ background: `linear-gradient(120deg, ${INDIGO}, ${VIOLET})` }}>
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}

          <div className="mt-4">
            <button onClick={() => setShowDemo((v) => !v)} className="text-xs font-semibold flex items-center gap-1" style={{ color: INDIGO }}>
              <ShieldCheck size={13} /> {showDemo ? "Hide" : "Show"} demo credentials
            </button>
            {showDemo && (
              <div className="mt-2 text-xs p-3 rounded-xl space-y-1" style={{ background: withAlpha(SKY, 0.08), color: INK }}>
                <div><strong>Admin</strong> — {ADMIN_ACCOUNT.email} / {ADMIN_ACCOUNT.dob}</div>
                <div><strong>Student</strong> — {defaultStudent.email} / {defaultStudent.dob}</div>
              </div>
            )}
          </div>

          <button onClick={onClose} className="w-full text-center text-xs font-medium py-4" style={{ color: SLATE }}>
            Skip for now — explore as guest
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   ROOT APP
--------------------------------------------------------------------- */
export default function App() {
  const [role, setRole] = useState("student");
  const [studentIdx, setStudentIdx] = useState(3);
  const [page, setPage] = useState("dashboard");
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [notifications, setNotifications] = useState(
    Object.fromEntries(INITIAL_STUDENTS.map((s) => [s.id, []]))
  );

  // session: null (logged out) | { type: "student", id } | { type: "admin" }
  // showAuth: whether the login/sign-up popup is on screen. It opens
  // automatically the moment the site loads, before any data is shown.
  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(true);
  const [authToken, setAuthToken] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null); // null = checking, true/false once known

  useEffect(() => {
    callApi("/health", { method: "GET" }, 1200).then((r) => setBackendOnline(r.reached && r.ok));
  }, []);

  // Once logged in as a student, the current profile is looked up by id
  // rather than array position — this stays correct whether the record
  // came from the local mock data or was just created via the real API.
  const student = session?.type === "student"
    ? (students.find((s) => s.id === session.id) || students[studentIdx])
    : students[studentIdx];
  const nav = role === "student" ? STUDENT_NAV : ADMIN_NAV;

  function switchRole(r) { setRole(r); setPage("dashboard"); }

  async function handleLogin(email, password) {
    const e = email.trim().toLowerCase();

    // Try the real MongoDB-backed API first.
    const api = await callApi("/auth/login", { method: "POST", body: JSON.stringify({ email: e, password }) });
    if (api.reached) {
      if (!api.ok) return api.message;
      setAuthToken(api.data.token);
      if (api.data.admin) {
        setSession({ type: "admin", backend: true });
        setRole("admin"); setPage("dashboard"); setShowAuth(false);
        return "";
      }
      const apiStudent = { ...api.data.student, id: api.data.student._id || api.data.student.id };
      setStudents((prev) => {
        const exists = prev.some((s) => s.id === apiStudent.id);
        return exists ? prev.map((s) => (s.id === apiStudent.id ? apiStudent : s)) : [...prev, apiStudent];
      });
      setSession({ type: "student", id: apiStudent.id, backend: true });
      setRole("student"); setPage("dashboard"); setShowAuth(false);
      return "";
    }

    // Backend not running — fall back to the in-browser demo data.
    if (e === ADMIN_ACCOUNT.email && password === ADMIN_ACCOUNT.dob) {
      setSession({ type: "admin" });
      setRole("admin");
      setPage("dashboard");
      setShowAuth(false);
      return "";
    }
    const idx = students.findIndex((s) => s.email.toLowerCase() === e && s.dob === password);
    if (idx === -1) return "We couldn't find an account matching that email and date of birth.";
    setSession({ type: "student", id: students[idx].id });
    setStudentIdx(idx);
    setRole("student");
    setPage("dashboard");
    setShowAuth(false);
    return "";
  }

  async function handleSignup(form) {
    if (!form.name.trim() || !form.email.trim() || !form.dob) {
      return "Please fill in your name, college email, and date of birth.";
    }
    const e = form.email.trim().toLowerCase();

    // Try the real MongoDB-backed API first — this is what actually
    // creates a persisted document you'll see appear in MongoDB Compass.
    const api = await callApi("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: form.name, email: e, dob: form.dob, branch: form.branch, gradYear: form.gradYear }),
    });
    if (api.reached) {
      if (!api.ok) return api.message;
      setAuthToken(api.data.token);
      const apiStudent = { ...api.data.student, id: api.data.student._id || api.data.student.id };
      setStudents((prev) => [...prev, apiStudent]);
      setNotifications((prev) => ({ ...prev, [apiStudent.id]: [] }));
      setSession({ type: "student", id: apiStudent.id, backend: true });
      setRole("student"); setPage("dashboard"); setShowAuth(false);
      return "";
    }

    // Backend not running — fall back to creating the account locally
    // so the demo still works without any setup.
    if (students.some((s) => s.email.toLowerCase() === e) || e === ADMIN_ACCOUNT.email) {
      return "An account with that college email already exists — try logging in instead.";
    }
    const newId = `S${2000 + students.length}`;
    const base = {
      id: newId, name: form.name.trim(), branch: form.branch, semester: 1,
      gradYear: Number(form.gradYear) || new Date().getFullYear() + 4, cgpa: 7.0,
      course: "B.Tech", skills: [], certifications: [], courses: [], projects: [],
      resumeUploaded: false, resumeVersion: 0,
      email: e, dob: form.dob,
    };
    setStudents((prev) => [...prev, deriveStudent(base)]);
    setNotifications((prev) => ({ ...prev, [newId]: [] }));
    setSession({ type: "student", id: newId });
    setRole("student");
    setPage("dashboard");
    setShowAuth(false);
    return "";
  }

  function handleLogout() {
    setSession(null);
    setAuthToken(null);
    setShowAuth(true);
    setRole("student");
    setPage("dashboard");
  }

  function notify(studentIds, notif) {
    setNotifications((prev) => {
      const next = { ...prev };
      studentIds.forEach((id) => {
        next[id] = [{ id: Date.now() + Math.random(), read: false, ...notif }, ...(next[id] || [])];
      });
      return next;
    });
  }

  // Central mutation point: every "Add" action on the student side runs
  // through here so the derived meters always stay in sync.
  function updateStudent(id, mutate) {
    setStudents((prev) => prev.map((s) => (s.id === id ? deriveStudent(mutate(s)) : s)));
  }

  const actions = {
    addSkill: (skillName) => updateStudent(student.id, (s) =>
      s.skills.some((sk) => sk.name === skillName) ? s :
        ({ ...s, skills: [...s.skills, { name: skillName, test: 0, course: 0, cert: 0, project: 0 }] })
    ),
    addCourse: (course, relatedSkill) => updateStudent(student.id, (s) => ({
      ...s,
      skills: relatedSkill ? s.skills.map((sk) => sk.name === relatedSkill ? { ...sk, course: Math.max(sk.course, 82) } : sk) : s.skills,
      courses: [course, ...s.courses],
    })),
    addCertification: (cert, relatedSkill) => updateStudent(student.id, (s) => ({
      ...s,
      skills: relatedSkill ? s.skills.map((sk) => sk.name === relatedSkill ? { ...sk, cert: Math.max(sk.cert, 85) } : sk) : s.skills,
      certifications: [cert, ...s.certifications],
    })),
    addProject: (project, relatedSkill) => updateStudent(student.id, (s) => ({
      ...s,
      skills: relatedSkill ? s.skills.map((sk) => sk.name === relatedSkill ? { ...sk, project: Math.max(sk.project, 78) } : sk) : s.skills,
      projects: [project, ...s.projects],
    })),
    uploadResume: () => updateStudent(student.id, (s) => ({ ...s, resumeUploaded: true, resumeVersion: (s.resumeVersion || 0) + 1 })),
  };

  return (
    <div style={{ background: CANVAS, minHeight: "100vh", color: INK }} className="flex text-[14px]">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`body { font-family: 'Inter', sans-serif; }`}</style>

      {showAuth && (
        <AuthModal students={students} defaultStudent={student} backendOnline={backendOnline}
          onLogin={handleLogin} onSignup={handleSignup} onClose={() => setShowAuth(false)} />
      )}

      {/* SIDEBAR */}
      <div className="w-64 shrink-0 flex flex-col text-white" style={{ background: `linear-gradient(190deg, ${INDIGO} 0%, ${VIOLET} 100%)` }}>
        <div className="px-5 py-6 flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-2xl inline-flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)" }}>
            <GraduationCap size={20} />
          </span>
          <div>
            <div style={{ ...heading }} className="text-lg leading-tight">TalentX</div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.75)" }}>Academic &amp; Placement Hub</div>
          </div>
        </div>

        <div className="px-4 mb-2">
          <div className="flex rounded-full p-1" style={{ background: "rgba(255,255,255,0.14)" }}>
            {["student", "admin"].map((r) => (
              <button key={r} onClick={() => switchRole(r)} className="flex-1 text-xs font-semibold py-1.5 capitalize rounded-full transition-colors"
                style={{ background: role === r ? "#fff" : "transparent", color: role === r ? INDIGO : "#fff" }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            const count = item.id === "notifications" ? (notifications[student.id] || []).filter(n => !n.read).length : 0;
            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm relative transition-colors"
                style={{ background: active ? "rgba(255,255,255,0.22)" : "transparent", fontWeight: active ? 700 : 500 }}>
                <Icon size={16} />
                {item.label}
                {count > 0 && <span className="ml-auto text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: CORAL, color: "#fff" }}>{count}</span>}
              </button>
            );
          })}
        </nav>

        {role === "student" && (
          <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.18)" }}>
            <label className="text-[11px]" style={{ color: "rgba(255,255,255,0.75)" }}>Viewing as</label>
            <select value={studentIdx} onChange={(e) => setStudentIdx(Number(e.target.value))}
              className="w-full mt-1 text-sm px-2.5 py-2 rounded-xl text-white"
              style={{ background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.25)" }}>
              {students.map((s, i) => <option key={s.id} value={i} style={{ color: INK }}>{s.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* MAIN */}
      <div className="flex-1 min-w-0">
        <div className="px-8 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${LINE}`, background: "#FFFFFF" }}>
          <div>
            <div className="text-xs font-medium" style={{ color: SLATE }}>
              {role === "student" ? student.course + " · " + student.branch : "Springfield Institute of Technology"}
            </div>
            <div style={{ ...heading }} className="text-xl">{role === "student" ? student.name : "College Admin Console"}</div>
          </div>
          {role === "student" ? (
            <div className="flex items-center gap-3">
              <Pill color={readinessOf(student.placementReadiness).color} icon={Zap}>{readinessOf(student.placementReadiness).label}</Pill>
              <span className="w-10 h-10 rounded-full inline-flex items-center justify-center text-white font-bold text-sm"
                style={{ background: `linear-gradient(135deg, ${INDIGO}, ${SKY})` }}>
                {student.name.split(" ").map((p) => p[0]).join("")}
              </span>
              {session ? (
                <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full"
                  style={{ border: `1px solid ${withAlpha(CORAL, 0.35)}`, color: CORAL }}>
                  <LogOut size={13} /> Log out
                </button>
              ) : (
                <button onClick={() => setShowAuth(true)} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full text-white"
                  style={{ background: `linear-gradient(120deg, ${INDIGO}, ${VIOLET})` }}>
                  <LogIn size={13} /> Log in
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Pill color={INDIGO} icon={Users}>{students.length} students</Pill>
              {session ? (
                <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full"
                  style={{ border: `1px solid ${withAlpha(CORAL, 0.35)}`, color: CORAL }}>
                  <LogOut size={13} /> Log out
                </button>
              ) : (
                <button onClick={() => setShowAuth(true)} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full text-white"
                  style={{ background: `linear-gradient(120deg, ${INDIGO}, ${VIOLET})` }}>
                  <LogIn size={13} /> Log in
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-8 py-6">
          {role === "student" ? (
            <StudentPages page={page} student={student} actions={actions}
              notifications={notifications[student.id] || []}
              onRead={() => setNotifications((p) => ({ ...p, [student.id]: p[student.id].map(n => ({ ...n, read: true })) }))} />
          ) : (
            <AdminPages page={page} setPage={setPage} students={students} onNotify={notify} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   STUDENT PAGES
--------------------------------------------------------------------- */
function StudentPages({ page, student, actions, notifications, onRead }) {
  if (page === "dashboard") return <StudentDashboard student={student} />;
  if (page === "profile") return <StudentProfile student={student} />;
  if (page === "skills") return <StudentSkills student={student} onAdd={actions.addSkill} />;
  if (page === "courses") return <StudentCourses student={student} onAdd={actions.addCourse} />;
  if (page === "certifications") return <StudentCertifications student={student} onAdd={actions.addCertification} />;
  if (page === "projects") return <StudentProjects student={student} onAdd={actions.addProject} />;
  if (page === "tests") return <StudentTests student={student} />;
  if (page === "resume") return <StudentResume student={student} onUpload={actions.uploadResume} />;
  if (page === "notifications") return <StudentNotifications notifications={notifications} onRead={onRead} />;
  return null;
}

function RecommendedActions({ student }) {
  const items = [];
  if (!student.resumeUploaded) items.push({ icon: FileText, color: CORAL, text: "Upload your resume to become visible in placement searches" });
  if (student.profileCompletion < 100) items.push({ icon: User, color: AMBER, text: "Complete remaining profile fields to raise your readiness score" });
  const weakest = [...student.skills].sort((a, b) => a.score - b.score)[0];
  if (weakest) items.push({ icon: ClipboardCheck, color: SKY, text: `Take the ${weakest.name} skill test — it's pulling your average down` });
  if (student.certifications.length < 2) items.push({ icon: Award, color: VIOLET, text: "Add a recent certification to strengthen your skill evidence" });
  if (items.length === 0) items.push({ icon: Trophy, color: TEAL, text: "Your profile is in strong shape — check Opportunities for new drives soon" });
  return (
    <Card className="p-5" accent={AMBER}>
      <SectionTitle icon={Zap} color={AMBER}>Recommended next steps</SectionTitle>
      <ul className="space-y-3">
        {items.map((a, i) => {
          const Icon = a.icon;
          return (
            <li key={i} className="flex gap-3 text-sm items-start">
              <span className="w-6 h-6 rounded-full shrink-0 inline-flex items-center justify-center mt-0.5" style={{ background: withAlpha(a.color, 0.15) }}>
                <Icon size={12} color={a.color} />
              </span>
              <span style={{ color: INK }}>{a.text}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ReadinessRing({ value, color }) {
  const r = 54, c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="12" />
        <circle cx="66" cy="66" r={r} fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 66 66)" style={{ transition: "stroke-dashoffset 500ms ease" }} />
      </svg>
      <div className="absolute text-center text-white">
        <div style={{ ...heading }} className="text-3xl leading-none">{value}%</div>
        <div className="text-[11px] mt-1 opacity-90">ready</div>
      </div>
    </div>
  );
}

function StudentDashboard({ student }) {
  const r = readinessOf(student.placementReadiness);
  const skillChart = student.skills.map((s) => ({ name: s.name, score: s.score, fill: skillColor(s.name) }));

  const stats = [
    { label: "CGPA", value: student.cgpa, icon: TrendingUp, color: INDIGO },
    { label: "Skills tracked", value: student.skills.length, icon: Sparkles, color: VIOLET },
    { label: "Certifications", value: student.certifications.length, icon: Award, color: AMBER },
    { label: "Courses done", value: student.courses.filter(c => c.status === "Completed").length, icon: BookOpen, color: SKY },
    { label: "Projects", value: student.projects.length, icon: FolderGit2, color: TEAL },
    { label: "Resume", value: student.resumeUploaded ? "Uploaded" : "Missing", icon: FileText, color: student.resumeUploaded ? TEAL : CORAL },
  ];

  return (
    <div className="space-y-5">
      {/* HERO */}
      <div className="rounded-3xl p-7 flex items-center justify-between relative overflow-hidden"
        style={{ background: `linear-gradient(120deg, ${INDIGO}, ${VIOLET})` }}>
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="absolute right-16 bottom-[-40px] w-32 h-32 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="relative z-10 text-white max-w-md">
          <div className="text-xs font-semibold tracking-wide uppercase opacity-80 mb-1">Placement readiness</div>
          <div style={{ ...heading }} className="text-2xl mb-2">{r.label === "Highly Ready" || r.label === "Placement Ready" ? "You're in great shape!" : "Keep building your profile"}</div>
          <p className="text-sm opacity-90">
            Your readiness blends skill score, CGPA, test performance and profile completeness — the same formula the placement team searches against.
          </p>
        </div>
        <div className="relative z-10"><ReadinessRing value={student.placementReadiness} /></div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <span className="w-9 h-9 rounded-xl inline-flex items-center justify-center mb-2" style={{ background: withAlpha(s.color, 0.14) }}>
                <Icon size={16} color={s.color} />
              </span>
              <div style={{ ...heading }} className="text-lg">{s.value}</div>
              <div className="text-xs" style={{ color: SLATE }}>{s.label}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <Card className="p-5" accent={INDIGO}>
            <SectionTitle icon={Target} color={INDIGO}>Readiness overview</SectionTitle>
            <Meter label="Overall skill score" value={student.overallSkillScore} icon={Sparkles} />
            <Meter label="Profile completion" value={student.profileCompletion} icon={User} />
            <Meter label="Test performance (avg)" value={student.testAvg} icon={ClipboardCheck} />
          </Card>

          <Card className="p-5" accent={VIOLET}>
            <SectionTitle icon={BarChart3} color={VIOLET}>Skill distribution</SectionTitle>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillChart} margin={{ left: -20 }}>
                  <CartesianGrid stroke={LINE} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: SLATE }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: SLATE }} domain={[0, 100]} />
                  <Tooltip cursor={{ fill: withAlpha(INDIGO, 0.06) }} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {skillChart.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <RecommendedActions student={student} />
      </div>
    </div>
  );
}

function StudentProfile({ student }) {
  const rows = [
    ["Full name", student.name], ["Roll number", student.id],
    ["Course", student.course], ["Branch", student.branch],
    ["Semester", student.semester], ["Graduation year", student.gradYear],
    ["CGPA", student.cgpa], ["Profile completion", student.profileCompletion + "%"],
  ];
  return (
    <Card className="p-6 max-w-2xl" accent={INDIGO}>
      <SectionTitle icon={User} color={INDIGO}>Personal &amp; academic information</SectionTitle>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        {rows.map(([label, val]) => (
          <div key={label}>
            <div className="text-xs font-medium" style={{ color: SLATE }}>{label}</div>
            <div className="text-sm mt-0.5 font-semibold" style={{ color: INK }}>{val}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-xs px-3 py-2.5 rounded-xl" style={{ background: withAlpha(AMBER, 0.1), color: "#92620A" }}>
        Editing is enabled only for your own record. Academic-office fields (CGPA, enrollment number) require admin verification before changes take effect.
      </div>
    </Card>
  );
}

/* ---- Skills, with Add ---- */
function StudentSkills({ student, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState("");
  const available = ALL_SKILLS.filter((s) => !student.skills.some((sk) => sk.name === s));

  function submit() {
    if (!pick) return;
    onAdd(pick);
    setPick(""); setAdding(false);
  }

  return (
    <Card className="p-5" accent={VIOLET}>
      <SectionTitle icon={Sparkles} color={VIOLET} right={
        <div className="flex items-center gap-3">
          <span className="text-xs hidden md:inline" style={{ color: SLATE }}>40% test · 25% course · 20% cert · 15% project</span>
          <AddButton label="Add skill" onClick={() => setAdding(true)} />
        </div>
      }>
        Skill progress
      </SectionTitle>

      {adding && (
        <AddPanel title="Add a new skill" onCancel={() => setAdding(false)} onSubmit={submit} disabled={!pick}>
          <div className="col-span-2">
            <FieldLabel>Skill</FieldLabel>
            <Select value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Select a skill…</option>
              {available.map((s) => <option key={s}>{s}</option>)}
            </Select>
            <div className="text-xs mt-2" style={{ color: SLATE }}>
              New skills start at 0% — they only rise once backed by a skill test, a completed course, a certification, or a project. Self-reporting alone never sets your score.
            </div>
          </div>
        </AddPanel>
      )}

      <div className="space-y-1">
        {student.skills.length === 0 && <div className="text-sm py-8 text-center" style={{ color: SLATE }}>No skills added yet.</div>}
        {student.skills.map((s) => {
          const c = skillColor(s.name);
          return (
            <div key={s.name} className="py-3.5" style={{ borderBottom: `1px solid ${LINE}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                  <span style={{ fontWeight: 500 }}>{s.name}</span>
                  <Pill color={levelColor(s.level)}>{s.level}</Pill>
                </span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: c }}>{s.score}%</span>
              </div>
              <GradientBar value={s.score} color={c} />
              <div className="flex gap-4 mt-1.5 text-xs" style={{ color: SLATE }}>
                <span>Test {s.test}</span><span>Course {s.course}</span>
                <span>Cert {s.cert || "—"}</span><span>Project {s.project || "—"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---- Courses, with Add ---- */
function StudentCourses({ student, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", provider: "", status: "In Progress", relatedSkill: "" });

  function submit() {
    if (!form.name.trim()) return;
    onAdd({ name: form.name, provider: form.provider || "Self-paced", status: form.status }, form.relatedSkill);
    setForm({ name: "", provider: "", status: "In Progress", relatedSkill: "" });
    setAdding(false);
  }

  return (
    <Card className="p-5" accent={SKY}>
      <SectionTitle icon={BookOpen} color={SKY} right={<AddButton label="Add course" onClick={() => setAdding(true)} />}>Courses</SectionTitle>

      {adding && (
        <AddPanel title="Add a completed or in-progress course" onCancel={() => setAdding(false)} onSubmit={submit} disabled={!form.name.trim()}>
          <div>
            <FieldLabel>Course name</FieldLabel>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Full Stack Web Development" />
          </div>
          <div>
            <FieldLabel>Provider</FieldLabel>
            <TextInput value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Coursera" />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>In Progress</option><option>Completed</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Counts toward skill (optional)</FieldLabel>
            <Select value={form.relatedSkill} onChange={(e) => setForm({ ...form, relatedSkill: e.target.value })}>
              <option value="">None</option>
              {student.skills.map((s) => <option key={s.name}>{s.name}</option>)}
            </Select>
          </div>
        </AddPanel>
      )}

      {student.courses.length === 0 ? (
        <div className="text-sm py-8 text-center" style={{ color: SLATE }}>No courses added yet.</div>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {student.courses.map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${LINE}` }}>
                <td className="py-3 pr-4 font-medium">{r.name}</td>
                <td className="py-3 pr-4" style={{ color: SLATE }}>{r.provider}</td>
                <td className="py-3 pr-4"><Pill color={r.status === "Completed" ? TEAL : AMBER}>{r.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

/* ---- Certifications, with Add ---- */
function StudentCertifications({ student, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", org: "", domain: CERT_DOMAINS[0], relatedSkill: "", file: "" });

  function submit() {
    if (!form.name.trim()) return;
    onAdd({
      name: form.name, org: form.org || "—", domain: form.domain,
      issueDate: new Date().toISOString().slice(0, 10),
      file: form.file || null,
    }, form.relatedSkill);
    setForm({ name: "", org: "", domain: CERT_DOMAINS[0], relatedSkill: "", file: "" });
    setAdding(false);
  }

  return (
    <Card className="p-5" accent={AMBER}>
      <SectionTitle icon={Award} color={AMBER} right={<AddButton label="Upload certificate" onClick={() => setAdding(true)} />}>Certifications</SectionTitle>

      {adding && (
        <AddPanel title="Add a certification" onCancel={() => setAdding(false)} onSubmit={submit} disabled={!form.name.trim()} submitLabel="Save certification">
          <div>
            <FieldLabel>Certification name</FieldLabel>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. AWS Cloud Practitioner" />
          </div>
          <div>
            <FieldLabel>Issuing organization</FieldLabel>
            <TextInput value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} placeholder="e.g. Amazon Web Services" />
          </div>
          <div>
            <FieldLabel>Related domain</FieldLabel>
            <Select value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })}>
              {CERT_DOMAINS.map((d) => <option key={d}>{d}</option>)}
            </Select>
          </div>
          <div>
            <FieldLabel>Counts toward skill (optional)</FieldLabel>
            <Select value={form.relatedSkill} onChange={(e) => setForm({ ...form, relatedSkill: e.target.value })}>
              <option value="">None</option>
              {student.skills.map((s) => <option key={s.name}>{s.name}</option>)}
            </Select>
          </div>
          <div className="col-span-2">
            <FieldLabel>Certificate file</FieldLabel>
            <button type="button" onClick={() => setForm({ ...form, file: "certificate.pdf" })}
              className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl w-full justify-center font-medium"
              style={{ border: `1.5px dashed ${withAlpha(AMBER, 0.5)}`, color: "#92620A", background: withAlpha(AMBER, 0.06) }}>
              <Upload size={13} /> {form.file ? form.file + " selected" : "Choose file to attach (PDF, JPG, PNG)"}
            </button>
          </div>
        </AddPanel>
      )}

      {student.certifications.length === 0 ? (
        <div className="text-sm py-8 text-center" style={{ color: SLATE }}>No certifications added yet.</div>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {student.certifications.map((c, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${LINE}` }}>
                <td className="py-3 pr-4 font-medium">{c.name}</td>
                <td className="py-3 pr-4" style={{ color: SLATE }}>{c.org}</td>
                <td className="py-3 pr-4"><Pill color={DOMAIN_COLORS[c.domain] || SLATE}>{c.domain}</Pill></td>
                <td className="py-3 pr-4" style={{ color: SLATE }}>{c.issueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

/* ---- Projects, with Add ---- */
function StudentProjects({ student, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", tech: "", github: "", relatedSkill: "" });

  function submit() {
    if (!form.name.trim()) return;
    onAdd({ name: form.name, tech: form.tech || "—", github: form.github || "" }, form.relatedSkill);
    setForm({ name: "", tech: "", github: "", relatedSkill: "" });
    setAdding(false);
  }

  return (
    <Card className="p-5" accent={TEAL}>
      <SectionTitle icon={FolderGit2} color={TEAL} right={<AddButton label="Add project" onClick={() => setAdding(true)} />}>Projects</SectionTitle>

      {adding && (
        <AddPanel title="Add a new project" onCancel={() => setAdding(false)} onSubmit={submit} disabled={!form.name.trim()}>
          <div>
            <FieldLabel>Project name</FieldLabel>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Campus Marketplace App" />
          </div>
          <div>
            <FieldLabel>Technologies used</FieldLabel>
            <TextInput value={form.tech} onChange={(e) => setForm({ ...form, tech: e.target.value })} placeholder="e.g. React, Node.js, MongoDB" />
          </div>
          <div>
            <FieldLabel>GitHub URL (optional)</FieldLabel>
            <TextInput value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} placeholder="https://github.com/…" />
          </div>
          <div>
            <FieldLabel>Counts toward skill (optional)</FieldLabel>
            <Select value={form.relatedSkill} onChange={(e) => setForm({ ...form, relatedSkill: e.target.value })}>
              <option value="">None</option>
              {student.skills.map((s) => <option key={s.name}>{s.name}</option>)}
            </Select>
          </div>
        </AddPanel>
      )}

      {student.projects.length === 0 ? (
        <div className="text-sm py-8 text-center" style={{ color: SLATE }}>No projects added yet.</div>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {student.projects.map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${LINE}` }}>
                <td className="py-3 pr-4 font-medium">{r.name}</td>
                <td className="py-3 pr-4" style={{ color: SLATE }}>{r.tech}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function StudentTests({ student }) {
  return (
    <Card className="p-5" accent={SKY}>
      <SectionTitle icon={ClipboardCheck} color={SKY}>Skill tests</SectionTitle>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs" style={{ color: SLATE }}>
            <th className="pb-2 font-medium">Domain</th>
            <th className="pb-2 font-medium">Best score</th>
            <th className="pb-2 font-medium">Contribution</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {student.skills.map((s) => (
            <tr key={s.name} style={{ borderTop: `1px solid ${LINE}` }}>
              <td className="py-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: skillColor(s.name) }} />{s.name}</td>
              <td className="py-3 tabular-nums font-semibold">{s.test}%</td>
              <td className="py-3" style={{ color: SLATE }}>40% weight</td>
              <td className="py-3 text-right">
                <button className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ border: `1px solid ${withAlpha(SKY, 0.4)}`, color: SKY }}>Retake test</button>
              </td>
            </tr>
          ))}
          {student.skills.length === 0 && (
            <tr><td colSpan={4} className="text-center py-8" style={{ color: SLATE }}>Add a skill first to unlock its test.</td></tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

function StudentResume({ student, onUpload }) {
  const [justUploaded, setJustUploaded] = useState(false);
  function handleUpload() {
    onUpload();
    setJustUploaded(true);
    setTimeout(() => setJustUploaded(false), 2000);
  }
  return (
    <Card className="p-6 max-w-lg" accent={CORAL}>
      <SectionTitle icon={FileText} color={CORAL}>Resume</SectionTitle>
      {student.resumeUploaded ? (
        <div>
          <div className="flex items-center gap-2 text-sm mb-3 font-medium">
            <span className="w-8 h-8 rounded-lg inline-flex items-center justify-center" style={{ background: withAlpha(TEAL, 0.14) }}>
              <FileText size={14} color={TEAL} />
            </span>
            resume_{student.id}_v{student.resumeVersion}.pdf
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleUpload} className="text-xs font-semibold px-4 py-2 rounded-full text-white"
              style={{ background: `linear-gradient(120deg, ${INDIGO}, ${VIOLET})` }}>Replace</button>
            <button className="text-xs font-semibold px-4 py-2 rounded-full" style={{ border: `1px solid ${LINE}` }}>Download</button>
            {justUploaded && <Pill color={TEAL} icon={CheckCircle2}>Uploaded v{student.resumeVersion}</Pill>}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-sm mb-3" style={{ color: SLATE }}>No resume on file. Admins can't share your profile for opportunities until one is uploaded.</div>
          <button onClick={handleUpload} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full text-white"
            style={{ background: `linear-gradient(120deg, ${INDIGO}, ${VIOLET})` }}>
            <Upload size={13} /> Upload resume (PDF)
          </button>
        </div>
      )}
    </Card>
  );
}

function StudentNotifications({ notifications, onRead }) {
  return (
    <Card className="p-5 max-w-2xl" accent={CORAL}>
      <SectionTitle icon={Bell} color={CORAL} right={notifications.length > 0 && (<button onClick={onRead} className="text-xs font-semibold" style={{ color: SLATE }}>Mark all read</button>)}>
        Notifications
      </SectionTitle>
      {notifications.length === 0 ? (
        <div className="text-sm py-8 text-center" style={{ color: SLATE }}>No notifications yet. Placement announcements and admin messages will appear here.</div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className="p-3.5 rounded-xl" style={{ background: n.read ? "#FAFAFC" : withAlpha(AMBER, 0.08), border: `1px solid ${LINE}` }}>
              <div className="mb-1"><Pill color={AMBER} icon={Bell}>{n.type}</Pill></div>
              <div className="text-sm font-semibold">{n.title}</div>
              <div className="text-sm mt-0.5" style={{ color: SLATE }}>{n.body}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------------
   ADMIN PAGES
--------------------------------------------------------------------- */
function AdminPages({ page, setPage, students, onNotify }) {
  const [selectedStudent, setSelectedStudent] = useState(null);

  if (page === "dashboard") return <AdminDashboard students={students} />;
  if (page === "students") return selectedStudent
    ? <AdminStudentDetail student={selectedStudent} onBack={() => setSelectedStudent(null)} onNotify={onNotify} />
    : <AdminStudents students={students} onOpen={setSelectedStudent} />;
  if (page === "rankings") return <AdminRankings students={students} onOpen={(s) => { setSelectedStudent(s); setPage("students"); }} />;
  if (page === "opportunities") return <AdminOpportunities students={students} onNotify={onNotify} />;
  if (page === "analytics") return <AdminAnalytics students={students} />;
  return null;
}

function StatCard({ label, value, sub, icon: Icon, color = INDIGO }) {
  return (
    <Card className="p-4" accent={color}>
      <span className="w-9 h-9 rounded-xl inline-flex items-center justify-center mb-2" style={{ background: withAlpha(color, 0.14) }}>
        <Icon size={16} color={color} />
      </span>
      <div style={{ ...heading }} className="text-2xl">{value}</div>
      <div className="text-xs font-medium" style={{ color: SLATE }}>{label}</div>
      {sub && <div className="text-xs mt-1" style={{ color }}>{sub}</div>}
    </Card>
  );
}

function AdminDashboard({ students }) {
  const total = students.length;
  const ready = students.filter((s) => s.placementReadiness >= 75).length;
  const avgCgpa = (students.reduce((a, s) => a + s.cgpa, 0) / total).toFixed(2);
  const avgSkill = Math.round(students.reduce((a, s) => a + s.overallSkillScore, 0) / total);
  const branchData = BRANCHES.map((b) => ({ name: b.split(" ")[0], count: students.filter((s) => s.branch === b).length }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total students" value={total} icon={Users} color={INDIGO} />
        <StatCard label="Placement ready" value={ready} sub={`${Math.round(ready / total * 100)}% of cohort`} icon={Trophy} color={TEAL} />
        <StatCard label="Average CGPA" value={avgCgpa} icon={TrendingUp} color={SKY} />
        <StatCard label="Average skill score" value={avgSkill + "%"} icon={Sparkles} color={VIOLET} />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5" accent={INDIGO}>
          <SectionTitle icon={BarChart3} color={INDIGO}>Students by branch</SectionTitle>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData}>
                <CartesianGrid stroke={LINE} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: SLATE }} />
                <YAxis tick={{ fontSize: 11, fill: SLATE }} />
                <Tooltip cursor={{ fill: withAlpha(INDIGO, 0.06) }} />
                <Bar dataKey="count" fill={INDIGO} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5" accent={AMBER}>
          <SectionTitle icon={Rocket} color={AMBER}>Quick find</SectionTitle>
          <p className="text-sm mb-3" style={{ color: SLATE }}>
            Go from "we need Java developers with CGPA above 7.5" to a ranked shortlist in the Students tab.
          </p>
          <div className="text-sm space-y-2">
            {Object.keys(DOMAINS).map((d) => {
              const top = [...students].sort((a, b) => b.domainScores[d] - a.domainScores[d])[0];
              return (
                <div key={d} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: withAlpha(DOMAIN_COLORS[d], 0.06) }}>
                  <span className="flex items-center gap-2 font-medium"><span className="w-2 h-2 rounded-full" style={{ background: DOMAIN_COLORS[d] }} />{d}</span>
                  <span style={{ color: SLATE }}>top: <strong style={{ color: INK }}>{top.name}</strong> · {top.domainScores[d]}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AdminStudents({ students, onOpen }) {
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [minCgpa, setMinCgpa] = useState("");
  const [skill, setSkill] = useState("");
  const [minSkillScore, setMinSkillScore] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [sortKey, setSortKey] = useState("placementReadiness");
  const [sortDir, setSortDir] = useState("desc");
  const [pageNum, setPageNum] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    let list = students.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q.toLowerCase()) && !s.id.toLowerCase().includes(q.toLowerCase())) return false;
      if (branch && s.branch !== branch) return false;
      if (minCgpa && s.cgpa < Number(minCgpa)) return false;
      if (gradYear && String(s.gradYear) !== gradYear) return false;
      if (skill) {
        const rec = s.skills.find((sk) => sk.name === skill);
        if (!rec) return false;
        if (minSkillScore && rec.score < Number(minSkillScore)) return false;
      }
      return true;
    });
    list.sort((a, b) => (sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
    return list;
  }, [students, q, branch, minCgpa, skill, minSkillScore, gradYear, sortKey, sortDir]);

  const paged = filtered.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  function toggleSort(key) {
    if (sortKey === key) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const statusColor = (st) => st === "Placement Ready" ? TEAL : st === "Profile Incomplete" ? CORAL : SKY;
  const cols = [["name", "Student"], ["branch", "Branch"], ["cgpa", "CGPA"],
  ["overallSkillScore", "Skill score"], ["testAvg", "Test score"],
  ["placementReadiness", "Readiness"], ["status", "Status"]];

  return (
    <div className="space-y-4">
      <Card className="p-4" accent={INDIGO}>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-2 flex items-center gap-2 px-3 rounded-xl" style={{ border: `1px solid ${LINE}` }}>
            <Search size={14} color={SLATE} />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPageNum(1); }} placeholder="Search name or roll no."
              className="w-full py-2 text-sm outline-none" />
          </div>
          <select value={branch} onChange={(e) => { setBranch(e.target.value); setPageNum(1); }} className="text-sm px-2 py-2 rounded-xl" style={{ border: `1px solid ${LINE}` }}>
            <option value="">All branches</option>
            {BRANCHES.map((b) => <option key={b}>{b}</option>)}
          </select>
          <input value={minCgpa} onChange={(e) => { setMinCgpa(e.target.value); setPageNum(1); }} placeholder="Min CGPA" type="number" step="0.1"
            className="text-sm px-3 py-2 rounded-xl" style={{ border: `1px solid ${LINE}` }} />
          <select value={skill} onChange={(e) => { setSkill(e.target.value); setPageNum(1); }} className="text-sm px-2 py-2 rounded-xl" style={{ border: `1px solid ${LINE}` }}>
            <option value="">Any skill</option>
            {ALL_SKILLS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input value={gradYear} onChange={(e) => { setGradYear(e.target.value); setPageNum(1); }} placeholder="Grad. year"
            className="text-sm px-3 py-2 rounded-xl" style={{ border: `1px solid ${LINE}` }} />
        </div>
        {skill && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: SLATE }}>Minimum {skill} score</span>
            <input value={minSkillScore} onChange={(e) => setMinSkillScore(e.target.value)} type="number" placeholder="e.g. 70"
              className="text-sm px-3 py-1.5 rounded-xl w-24" style={{ border: `1px solid ${LINE}` }} />
          </div>
        )}
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: withAlpha(INDIGO, 0.05) }}>
              {cols.map(([key, label]) => (
                <th key={key} onClick={() => toggleSort(key)} className="text-left px-4 py-3 cursor-pointer select-none font-semibold text-xs" style={{ color: INDIGO }}>
                  <span className="flex items-center gap-1">{label}{sortKey === key && (sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}</span>
                </th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((s) => (
              <tr key={s.id} style={{ borderTop: `1px solid ${LINE}` }}>
                <td className="px-4 py-3 font-medium">{s.name}<div className="text-xs font-normal" style={{ color: SLATE }}>{s.id}</div></td>
                <td className="px-4 py-3" style={{ color: SLATE }}>{s.branch}</td>
                <td className="px-4 py-3 tabular-nums">{s.cgpa}</td>
                <td className="px-4 py-3 tabular-nums font-semibold">{s.overallSkillScore}%</td>
                <td className="px-4 py-3 tabular-nums">{s.testAvg}%</td>
                <td className="px-4 py-3"><Pill color={readinessOf(s.placementReadiness).color}>{s.placementReadiness}%</Pill></td>
                <td className="px-4 py-3"><Pill color={statusColor(s.status)}>{s.status}</Pill></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onOpen(s)} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ border: `1px solid ${withAlpha(INDIGO, 0.3)}`, color: INDIGO }}>View</button>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (<tr><td colSpan={8} className="text-center py-8 text-sm" style={{ color: SLATE }}>No students match these filters.</td></tr>)}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 text-xs" style={{ borderTop: `1px solid ${LINE}`, color: SLATE }}>
          <span>{filtered.length} student{filtered.length !== 1 ? "s" : ""} matched</span>
          <div className="flex items-center gap-3">
            <button disabled={pageNum <= 1} onClick={() => setPageNum((p) => p - 1)} className="disabled:opacity-30 font-medium">Prev</button>
            <span>Page {pageNum} of {totalPages}</span>
            <button disabled={pageNum >= totalPages} onClick={() => setPageNum((p) => p + 1)} className="disabled:opacity-30 font-medium">Next</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AdminStudentDetail({ student, onBack, onNotify }) {
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div className="max-w-3xl space-y-5">
      <button onClick={onBack} className="text-xs font-semibold" style={{ color: INDIGO }}>&larr; Back to students</button>
      <Card className="p-6" accent={INDIGO}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <div style={{ ...heading }} className="text-xl">{student.name}</div>
            <div className="text-xs" style={{ color: SLATE }}>{student.id} · {student.course} · {student.branch} · Sem {student.semester}</div>
          </div>
          <Pill color={readinessOf(student.placementReadiness).color} icon={Zap}>{readinessOf(student.placementReadiness).label}</Pill>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[["CGPA", student.cgpa, INDIGO], ["Skill score", student.overallSkillScore + "%", VIOLET],
          ["Test avg", student.testAvg + "%", SKY], ["Readiness", student.placementReadiness + "%", TEAL]].map(([k, v, c]) => (
            <div key={k} className="p-3 rounded-xl" style={{ background: withAlpha(c, 0.08) }}>
              <div className="text-xs font-medium" style={{ color: SLATE }}>{k}</div>
              <div style={{ ...heading, color: c }} className="text-lg">{v}</div>
            </div>
          ))}
        </div>
        <div className="text-sm font-semibold mb-2">Skills</div>
        <div className="space-y-2.5 mb-5">
          {student.skills.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <span className="w-28 text-xs font-medium truncate" style={{ color: SLATE }}>{s.name}</span>
              <div className="flex-1"><GradientBar value={s.score} height={7} color={skillColor(s.name)} /></div>
              <span className="w-10 text-xs tabular-nums text-right font-semibold">{s.score}%</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="font-semibold mb-1.5">Certifications ({student.certifications.length})</div>
            {student.certifications.map((c, i) => <div key={i} style={{ color: SLATE }}>{c.name} · {c.org}</div>)}
          </div>
          <div>
            <div className="font-semibold mb-1.5">Resume</div>
            <Pill color={student.resumeUploaded ? TEAL : CORAL}>{student.resumeUploaded ? "Available for download" : "Not yet uploaded"}</Pill>
          </div>
        </div>
      </Card>

      <Card className="p-5" accent={AMBER}>
        <SectionTitle icon={Mail} color={AMBER}>Send a message</SectionTitle>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} placeholder="e.g. You've been shortlisted for the ABC Technologies internship drive — please confirm availability."
          className="w-full text-sm p-3 rounded-xl outline-none" style={{ border: `1px solid ${LINE}` }} />
        <div className="flex items-center justify-between mt-2">
          <button onClick={() => { if (msg.trim()) { onNotify([student.id], { type: "Admin message", title: "New message from admin", body: msg }); setMsg(""); setSent(true); setTimeout(() => setSent(false), 2000); } }}
            className="text-xs font-semibold px-4 py-2 rounded-full text-white" style={{ background: `linear-gradient(120deg, ${INDIGO}, ${VIOLET})` }}>Send message</button>
          {sent && <Pill color={TEAL} icon={CheckCircle2}>Sent — appears in their notifications</Pill>}
        </div>
      </Card>
    </div>
  );
}

function AdminRankings({ students, onOpen }) {
  const [domain, setDomain] = useState("Software Development");
  const ranked = [...students].sort((a, b) => b.domainScores[domain] - a.domainScores[domain]).slice(0, 10);
  const medalColor = (i) => i === 0 ? AMBER : i === 1 ? SLATE : i === 2 ? "#B45309" : LINE;

  return (
    <Card className="p-5" accent={DOMAIN_COLORS[domain]}>
      <SectionTitle icon={Trophy} color={DOMAIN_COLORS[domain]} right={
        <select value={domain} onChange={(e) => setDomain(e.target.value)} className="text-sm px-3 py-2 rounded-xl" style={{ border: `1px solid ${LINE}` }}>
          {Object.keys(DOMAINS).map((d) => <option key={d}>{d}</option>)}
        </select>
      }>Top students — {domain}</SectionTitle>
      <div className="text-xs mb-3" style={{ color: SLATE }}>Ranked by average score across: {DOMAINS[domain].join(", ")}</div>
      <table className="w-full text-sm">
        <tbody>
          {ranked.map((s, i) => (
            <tr key={s.id} style={{ borderTop: `1px solid ${LINE}` }}>
              <td className="py-3 pr-3 w-10">
                <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold text-white" style={{ background: medalColor(i) }}>{i + 1}</span>
              </td>
              <td className="py-3 font-medium">{s.name}</td>
              <td className="py-3" style={{ color: SLATE }}>{s.branch}</td>
              <td className="py-3 w-40"><GradientBar value={s.domainScores[domain]} height={7} color={DOMAIN_COLORS[domain]} /></td>
              <td className="py-3 tabular-nums w-12 text-right font-semibold" style={{ color: DOMAIN_COLORS[domain] }}>{s.domainScores[domain]}%</td>
              <td className="py-3 text-right w-16"><button onClick={() => onOpen(s)} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ border: `1px solid ${LINE}` }}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function AdminOpportunities({ students, onNotify }) {
  const [form, setForm] = useState({ title: "Software Developer Intern", company: "ABC Technologies", skills: ["Java", "DSA"], minCgpa: 7.5, branches: ["Computer Science"], gradYear: "2027" });
  const [sentTo, setSentTo] = useState(null);

  const results = useMemo(() => {
    const eligible = [], potential = [], notEligible = [];
    students.forEach((s) => {
      const cgpaOk = s.cgpa >= form.minCgpa;
      const branchOk = form.branches.length === 0 || form.branches.includes(s.branch);
      const gradOk = !form.gradYear || String(s.gradYear) === form.gradYear;
      const hasAllSkills = form.skills.every((sk) => s.skills.some((r) => r.name === sk));
      const skillScores = form.skills.map((sk) => s.skills.find((r) => r.name === sk)?.score ?? 0);
      const skillOk = hasAllSkills && skillScores.every((sc) => sc >= 60);
      if (cgpaOk && branchOk && gradOk && skillOk) eligible.push(s);
      else if ((cgpaOk || hasAllSkills) && branchOk) potential.push(s);
      else notEligible.push(s);
    });
    eligible.sort((a, b) => b.placementReadiness - a.placementReadiness);
    return { eligible, potential, notEligible };
  }, [students, form]);

  function toggleSkill(sk) { setForm((f) => ({ ...f, skills: f.skills.includes(sk) ? f.skills.filter((x) => x !== sk) : [...f.skills, sk] })); }
  function toggleBranch(b) { setForm((f) => ({ ...f, branches: f.branches.includes(b) ? f.branches.filter((x) => x !== b) : [...f.branches, b] })); }

  return (
    <div className="grid grid-cols-3 gap-5">
      <Card className="p-5 col-span-1 h-fit" accent={INDIGO}>
        <SectionTitle icon={Briefcase} color={INDIGO}>New opportunity</SectionTitle>
        <div className="space-y-3 text-sm">
          <div><FieldLabel>Company</FieldLabel>
            <TextInput value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div><FieldLabel>Position</FieldLabel>
            <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div>
            <FieldLabel>Required skills (≥60%)</FieldLabel>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {ALL_SKILLS.map((sk) => {
                const on = form.skills.includes(sk);
                const c = skillColor(sk);
                return (
                  <button key={sk} onClick={() => toggleSkill(sk)} className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: on ? c : withAlpha(c, 0.1), color: on ? "#fff" : c }}>{sk}</button>
                );
              })}
            </div>
          </div>
          <div><FieldLabel>Minimum CGPA</FieldLabel>
            <TextInput type="number" step="0.1" value={form.minCgpa} onChange={(e) => setForm({ ...form, minCgpa: Number(e.target.value) })} /></div>
          <div>
            <FieldLabel>Eligible branches</FieldLabel>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {BRANCHES.map((b) => (
                <button key={b} onClick={() => toggleBranch(b)} className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: form.branches.includes(b) ? INDIGO : withAlpha(INDIGO, 0.1), color: form.branches.includes(b) ? "#fff" : INDIGO }}>{b.split(" ")[0]}</button>
              ))}
            </div>
          </div>
          <div><FieldLabel>Graduation year</FieldLabel>
            <TextInput value={form.gradYear} onChange={(e) => setForm({ ...form, gradYear: e.target.value })} /></div>
        </div>
      </Card>

      <div className="col-span-2 space-y-4">
        <Card className="p-5" accent={VIOLET}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div style={{ ...heading }} className="text-lg">{form.title} · {form.company}</div>
            <button
              onClick={() => { onNotify(results.eligible.map((s) => s.id), { type: "Opportunity", title: `${form.company} — ${form.title}`, body: `You're eligible. Minimum CGPA ${form.minCgpa}, skills: ${form.skills.join(", ")}.` }); setSentTo(results.eligible.length); setTimeout(() => setSentTo(null), 2500); }}
              disabled={results.eligible.length === 0}
              className="text-xs font-semibold px-4 py-2 rounded-full text-white disabled:opacity-40" style={{ background: `linear-gradient(120deg, ${INDIGO}, ${VIOLET})` }}>
              Notify {results.eligible.length} eligible students
            </button>
          </div>
          {sentTo !== null && <div className="mb-3"><Pill color={TEAL} icon={CheckCircle2}>Notified {sentTo} students — check their Notifications tab</Pill></div>}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-2xl" style={{ background: withAlpha(TEAL, 0.1) }}>
              <div style={{ ...heading, color: TEAL }} className="text-3xl">{results.eligible.length}</div>
              <div className="text-xs font-medium" style={{ color: SLATE }}>Eligible</div>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: withAlpha(AMBER, 0.1) }}>
              <div style={{ ...heading, color: AMBER }} className="text-3xl">{results.potential.length}</div>
              <div className="text-xs font-medium" style={{ color: SLATE }}>Potentially eligible</div>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: withAlpha(SLATE, 0.1) }}>
              <div style={{ ...heading, color: SLATE }} className="text-3xl">{results.notEligible.length}</div>
              <div className="text-xs font-medium" style={{ color: SLATE }}>Not eligible</div>
            </div>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden" accent={TEAL}>
          <div className="px-5 py-3.5 text-sm font-semibold" style={{ borderBottom: `1px solid ${LINE}` }}>Eligible students, ranked by readiness</div>
          <table className="w-full text-sm">
            <tbody>
              {results.eligible.slice(0, 10).map((s) => (
                <tr key={s.id} style={{ borderTop: `1px solid ${LINE}` }}>
                  <td className="px-5 py-3 font-medium">{s.name}</td>
                  <td className="px-5 py-3" style={{ color: SLATE }}>{s.branch}</td>
                  <td className="px-5 py-3 tabular-nums">CGPA {s.cgpa}</td>
                  <td className="px-5 py-3"><Pill color={TEAL}>{s.placementReadiness}% ready</Pill></td>
                </tr>
              ))}
              {results.eligible.length === 0 && (<tr><td className="px-5 py-6 text-center" style={{ color: SLATE }} colSpan={4}>No students currently meet every criterion — try loosening a filter.</td></tr>)}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function AdminAnalytics({ students }) {
  const skillCounts = ALL_SKILLS.map((sk) => ({ name: sk, count: students.filter((s) => s.skills.some((r) => r.name === sk)).length, fill: skillColor(sk) })).sort((a, b) => b.count - a.count);
  const domainPie = Object.keys(DOMAINS).map((d) => ({ name: d, value: students.filter((s) => Object.entries(s.domainScores).sort((a, b) => b[1] - a[1])[0][0] === d).length, fill: DOMAIN_COLORS[d] }));

  return (
    <div className="grid grid-cols-2 gap-5">
      <Card className="p-5" accent={INDIGO}>
        <SectionTitle icon={BarChart3} color={INDIGO}>Most common skills</SectionTitle>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={skillCounts} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid stroke={LINE} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: SLATE }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: SLATE }} />
              <Tooltip cursor={{ fill: withAlpha(INDIGO, 0.06) }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {skillCounts.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-5" accent={VIOLET}>
        <SectionTitle icon={Target} color={VIOLET}>Students by strongest domain</SectionTitle>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={domainPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {domainPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {domainPie.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: SLATE }}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: d.fill }} /> {d.name}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
