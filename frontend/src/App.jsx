import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, Upload, FileText, CheckCircle, AlertCircle, Edit3,
  Download, Trash2, LogOut, Eye, EyeOff, ChevronRight,
  Database, Cpu, BarChart2, Clock, Search, X, Check,
  Zap, Lock, Globe, ArrowRight, Sparkles
} from 'lucide-react';
import DarkVeil from './DarkVeil';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── helpers ───────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('alumni_token');
const authHdr = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { headers: authHdr(), ...opts });
  // Prevent aggressive logout if the 401 came from an auth endpoint itself
  if (res.status === 401 && !path.includes('/auth/')) {
    localStorage.removeItem('alumni_token');
    window.location.reload();
  }
  return res;
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function Toast({ toasts, remove }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium backdrop-blur-xl border animate-slide-up
          ${t.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' :
            t.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300' :
              'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'}`}>
          {t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? <AlertCircle size={16} /> : <Zap size={16} />}
          <span>{t.message}</span>
          <button onClick={() => remove(t.id)} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

// ─── ConfidenceBadge ────────────────────────────────────────────────────────
function ConfidenceBadge({ value }) {
  if (!value || value === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">N/A</span>;
  const v = parseFloat(value);
  const cls = v >= 80 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : v >= 60 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      : 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>{v}%</span>;
}

// ─── Spinner ────────────────────────────────────────────────────────────────
function Spinner({ size = 20, className = '' }) {
  return (
    <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ─── Glass card wrapper ──────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HERO PAGE
// ═══════════════════════════════════════════════════════════════════════════
function HeroPage({ onEnter }) {
  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#020617]">
      {/* DarkVeil full-screen background */}
      <div className="absolute inset-0">
        <DarkVeil speed={0.4} hueShift={0} noiseIntensity={0.02} warpAmount={0.3} />
      </div>

      {/* Subtle dark gradient so edges are clean, DarkVeil shows in centre */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/50 via-transparent to-[#020617]/70" />
      <div className="absolute inset-0 bg-[#020617]/20" />

      {/* Glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Shield size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">AlumniTrust <span className="text-indigo-400">AI</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onEnter('login')}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
            Sign In
          </button>
          <button onClick={() => onEnter('register')}
            className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-20 pb-32">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-8">
          <Sparkles size={12} />
          Powered by Groq LPU · 5-second responses
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6 tracking-tight">
          HECVAT Automation<br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            for Almabase
          </span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
          Upload your Trust Center documents. Drop in a security questionnaire.<br />
          Get AI-generated answers with citations in seconds — not hours.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <button onClick={() => onEnter('register')}
            className="group flex items-center gap-2 px-8 py-4 text-base font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl transition-all shadow-2xl shadow-indigo-600/40 hover:shadow-indigo-500/50 hover:scale-105">
            Start Automating
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={() => onEnter('login')}
            className="px-8 py-4 text-base font-semibold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-2xl transition-all backdrop-blur-xl">
            Sign In
          </button>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            { icon: <Database size={20} />, title: 'Trust Center KB', desc: 'Upload your SOC2, FERPA, and policy docs as the AI knowledge source' },
            { icon: <Cpu size={20} />, title: 'RAG Engine', desc: 'Groq LLaMA 3.3 70B retrieves the most relevant chunks per question' },
            { icon: <CheckCircle size={20} />, title: 'Review & Export', desc: 'Edit answers, see citations, export a .docx ready to send' },
          ].map((f, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-left hover:bg-white/8 hover:border-indigo-500/30 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 group-hover:bg-indigo-500/30 transition-colors">
                {f.icon}
              </div>
              <div className="text-white font-semibold text-sm mb-1">{f.title}</div>
              <div className="text-slate-500 text-xs leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH PAGE
// ═══════════════════════════════════════════════════════════════════════════
function AuthPage({ mode, onSuccess, onBack, toast }) {
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password };

      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');
      localStorage.setItem('alumni_token', data.access_token);
      toast.add(isLogin ? 'Welcome back!' : 'Account created!', 'success');
      onSuccess();
    } catch (err) {
      toast.add(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#020617] flex items-center justify-center">
      {/* Subtle DarkVeil strip at top */}
      <div className="absolute top-0 left-0 right-0 h-64">
        <DarkVeil speed={0.3} hueShift={0} noiseIntensity={0.01} />
      </div>
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#020617]/70 to-[#020617]" />
      <div className="absolute inset-0 bg-[#020617]/80" />

      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-8 transition-colors">
          <Shield size={14} className="text-indigo-400" />
          <span className="font-semibold text-indigo-400">AlumniTrust AI</span>
        </button>

        <Card className="p-8">
          <h2 className="text-2xl font-black text-white mb-1">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            {isLogin ? 'Sign in to your workspace' : 'Start automating HECVAT responses'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5">Username</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
                  placeholder="john_doe"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1.5">Email</label>
              <input
                type="email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
                placeholder="you@almabase.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 mt-2">
              {loading ? <Spinner size={16} /> : null}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setIsLogin(p => !p)} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              {isLogin ? 'Register' : 'Sign in'}
            </button>
          </p>

          {/* Demo hint */}
          <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 text-center">
            Demo: <span className="font-mono">demo@almabase.edu</span> / <span className="font-mono">DemoPassword123!</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
function MainApp({ toast }) {
  const [tab, setTab] = useState('kb');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Light fetch to warm up
    apiFetch('/api/health').then(r => r.json()).catch(() => { });
  }, []);

  const logout = () => { localStorage.removeItem('alumni_token'); window.location.reload(); };

  const tabs = [
    { id: 'kb', label: 'Trust Center KB', icon: <Database size={15} /> },
    { id: 'process', label: 'Process Questionnaire', icon: <Upload size={15} /> },
    { id: 'history', label: 'Task History', icon: <Clock size={15} /> },
    { id: 'dashboard', label: 'Review Dashboard', icon: <BarChart2 size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Thin DarkVeil header strip */}
      <div className="relative h-1 overflow-hidden">
        <DarkVeil speed={0.6} hueShift={240} noiseIntensity={0} warpAmount={0.5} />
      </div>

      {/* Top nav */}
      <header className="border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">AlumniTrust <span className="text-indigo-400">AI</span></span>
          </div>

          {/* Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${tab === t.id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </nav>

          <button onClick={logout}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <LogOut size={14} /> Logout
          </button>
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden flex overflow-x-auto border-t border-white/5 px-4 gap-1 py-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${tab === t.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'kb' && <KBTab toast={toast} />}
        {tab === 'process' && <ProcessTab toast={toast} onDone={taskId => { setTab('dashboard'); }} />}
        {tab === 'history' && <HistoryTab toast={toast} onView={taskId => setTab('dashboard')} setActiveTask={id => { window._activeTask = id; setTab('dashboard'); }} />}
        {tab === 'dashboard' && <DashboardTab toast={toast} />}
      </main>
    </div>
  );
}

// ── Tab: Knowledge Base ─────────────────────────────────────────────────────
function KBTab({ toast }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    try {
      const r = await apiFetch('/api/documents');
      const d = await r.json();
      setDocs(Array.isArray(d) ? d : []);
    } catch { toast.add('Failed to load documents', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const upload = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('token', getToken());
      const r = await fetch(`${API}/api/documents/upload`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error((await r.json()).detail || 'Upload failed');
      toast.add(`${file.name} added to Knowledge Base`, 'success');
      load();
    } catch (err) { toast.add(err.message, 'error'); }
    finally { setUploading(false); fileRef.current.value = ''; }
  };

  const del = async id => {
    if (!confirm('Remove this document?')) return;
    try {
      const r = await apiFetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Delete failed');
      toast.add('Document removed', 'success');
      setDocs(p => p.filter(d => d.id !== id));
    } catch (err) { toast.add(err.message, 'error'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Trust Center Knowledge Base</h2>
        <p className="text-slate-500 text-sm">Upload your reference documents — SOC2, FERPA, policies. The AI uses these to answer questionnaires.</p>
      </div>

      {/* Upload card */}
      <Card className="p-6">
        <input ref={fileRef} type="file" accept=".pdf,.txt" onChange={upload} className="hidden" />
        <button onClick={() => fileRef.current.click()} disabled={uploading}
          className="w-full border-2 border-dashed border-white/10 hover:border-indigo-500/40 rounded-2xl p-10 flex flex-col items-center gap-3 transition-all hover:bg-indigo-500/5 group">
          {uploading ? <Spinner size={32} className="text-indigo-400" /> :
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/30 transition-colors">
              <Upload size={24} />
            </div>}
          <div>
            <p className="text-white font-semibold text-sm">{uploading ? 'Uploading & indexing...' : 'Drop a document or click to browse'}</p>
            <p className="text-slate-600 text-xs mt-0.5">PDF or TXT • Max 10MB</p>
          </div>
        </button>
      </Card>

      {/* Doc list */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={24} className="text-indigo-400" /></div>
      ) : docs.length === 0 ? (
        <Card className="p-12 text-center">
          <Database size={32} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No documents yet. Upload your first reference doc.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 font-medium">{docs.length} document{docs.length !== 1 ? 's' : ''} indexed</p>
          {docs.map(d => (
            <Card key={d.id} className="flex items-center gap-4 p-4 hover:bg-white/8 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <FileText size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{d.filename}</p>
                <p className="text-slate-600 text-xs">{new Date(d.created_at).toLocaleDateString()}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Indexed</span>
              <button onClick={() => del(d.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1">
                <Trash2 size={15} />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Process Questionnaire ──────────────────────────────────────────────
function ProcessTab({ toast, onDone }) {
  const [taskName, setTaskName] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'processing' | 'done' | 'failed'
  const [taskId, setTaskId] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef();

  const poll = async id => {
    const interval = setInterval(async () => {
      try {
        const r = await apiFetch(`/api/tasks/${id}`);
        const d = await r.json();
        const n = d.answers?.length || 0;
        setProgress(n);
        if (d.status === 'completed') {
          clearInterval(interval);
          setStatus('done');
          toast.add(`Completed! ${n} answers generated.`, 'success');
          onDone(id);
        } else if (d.status === 'failed') {
          clearInterval(interval);
          setStatus('failed');
          toast.add('Processing failed. Check your API key.', 'error');
        }
      } catch { clearInterval(interval); }
    }, 2000);
  };

  const submit = async () => {
    if (!taskName.trim() || !file) { toast.add('Enter a task name and select a file', 'error'); return; }
    setLoading(true); setStatus('processing'); setProgress(0);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('task_name', taskName.trim());
      fd.append('token', getToken());
      const r = await fetch(`${API}/api/questionnaire/upload`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error((await r.json()).detail || 'Upload failed');
      const d = await r.json();
      setTaskId(d.task_id);
      toast.add('Questionnaire submitted! AI is processing...', 'info');
      poll(d.task_id);
    } catch (err) {
      toast.add(err.message, 'error');
      setStatus(null);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Process Questionnaire</h2>
        <p className="text-slate-500 text-sm">Upload a HECVAT CSV or XLSX. The AI answers each question using your Knowledge Base.</p>
      </div>

      <Card className="p-6 space-y-5">
        <div>
          <label className="block text-xs text-slate-400 font-medium mb-2">Task Name</label>
          <input
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
            placeholder="e.g. State University HECVAT 2025"
            value={taskName}
            onChange={e => setTaskName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 font-medium mb-2">Questionnaire File</label>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden"
            onChange={e => setFile(e.target.files?.[0] || null)} />
          <button onClick={() => fileRef.current.click()}
            className="w-full border-2 border-dashed border-white/10 hover:border-indigo-500/40 rounded-xl p-6 flex flex-col items-center gap-2 transition-all hover:bg-indigo-500/5">
            {file ? (
              <><FileText size={24} className="text-indigo-400" />
                <span className="text-sm text-white font-medium">{file.name}</span>
                <span className="text-xs text-slate-500">Click to change</span></>
            ) : (
              <><Upload size={24} className="text-slate-600" />
                <span className="text-sm text-slate-400">Select CSV or XLSX</span></>
            )}
          </button>
        </div>

        {status === 'processing' && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-center gap-3">
            <Spinner size={18} className="text-indigo-400 flex-shrink-0" />
            <div>
              <p className="text-indigo-300 text-sm font-medium">AI is generating answers...</p>
              {progress > 0 && <p className="text-indigo-400/60 text-xs mt-0.5">{progress} answers so far</p>}
            </div>
          </div>
        )}

        {status === 'done' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-300 text-sm font-medium">Done! Switch to Review Dashboard to see answers.</p>
          </div>
        )}

        <button onClick={submit} disabled={loading || status === 'processing'}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30">
          {(loading || status === 'processing') ? <Spinner size={16} /> : <Zap size={16} />}
          {loading ? 'Uploading...' : status === 'processing' ? 'Processing...' : 'Generate Answers'}
        </button>
      </Card>
    </div>
  );
}

// ── Tab: Task History ───────────────────────────────────────────────────────
function HistoryTab({ toast, setActiveTask }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/tasks').then(r => r.json()).then(d => {
      setTasks(Array.isArray(d) ? d : []);
    }).catch(() => toast.add('Failed to load tasks', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner size={24} className="text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Task History</h2>
        <p className="text-slate-500 text-sm">All previously processed questionnaires.</p>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock size={32} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No tasks yet. Process a questionnaire to see results here.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map(t => (
            <Card key={t.id} className="flex items-center gap-4 p-4 hover:bg-white/8 transition-colors">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                ${t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                  t.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'}`}>
                {t.status === 'completed' ? <CheckCircle size={16} /> :
                  t.status === 'failed' ? <AlertCircle size={16} /> : <Spinner size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{t.task_name}</p>
                <p className="text-slate-600 text-xs">{new Date(t.created_at).toLocaleString()} · {t.answer_count ?? 0} answers</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border capitalize
                ${t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  t.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                {t.status}
              </span>
              {t.status === 'completed' && (
                <button onClick={() => { window._activeTask = t.id; setActiveTask(t.id); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-medium transition-all">
                  View <ChevronRight size={12} />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Review Dashboard ───────────────────────────────────────────────────
function DashboardTab({ toast }) {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    apiFetch('/api/tasks').then(r => r.json()).then(d =>
      setTasks(Array.isArray(d) ? d.filter(t => t.status === 'completed') : [])
    );
    if (window._activeTask) { loadTask(window._activeTask); window._activeTask = null; }
  }, []);

  const loadTask = async id => {
    setLoading(true); setSearch(''); setEditId(null);
    try {
      const r = await apiFetch(`/api/tasks/${id}`);
      const d = await r.json();
      setSelectedTask(d);
      setAnswers(d.answers || []);
    } catch { toast.add('Failed to load task', 'error'); }
    finally { setLoading(false); }
  };

  const saveEdit = async id => {
    try {
      const r = await apiFetch(`/api/answers/${id}`, { method: 'PUT', body: JSON.stringify({ manual_answer: editText }) });
      if (!r.ok) throw new Error('Save failed');
      setAnswers(p => p.map(a => a.id === id ? { ...a, manual_answer: editText, has_been_edited: true } : a));
      toast.add('Answer saved', 'success');
      setEditId(null);
    } catch (err) { toast.add(err.message, 'error'); }
  };

  const exportDoc = async () => {
    if (!selectedTask) return;
    try {
      const r = await fetch(`${API}/api/tasks/${selectedTask.id}/export`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!r.ok) throw new Error('Export failed');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `${selectedTask.task_name}.docx`; a.click();
      URL.revokeObjectURL(url);
      toast.add('Exported successfully!', 'success');
    } catch (err) { toast.add(err.message, 'error'); }
  };

  const displayAnswer = a => a.has_been_edited ? a.manual_answer : a.ai_answer;

  const filtered = answers.filter(a =>
    (a.question || '').toLowerCase().includes(search.toLowerCase()) ||
    (displayAnswer(a) || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: answers.length,
    answered: answers.filter(a => !(displayAnswer(a) || '').includes('Not found')).length,
    avgConf: answers.length ? (answers.reduce((s, a) => s + (a.confidence_score || 0), 0) / answers.length).toFixed(1) : 0,
    edited: answers.filter(a => a.has_been_edited).length,
  };

  const isNotFound = a => {
    const text = displayAnswer(a);
    if (!text) return false;
    const lower = text.toLowerCase();
    return lower.includes('not found') || lower.includes('error processing');
  };

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">Review Dashboard</h2>
          <p className="text-slate-500 text-sm">Review, edit, and export AI-generated HECVAT answers.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
            value={selectedTask?.id || ''}
            onChange={e => e.target.value && loadTask(Number(e.target.value))}>
            <option value="">Select a task...</option>
            {tasks.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.task_name}</option>)}
          </select>
          {selectedTask && (
            <button onClick={exportDoc}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30">
              <Download size={15} /> Export .docx
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {selectedTask && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Questions', value: stats.total, icon: <FileText size={16} />, color: 'indigo' },
            { label: 'Answered', value: stats.answered, icon: <CheckCircle size={16} />, color: 'emerald' },
            { label: 'Avg Confidence', value: `${stats.avgConf}%`, icon: <BarChart2 size={16} />, color: 'violet' },
            { label: 'Manually Edited', value: stats.edited, icon: <Edit3 size={16} />, color: 'amber' },
          ].map(s => (
            <Card key={s.label} className="p-4">
              <div className={`text-${s.color}-400 mb-2`}>{s.icon}</div>
              <div className="text-2xl font-black text-white">{s.value}</div>
              <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      {loading && <div className="flex justify-center py-16"><Spinner size={28} className="text-indigo-400" /></div>}

      {/* Search */}
      {selectedTask && !loading && (
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
            placeholder={`Search ${answers.length} questions and answers...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Q&A Cards */}
      {selectedTask && !loading && (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <Card className="p-10 text-center">
              <Search size={24} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No results for "{search}"</p>
            </Card>
          )}

          {filtered.map((a, i) => (
            <Card key={a.id} className={`overflow-hidden transition-all ${isNotFound(a) ? 'border-red-500/20' : 'hover:border-white/20'}`}>
              {/* Card header */}
              <div className="flex items-start gap-3 p-5 pb-4">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-white font-semibold text-sm leading-relaxed flex-1">{a.question}</p>
              </div>

              {/* Divider */}
              <div className="mx-5 border-t border-white/5" />

              {/* Answer section */}
              <div className="p-5 pt-4 space-y-4">
                {isNotFound(a) ? (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm font-semibold">{displayAnswer(a) || 'Not found in references'}</p>
                  </div>
                ) : editId === a.id ? (
                  <div className="space-y-3">
                    <textarea
                      className="w-full bg-white/5 border border-indigo-500/40 rounded-xl p-3 text-white text-sm focus:outline-none resize-none leading-relaxed"
                      rows={6}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(a.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold transition-colors border border-emerald-500/20">
                        <Check size={13} /> Save Answer
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg text-xs font-semibold transition-colors border border-white/10">
                        <X size={13} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {displayAnswer(a) || <span className="text-slate-500 italic">No answer generated. Click Edit to add one.</span>}
                  </p>
                )}

                {/* Footer row */}
                {editId !== a.id && (
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <ConfidenceBadge value={a.confidence_score} />

                      {a.has_been_edited && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                          ✏️ Edited
                        </span>
                      )}

                      {a.source_document && a.source_document !== 'N/A' && (
                        <div className="relative group">
                          <button className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                            <FileText size={11} />
                            {a.source_document}
                          </button>
                          {a.source_snippet && (
                            <div className="absolute z-50 left-0 bottom-full mb-2 w-96 p-4 bg-slate-900 border border-white/10 rounded-xl shadow-2xl hidden group-hover:block">
                              <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide mb-2">Source Snippet</p>
                              <p className="text-slate-300 text-xs leading-relaxed italic">
                                "{a.source_snippet.slice(0, 400)}{a.source_snippet.length > 400 ? '...' : ''}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => { setEditId(a.id); setEditText(displayAnswer(a) || ''); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg text-xs font-medium transition-all border border-transparent hover:border-indigo-500/20">
                      <Edit3 size={12} /> Edit Answer
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!selectedTask && !loading && (
        <Card className="p-16 text-center">
          <BarChart2 size={36} className="text-slate-800 mx-auto mb-4" />
          <p className="text-slate-400 font-semibold text-sm mb-1">No task selected</p>
          <p className="text-slate-600 text-xs">Choose a completed task from the dropdown above to review answers.</p>
        </Card>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const toast = useToast();
  const [page, setPage] = useState(() => getToken() ? 'app' : 'hero'); // 'hero' | 'auth' | 'app'
  const [authMode, setAuthMode] = useState('login');

  return (
    <div className="font-sans">
      <Toast toasts={toast.toasts} remove={toast.remove} />
      {page === 'hero' && (
        <HeroPage onEnter={mode => { setAuthMode(mode); setPage('auth'); }} />
      )}
      {page === 'auth' && (
        <AuthPage
          mode={authMode}
          toast={toast}
          onBack={() => setPage('hero')}
          onSuccess={() => setPage('app')}
        />
      )}
      {page === 'app' && <MainApp toast={toast} />}
    </div>
  );
}
