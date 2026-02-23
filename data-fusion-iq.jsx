import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend
} from "recharts";
import {
  Upload, Database, GitBranch, FileText, Shield, Zap, Settings, Home, ChevronRight,
  CheckCircle, AlertTriangle, XCircle, Info, Play, RefreshCw, Download, Eye, Plus,
  Filter, Search, Bell, User, ChevronDown, ArrowRight, Layers, Activity, BarChart2,
  TrendingUp, TrendingDown, AlertCircle, Clock, Package, Globe, Lock, Star,
  Cpu, Table, Hash, Calendar, Type, ToggleLeft, FileCheck, Boxes, Network,
  Gauge, FlaskConical, Sparkles, Send, X, Menu, ChevronLeft, MoreVertical,
  FolderOpen, Sliders, Target, Radio, Wand2
} from "lucide-react";

// ─── SAMPLE DATA ──────────────────────────────────────────────────────────────
const SAMPLE_ORDERS = Array.from({ length: 200 }, (_, i) => ({
  order_id: `ORD-${String(i + 1001).padStart(5, "0")}`,
  customer_id: `C${String(Math.floor(Math.random() * 500) + 1).padStart(4, "0")}`,
  product: ["Laptop Pro", "Wireless Mouse", "USB-C Hub", "Mechanical Keyboard", "Monitor 4K", "Webcam HD", "SSD 1TB", "RAM 32GB"][Math.floor(Math.random() * 8)],
  category: ["Electronics", "Peripherals", "Storage", "Accessories"][Math.floor(Math.random() * 4)],
  price: parseFloat((Math.random() * 1500 + 20).toFixed(2)),
  quantity: Math.floor(Math.random() * 5) + 1,
  order_date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split("T")[0],
  status: Math.random() > 0.1 ? ["Delivered", "Shipped", "Processing", "Cancelled"][Math.floor(Math.random() * 4)] : null,
  country: ["USA", "UK", "Germany", "France", "Japan", "Canada", "Australia", "Brazil"][Math.floor(Math.random() * 8)],
  discount: Math.random() > 0.6 ? parseFloat((Math.random() * 0.3).toFixed(2)) : 0,
  rating: Math.random() > 0.15 ? Math.floor(Math.random() * 5) + 1 : null,
  revenue: null, // will be null to show quality issues
}));
// Inject some anomalies
SAMPLE_ORDERS[10].price = 99999;
SAMPLE_ORDERS[25].order_id = SAMPLE_ORDERS[5].order_id; // duplicate
SAMPLE_ORDERS[50].price = -50; // negative
SAMPLE_ORDERS[80].quantity = 0;
SAMPLE_ORDERS[120].customer_id = null;

const MONTHLY_METRICS = [
  { month: "Jan", orders: 142, revenue: 48200, dqScore: 87 },
  { month: "Feb", orders: 168, revenue: 52100, dqScore: 89 },
  { month: "Mar", orders: 195, revenue: 67800, dqScore: 84 },
  { month: "Apr", orders: 221, revenue: 71200, dqScore: 91 },
  { month: "May", orders: 198, revenue: 63400, dqScore: 88 },
  { month: "Jun", orders: 247, revenue: 89100, dqScore: 92 },
  { month: "Jul", orders: 312, revenue: 112300, dqScore: 85 },
  { month: "Aug", orders: 289, revenue: 98700, dqScore: 90 },
  { month: "Sep", orders: 334, revenue: 121500, dqScore: 93 },
  { month: "Oct", orders: 298, revenue: 104200, dqScore: 88 },
  { month: "Nov", orders: 421, revenue: 158900, dqScore: 86 },
  { month: "Dec", orders: 389, revenue: 143200, dqScore: 91 },
];

const ANOMALY_DATA = [
  { day: "Nov 1", value: 142, expected: 145, z: 0.2 },
  { day: "Nov 5", value: 156, expected: 148, z: 0.8 },
  { day: "Nov 10", value: 138, expected: 152, z: -1.1 },
  { day: "Nov 15", value: 421, expected: 158, z: 4.8 }, // anomaly
  { day: "Nov 20", value: 164, expected: 161, z: 0.3 },
  { day: "Nov 25", value: 52, expected: 165, z: -4.1 },  // anomaly
  { day: "Nov 30", value: 178, expected: 168, z: 0.9 },
];

const CATEGORY_DIST = [
  { name: "Electronics", value: 45, fill: "#06b6d4" },
  { name: "Peripherals", value: 28, fill: "#8b5cf6" },
  { name: "Storage", value: 15, fill: "#f59e0b" },
  { name: "Accessories", value: 12, fill: "#10b981" },
];

const DQ_RADAR = [
  { dimension: "Completeness", score: 87, fullMark: 100 },
  { dimension: "Validity", score: 79, fullMark: 100 },
  { dimension: "Uniqueness", score: 94, fullMark: 100 },
  { dimension: "Consistency", score: 82, fullMark: 100 },
  { dimension: "Timeliness", score: 91, fullMark: 100 },
  { dimension: "Accuracy", score: 76, fullMark: 100 },
];

const COLUMN_PROFILE = [
  { col: "order_id", type: "string", nulls: 0, unique: 198, outliers: 2, valid: 96 },
  { col: "customer_id", type: "string", nulls: 1, unique: 187, outliers: 0, valid: 99 },
  { col: "product", type: "string", nulls: 0, unique: 8, outliers: 0, valid: 100 },
  { col: "price", type: "float", nulls: 0, unique: 198, outliers: 3, valid: 97 },
  { col: "quantity", type: "int", nulls: 0, unique: 5, outliers: 1, valid: 99 },
  { col: "order_date", type: "date", nulls: 0, unique: 180, outliers: 0, valid: 100 },
  { col: "status", type: "string", nulls: 10, unique: 4, outliers: 0, valid: 95 },
  { col: "rating", type: "int", nulls: 30, unique: 5, outliers: 0, valid: 85 },
  { col: "revenue", type: "float", nulls: 200, unique: 0, outliers: 0, valid: 0 },
];

const PIPELINE_LAYERS = [
  { id: "L0", label: "Raw Layer", icon: "📥", rows: 200, cols: 12, nullRate: 12.4, dupes: 1, violations: 4, status: "complete", time: "0.2s", changes: "Ingested", color: "#475569" },
  { id: "L1", label: "Parsed", icon: "🔍", rows: 200, cols: 12, nullRate: 12.4, dupes: 1, violations: 4, status: "complete", time: "0.8s", changes: "Types inferred, encoding fixed", color: "#0891b2" },
  { id: "L2", label: "Standardized", icon: "✂️", rows: 200, cols: 12, nullRate: 11.2, dupes: 1, violations: 2, status: "complete", time: "1.4s", changes: "Dates normalized, strings trimmed", color: "#7c3aed" },
  { id: "L3", label: "Harmonized", icon: "🔗", rows: 200, cols: 13, nullRate: 11.2, dupes: 0, violations: 2, status: "complete", time: "0.6s", changes: "Duplicates removed, IDs validated", color: "#059669" },
  { id: "L4", label: "Curated", icon: "💎", rows: 198, cols: 14, nullRate: 8.1, dupes: 0, violations: 1, status: "complete", time: "0.9s", changes: "2 extreme outliers flagged, revenue computed", color: "#d97706" },
  { id: "L5", label: "Feature / Insights", icon: "⚡", rows: 198, cols: 18, nullRate: 8.1, dupes: 0, violations: 0, status: "complete", time: "2.1s", changes: "Aggregations, trends, DQ score computed", color: "#dc2626" },
];

const RULES = [
  { id: 1, name: "price_positive", column: "price", type: "Range", condition: "price > 0", severity: "critical", passes: 197, fails: 3, status: "fail" },
  { id: 2, name: "order_id_unique", column: "order_id", type: "Uniqueness", condition: "UNIQUE(order_id)", severity: "critical", passes: 199, fails: 1, status: "fail" },
  { id: 3, name: "status_valid", column: "status", type: "Allowed Values", condition: "IN ['Delivered','Shipped','Processing','Cancelled',NULL]", severity: "warning", passes: 200, fails: 0, status: "pass" },
  { id: 4, name: "customer_not_null", column: "customer_id", type: "Not Null", condition: "customer_id IS NOT NULL", severity: "warning", passes: 199, fails: 1, status: "fail" },
  { id: 5, name: "quantity_range", column: "quantity", type: "Range", condition: "quantity BETWEEN 1 AND 100", severity: "warning", passes: 199, fails: 1, status: "fail" },
  { id: 6, name: "date_format", column: "order_date", type: "Format", condition: "MATCHES YYYY-MM-DD", severity: "info", passes: 200, fails: 0, status: "pass" },
];

// ─── STYLE TOKENS ─────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0e1a",
  surface: "#0f1629",
  card: "#141c2e",
  border: "#1e2d47",
  accent: "#06b6d4",
  accentDim: "rgba(6,182,212,0.12)",
  purple: "#8b5cf6",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  text: "#e2e8f0",
  muted: "#64748b",
  subtle: "#334155",
};

const navItems = [
  { id: "welcome", icon: Home, label: "Home" },
  { id: "uploads", icon: Upload, label: "Uploads" },
  { id: "pipeline", icon: GitBranch, label: "Pipeline" },
  { id: "reports", icon: FileText, label: "Reports" },
  { id: "quality", icon: Shield, label: "Data Quality" },
  { id: "anomalies", icon: AlertTriangle, label: "Anomalies" },
  { id: "settings", icon: Settings, label: "Settings" },
];

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────
const Badge = ({ color = "cyan", children }) => {
  const colors = {
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    purple: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono border ${colors[color]}`}>
      {children}
    </span>
  );
};

const KpiCard = ({ label, value, sub, trend, color = C.accent, icon: Icon }) => (
  <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-5 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span style={{ color: C.muted }} className="text-xs font-medium uppercase tracking-widest">{label}</span>
      {Icon && <Icon size={14} style={{ color }} />}
    </div>
    <div className="flex items-end gap-2">
      <span className="text-3xl font-bold tracking-tight" style={{ color: C.text }}>{value}</span>
      {trend !== undefined && (
        <span className={`text-xs mb-1 font-medium ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </span>
      )}
    </div>
    {sub && <span style={{ color: C.muted }} className="text-xs">{sub}</span>}
  </div>
);

const SectionHeader = ({ title, sub, action }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h2 className="text-xl font-bold tracking-tight" style={{ color: C.text }}>{title}</h2>
      {sub && <p className="text-sm mt-1" style={{ color: C.muted }}>{sub}</p>}
    </div>
    {action}
  </div>
);

const Pill = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    style={active ? { background: C.accentDim, borderColor: C.accent, color: C.accent } : { borderColor: C.border, color: C.muted }}
    className="px-4 py-1.5 rounded-full text-sm border font-medium transition-all"
  >
    {children}
  </button>
);

const ScoreGauge = ({ score, size = 120 }) => {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ * 0.75;
  const color = score >= 85 ? C.green : score >= 70 ? C.amber : C.red;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke={C.border} strokeWidth="8"
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={circ * 0.125} strokeLinecap="round" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={circ * 0.125} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x="50" y="52" textAnchor="middle" fill={C.text} fontSize="18" fontWeight="700">{score}</text>
      <text x="50" y="64" textAnchor="middle" fill={C.muted} fontSize="8">/ 100</text>
    </svg>
  );
};

const Spinner = () => (
  <div className="flex items-center justify-center p-8">
    <div style={{ borderColor: C.border, borderTopColor: C.accent }}
      className="w-8 h-8 border-2 rounded-full animate-spin" />
  </div>
);

// ─── PAGES ────────────────────────────────────────────────────────────────────

// WELCOME PAGE
const WelcomePage = ({ onNavigate, onLoadSample }) => {
  const steps = ["Upload", "Profile", "Standardize", "Fuse", "Quality", "Insights", "Export"];
  const fileTypes = ["CSV", "Excel", "JSON", "Parquet", "TXT", "PDF", "ZIP"];
  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl mb-8 p-10"
        style={{ background: "linear-gradient(135deg, #0f1f3d 0%, #0a1628 40%, #0d1f35 100%)", borderColor: C.border, border: `1px solid ${C.border}` }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #06b6d4, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: C.accentDim, border: `1px solid ${C.accent}33` }}>
              <Zap size={22} style={{ color: C.accent }} />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: C.accent }}>Data Fusion IQ</span>
              <div className="text-xs" style={{ color: C.muted }}>v2.4.1 · Production Ready</div>
            </div>
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-4" style={{ color: C.text }}>
            Turn raw data into<br />
            <span style={{ color: C.accent }}>actionable intelligence.</span>
          </h1>
          <p className="text-lg max-w-2xl mb-8" style={{ color: C.muted }}>
            Ingest any file format, auto-profile your data through 6 processing layers, detect anomalies, score quality, and generate AI-powered insights — all in one platform.
          </p>
          <div className="flex gap-4 flex-wrap">
            <button onClick={() => onNavigate("uploads")}
              style={{ background: C.accent, color: "#000" }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all">
              <Upload size={16} /> Upload Dataset
            </button>
            <button onClick={onLoadSample}
              style={{ borderColor: C.accent, color: C.accent, border: `1px solid ${C.accent}55` }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm hover:bg-cyan-500/10 transition-all">
              <Sparkles size={16} /> Try Sample Dataset
            </button>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6 mb-8">
        <h3 className="text-sm font-semibold uppercase tracking-widest mb-5" style={{ color: C.muted }}>Processing Pipeline</h3>
        <div className="flex items-center gap-0 flex-wrap">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent }}>
                  {i + 1}
                </div>
                <span className="text-xs font-medium" style={{ color: C.text }}>{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="w-8 h-px mb-4 mx-1" style={{ background: C.accent + "33" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Supported formats */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6">
          <h3 className="font-semibold mb-4" style={{ color: C.text }}>Supported Inputs</h3>
          <div className="flex flex-wrap gap-2">
            {fileTypes.map(f => <Badge key={f} color="cyan">{f}</Badge>)}
          </div>
          <p className="text-xs mt-3" style={{ color: C.muted }}>Auto-detect encoding, delimiters, and schema. Stream files up to 2GB.</p>
        </div>
        <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6">
          <h3 className="font-semibold mb-4" style={{ color: C.text }}>AI Capabilities</h3>
          <div className="space-y-2">
            {["Column semantic labeling", "Suggested transformations", "Join key detection", "Anomaly narration", "Business insights"].map(c => (
              <div key={c} className="flex items-center gap-2">
                <CheckCircle size={12} style={{ color: C.green }} />
                <span className="text-sm" style={{ color: C.muted }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Files Processed", value: "12,847" },
          { label: "Avg DQ Score", value: "88.2" },
          { label: "Anomalies Caught", value: "4,129" },
          { label: "Reports Generated", value: "29,004" },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-5 text-center">
            <div className="text-2xl font-black" style={{ color: C.accent }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: C.muted }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// UPLOADS PAGE
const UploadsPage = ({ hasData, onLoadSample }) => {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState(hasData ? [
    { name: "ecommerce_orders.csv", size: "48.2 KB", rows: 200, status: "complete", uploaded: "2 min ago", dqScore: 85 },
  ] : []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = [...e.dataTransfer.files];
    dropped.forEach(f => {
      setFiles(prev => [...prev, { name: f.name, size: `${(f.size / 1024).toFixed(1)} KB`, rows: "—", status: "processing", uploaded: "just now", dqScore: null }]);
      setTimeout(() => {
        setFiles(prev => prev.map(p => p.name === f.name ? { ...p, status: "complete", rows: Math.floor(Math.random() * 5000) + 100, dqScore: Math.floor(Math.random() * 20) + 75 } : p));
      }, 2500);
    });
  };

  return (
    <div>
      <SectionHeader title="Data Uploads" sub="Manage ingested datasets and raw files" />

      {/* Drop zone */}
      <div onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)} onDrop={handleDrop}
        style={{ borderColor: dragging ? C.accent : C.border, background: dragging ? C.accentDim : C.card }}
        className="rounded-2xl border-2 border-dashed p-16 text-center mb-8 transition-all cursor-pointer">
        <Upload size={40} style={{ color: dragging ? C.accent : C.muted, margin: "0 auto 16px" }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: C.text }}>
          {dragging ? "Release to upload" : "Drop files here"}
        </h3>
        <p style={{ color: C.muted }} className="text-sm mb-4">CSV, Excel, JSON, Parquet, TXT, PDF, ZIP · Up to 2GB per file</p>
        <div className="flex gap-3 justify-center">
          <label style={{ background: C.accent, color: "#000" }} className="px-5 py-2 rounded-lg font-bold text-sm cursor-pointer hover:opacity-90 transition-all">
            Browse Files <input type="file" className="hidden" multiple onChange={e => {
              [...e.target.files].forEach(f => {
                setFiles(prev => [...prev, { name: f.name, size: `${(f.size / 1024).toFixed(1)} KB`, rows: "—", status: "processing", uploaded: "just now", dqScore: null }]);
              });
            }} />
          </label>
          <button onClick={onLoadSample}
            style={{ borderColor: C.border, color: C.muted }}
            className="px-5 py-2 rounded-lg font-medium text-sm border hover:border-cyan-500 hover:text-cyan-400 transition-all">
            <Sparkles size={14} className="inline mr-1" /> Load Sample
          </button>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: C.border }}>
            <span className="font-semibold text-sm" style={{ color: C.text }}>{files.length} Dataset{files.length > 1 ? "s" : ""}</span>
            <Badge color="cyan">{files.filter(f => f.status === "complete").length} ready</Badge>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderColor: C.border }} className="border-b">
                {["File Name", "Size", "Rows", "DQ Score", "Uploaded", "Status", ""].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-wider" style={{ color: C.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => (
                <tr key={i} style={{ borderColor: C.border }} className="border-b hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Database size={16} style={{ color: C.accent }} />
                      <span className="text-sm font-medium" style={{ color: C.text }}>{f.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono" style={{ color: C.muted }}>{f.size}</td>
                  <td className="px-6 py-4 text-sm font-mono" style={{ color: C.muted }}>{f.rows.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {f.dqScore ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${f.dqScore}%`, background: f.dqScore >= 85 ? C.green : f.dqScore >= 70 ? C.amber : C.red }} />
                        </div>
                        <span className="text-sm font-mono" style={{ color: C.text }}>{f.dqScore}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: C.muted }}>{f.uploaded}</td>
                  <td className="px-6 py-4">
                    {f.status === "complete" ? <Badge color="green">Complete</Badge>
                      : f.status === "processing" ? <Badge color="amber">Processing…</Badge>
                        : <Badge color="red">Failed</Badge>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button style={{ color: C.muted }} className="hover:text-cyan-400 transition-colors"><Eye size={14} /></button>
                      <button style={{ color: C.muted }} className="hover:text-cyan-400 transition-colors"><Download size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {files.length === 0 && (
        <div className="text-center py-12" style={{ color: C.muted }}>
          <FolderOpen size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p className="text-sm">No datasets yet. Upload a file or try the sample dataset.</p>
        </div>
      )}
    </div>
  );
};

// PIPELINE PAGE
const PipelinePage = ({ hasData }) => {
  const [selected, setSelected] = useState(null);
  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    if (hasData) {
      const timer = setInterval(() => setAnimStep(p => p < PIPELINE_LAYERS.length - 1 ? p + 1 : p), 400);
      return () => clearInterval(timer);
    }
  }, [hasData]);

  if (!hasData) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4" style={{ color: C.muted }}>
      <GitBranch size={48} style={{ opacity: 0.3 }} />
      <p>No data loaded. Upload a dataset or try the sample.</p>
    </div>
  );

  const sel = selected !== null ? PIPELINE_LAYERS[selected] : null;

  return (
    <div>
      <SectionHeader title="Data Processing Pipeline" sub="6-layer processing DAG with full lineage tracking" />

      {/* DAG */}
      <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-8 mb-6 overflow-x-auto">
        <div className="flex items-stretch gap-4 min-w-max">
          {PIPELINE_LAYERS.map((layer, i) => (
            <div key={layer.id} className="flex items-center gap-4">
              <div onClick={() => setSelected(i === selected ? null : i)}
                style={{
                  borderColor: selected === i ? layer.color : (i <= animStep ? layer.color + "44" : C.border),
                  background: selected === i ? layer.color + "18" : C.surface,
                  opacity: i <= animStep ? 1 : 0.4,
                  transition: "all 0.5s ease",
                  boxShadow: selected === i ? `0 0 24px ${layer.color}33` : "none",
                }}
                className="rounded-xl border-2 p-5 cursor-pointer w-44 flex flex-col gap-3 hover:border-current transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold" style={{ color: layer.color }}>{layer.id}</span>
                  <span>{layer.icon}</span>
                </div>
                <div className="font-semibold text-sm" style={{ color: C.text }}>{layer.label}</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs" style={{ color: C.muted }}>
                    <span>Rows</span><span className="font-mono" style={{ color: C.text }}>{layer.rows}</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: C.muted }}>
                    <span>Cols</span><span className="font-mono" style={{ color: C.text }}>{layer.cols}</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: C.muted }}>
                    <span>Nulls</span>
                    <span className="font-mono" style={{ color: layer.nullRate > 10 ? C.amber : C.green }}>{layer.nullRate}%</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: C.muted }}>
                    <span>Issues</span>
                    <span className="font-mono" style={{ color: layer.violations > 0 ? C.red : C.green }}>{layer.violations}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle size={10} style={{ color: C.green }} />
                  <span className="text-xs" style={{ color: C.muted }}>{layer.time}</span>
                </div>
              </div>
              {i < PIPELINE_LAYERS.length - 1 && (
                <div className="flex items-center">
                  <div className="w-6 h-px" style={{ background: i < animStep ? layer.color + "66" : C.border }} />
                  <ChevronRight size={14} style={{ color: i < animStep ? layer.color : C.border }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {sel && (
        <div style={{ background: C.card, borderColor: sel.color + "44", border: `1px solid ${sel.color}44` }} className="rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{sel.icon}</span>
              <div>
                <h3 className="font-bold" style={{ color: C.text }}>{sel.label}</h3>
                <span className="text-xs font-mono" style={{ color: sel.color }}>{sel.id}</span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ color: C.muted }} className="hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { k: "Rows", v: sel.rows }, { k: "Columns", v: sel.cols },
              { k: "Processing Time", v: sel.time }, { k: "Null Rate", v: `${sel.nullRate}%` },
              { k: "Duplicates", v: sel.dupes }, { k: "Violations", v: sel.violations },
            ].map(({ k, v }) => (
              <div key={k} style={{ background: C.surface, borderColor: C.border }} className="rounded-lg border p-3">
                <div className="text-xs" style={{ color: C.muted }}>{k}</div>
                <div className="text-lg font-bold mt-1" style={{ color: C.text }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ background: C.surface, borderColor: C.border }} className="rounded-lg border p-4">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: C.muted }}>Transformations Applied</span>
            <p className="text-sm mt-2" style={{ color: C.text }}>{sel.changes}</p>
          </div>

          {/* Sample data preview */}
          <div className="mt-4">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: C.muted }}>Sample Rows (Preview)</span>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr style={{ borderColor: C.border }} className="border-b">
                    {["order_id", "product", "price", "status", "order_date"].map(h => (
                      <th key={h} className="px-3 py-2 text-left" style={{ color: C.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_ORDERS.slice(0, 4).map((r, i) => (
                    <tr key={i} style={{ borderColor: C.border }} className="border-b">
                      <td className="px-3 py-2" style={{ color: C.accent }}>{r.order_id}</td>
                      <td className="px-3 py-2" style={{ color: C.text }}>{r.product}</td>
                      <td className="px-3 py-2" style={{ color: C.text }}>${r.price.toFixed(2)}</td>
                      <td className="px-3 py-2"><Badge color={r.status === "Delivered" ? "green" : r.status === "Cancelled" ? "red" : "amber"}>{r.status || "NULL"}</Badge></td>
                      <td className="px-3 py-2" style={{ color: C.text }}>{r.order_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Column profile table */}
      <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: C.border }}>
          <span className="font-semibold text-sm" style={{ color: C.text }}>Column Profiles — Curated Layer (L4)</span>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ borderColor: C.border }} className="border-b">
              {["Column", "Type", "Nulls", "Unique", "Outliers", "Validity %"].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-wider" style={{ color: C.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COLUMN_PROFILE.map((c, i) => (
              <tr key={i} style={{ borderColor: C.border }} className="border-b hover:bg-white/[0.02]">
                <td className="px-6 py-3 font-mono text-sm font-medium" style={{ color: C.accent }}>{c.col}</td>
                <td className="px-6 py-3"><Badge color="purple">{c.type}</Badge></td>
                <td className="px-6 py-3 text-sm font-mono" style={{ color: c.nulls > 5 ? C.amber : C.text }}>{c.nulls}</td>
                <td className="px-6 py-3 text-sm font-mono" style={{ color: C.text }}>{c.unique}</td>
                <td className="px-6 py-3 text-sm font-mono" style={{ color: c.outliers > 0 ? C.red : C.muted }}>{c.outliers}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: C.border }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${c.valid}%`, background: c.valid >= 90 ? C.green : c.valid >= 70 ? C.amber : C.red }} />
                    </div>
                    <span className="text-sm font-mono w-8 text-right" style={{ color: C.text }}>{c.valid}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// REPORTS PAGE
const ReportsPage = ({ hasData }) => {
  const [activeTab, setActiveTab] = useState("profiling");
  const tabs = [
    { id: "profiling", label: "Profiling" },
    { id: "quality", label: "Quality Scorecard" },
    { id: "insights", label: "Business Insights" },
    { id: "pipeline", label: "Pipeline Runs" },
    { id: "ai", label: "AI Insights" },
  ];

  if (!hasData) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4" style={{ color: C.muted }}>
      <FileText size={48} style={{ opacity: 0.3 }} />
      <p>No reports yet. Load a dataset first.</p>
    </div>
  );

  return (
    <div>
      <SectionHeader title="Reports" sub="Auto-generated analytical reports from your datasets"
        action={
          <button style={{ background: C.accent, color: "#000" }} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm">
            <Download size={14} /> Export PDF
          </button>
        }
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => <Pill key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>{t.label}</Pill>)}
      </div>

      {activeTab === "profiling" && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <KpiCard label="Total Rows" value="200" sub="After ingestion" icon={Table} />
            <KpiCard label="Columns" value="12" sub="9 typed, 1 empty" icon={Hash} />
            <KpiCard label="Missing Values" value="11.8%" sub="Across all columns" color={C.amber} icon={AlertCircle} />
            <KpiCard label="Duplicate IDs" value="1" sub="Flagged for review" color={C.red} icon={Copy} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6">
              <h3 className="font-semibold mb-4" style={{ color: C.text }}>Monthly Order Volume</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MONTHLY_METRICS}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 11 }} />
                  <YAxis tick={{ fill: C.muted, fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}
                    labelStyle={{ color: C.text }} itemStyle={{ color: C.accent }} />
                  <Bar dataKey="orders" fill={C.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6">
              <h3 className="font-semibold mb-4" style={{ color: C.text }}>Category Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={CATEGORY_DIST} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    dataKey="value" nameKey="name">
                    {CATEGORY_DIST.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}
                    itemStyle={{ color: C.text }} />
                  <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6">
            <h3 className="font-semibold mb-4" style={{ color: C.text }}>Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MONTHLY_METRICS}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.accent} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: C.muted, fontSize: 11 }} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}
                  formatter={v => [`$${v.toLocaleString()}`, "Revenue"]} labelStyle={{ color: C.text }} />
                <Area type="monotone" dataKey="revenue" stroke={C.accent} fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "quality" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6 flex flex-col items-center">
              <ScoreGauge score={85} />
              <span className="mt-3 font-semibold" style={{ color: C.text }}>Overall DQ Score</span>
              <Badge color="amber" className="mt-2">Needs Attention</Badge>
            </div>
            <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6 col-span-2">
              <h3 className="font-semibold mb-4" style={{ color: C.text }}>Dimension Radar</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={DQ_RADAR}>
                  <PolarGrid stroke={C.border} />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: C.muted, fontSize: 11 }} />
                  <Radar name="Score" dataKey="score" stroke={C.accent} fill={C.accent} fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}
                    itemStyle={{ color: C.accent }} labelStyle={{ color: C.text }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6">
            <h3 className="font-semibold mb-4" style={{ color: C.text }}>DQ Score Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={MONTHLY_METRICS}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 11 }} />
                <YAxis domain={[70, 100]} tick={{ fill: C.muted, fontSize: 11 }} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}
                  itemStyle={{ color: C.accent }} labelStyle={{ color: C.text }} />
                <Line type="monotone" dataKey="dqScore" stroke={C.accent} strokeWidth={2} dot={{ fill: C.accent, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "insights" && (
        <div className="space-y-4">
          {[
            { title: "Revenue Peak", detail: "November achieved the highest monthly revenue at $158,900 — 51% above average. Likely driven by seasonal events.", icon: TrendingUp, color: C.green },
            { title: "Top Product Category", detail: "Electronics accounts for 45% of all orders and 62% of total revenue. Consider expanding SKUs in this category.", icon: BarChart2, color: C.accent },
            { title: "Geographic Concentration", detail: "USA + Germany = 42% of orders. Opportunity to strengthen campaigns in Japan and Brazil where order frequency is low.", icon: Globe, color: C.purple },
            { title: "Discount Sensitivity", detail: "Orders with >20% discount have 0.8 higher avg. rating and 34% fewer cancellations. Consider tiered discount strategy.", icon: Star, color: C.amber },
            { title: "Cancellation Hotspot", detail: "'Processing' status orders that are >5 days old have a 3× higher cancellation rate. Investigate fulfillment bottleneck.", icon: AlertTriangle, color: C.red },
          ].map((ins, i) => (
            <div key={i} style={{ background: C.card, borderColor: C.border, borderLeft: `3px solid ${ins.color}` }}
              className="rounded-xl border p-5 flex gap-4">
              <ins.icon size={20} style={{ color: ins.color, flexShrink: 0, marginTop: 2 }} />
              <div>
                <h3 className="font-semibold mb-1" style={{ color: C.text }}>{ins.title}</h3>
                <p className="text-sm" style={{ color: C.muted }}>{ins.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "pipeline" && (
        <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: C.border }}>
            <span className="font-semibold text-sm" style={{ color: C.text }}>Pipeline Run History</span>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderColor: C.border }} className="border-b">
                {["Run ID", "Dataset", "Started", "Duration", "Rows In", "Rows Out", "Status"].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-wider" style={{ color: C.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { id: "run-089", ds: "ecommerce_orders.csv", start: "Today 14:32", dur: "5.8s", rin: 200, rout: 198, status: "success" },
                { id: "run-088", ds: "ecommerce_orders.csv", start: "Today 11:15", dur: "6.1s", rin: 200, rout: 198, status: "success" },
                { id: "run-087", ds: "ecommerce_orders.csv", start: "Yesterday 09:02", dur: "—", rin: 200, rout: 0, status: "failed" },
                { id: "run-086", ds: "legacy_data.csv", start: "2 days ago", dur: "12.4s", rin: 5420, rout: 5398, status: "success" },
              ].map((r, i) => (
                <tr key={i} style={{ borderColor: C.border }} className="border-b hover:bg-white/[0.02]">
                  <td className="px-6 py-3 font-mono text-sm" style={{ color: C.accent }}>{r.id}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: C.text }}>{r.ds}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: C.muted }}>{r.start}</td>
                  <td className="px-6 py-3 text-sm font-mono" style={{ color: C.text }}>{r.dur}</td>
                  <td className="px-6 py-3 text-sm font-mono" style={{ color: C.muted }}>{r.rin.toLocaleString()}</td>
                  <td className="px-6 py-3 text-sm font-mono" style={{ color: C.text }}>{r.rout.toLocaleString()}</td>
                  <td className="px-6 py-3">
                    <Badge color={r.status === "success" ? "green" : "red"}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "ai" && <AIInsightsTab />}
    </div>
  );
};

// AI INSIGHTS TAB
const AIInsightsTab = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [prompt, setPrompt] = useState("Analyze this e-commerce dataset and provide: 1) A dataset summary, 2) The top 3 business insights, 3) Recommended data quality improvements, 4) Suggested transformations for the columns.");
  const [error, setError] = useState("");

  const runAI = async () => {
    setLoading(true);
    setResult("");
    setError("");
    const dataContext = `Dataset: ecommerce_orders.csv
Rows: 200 | Columns: 12
Columns: order_id (string), customer_id (string), product (string, 8 unique), category (string, 4 unique), price (float, $20-$1500), quantity (int 1-5), order_date (date), status (string: Delivered/Shipped/Processing/Cancelled, 5% null), country (string, 8 unique), discount (float 0-0.3), rating (int 1-5, 15% null), revenue (float, all null)

Data Quality Issues Found:
- 1 duplicate order_id (ORD-01006)
- 3 invalid prices: $99,999 (outlier), -$50 (negative), and one $0 quantity
- 1 null customer_id
- revenue column is 100% null
- 10 null status values
- 30 null ratings

Sample data: Electronics is top category (45%), top product "Laptop Pro", countries: USA, UK, Germany, France, Japan, Canada, Australia, Brazil`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `${dataContext}\n\nUser question: ${prompt}\n\nProvide a clear, structured analysis with specific actionable recommendations. Use markdown formatting.`
          }]
        })
      });
      const data = await response.json();
      if (data.content?.[0]?.text) setResult(data.content[0].text);
      else setError("No response received. Check API connectivity.");
    } catch (e) {
      setError(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} style={{ color: C.accent }} />
          <span className="font-semibold" style={{ color: C.text }}>AI Analysis</span>
          <Badge color="cyan">Claude Sonnet 4</Badge>
        </div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          style={{ background: C.surface, borderColor: C.border, color: C.text, resize: "none" }}
          className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          rows={3}
        />
        <button onClick={runAI} disabled={loading}
          style={{ background: loading ? C.subtle : C.accent, color: loading ? C.muted : "#000" }}
          className="mt-3 flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all">
          {loading ? <><RefreshCw size={14} className="animate-spin" /> Analyzing…</> : <><Send size={14} /> Generate Insights</>}
        </button>
      </div>

      {loading && (
        <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-8">
          <div className="flex flex-col items-center gap-4">
            <div style={{ borderColor: C.border, borderTopColor: C.accent }} className="w-8 h-8 border-2 rounded-full animate-spin" />
            <span style={{ color: C.muted }} className="text-sm">Claude is analyzing your dataset…</span>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: "#1a0a0a", borderColor: C.red + "44" }} className="rounded-xl border p-6 text-sm" style2={{ color: C.red }}>
          <AlertTriangle size={16} className="inline mr-2" style={{ color: C.red }} />
          <span style={{ color: "#fca5a5" }}>{error}</span>
        </div>
      )}

      {result && (
        <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} style={{ color: C.accent }} />
            <span className="text-sm font-semibold" style={{ color: C.text }}>AI Response</span>
          </div>
          <div style={{ color: C.text }} className="text-sm leading-relaxed whitespace-pre-wrap prose-invert">
            {result.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold mt-4 mb-2" style={{ color: C.accent }}>{line.replace('## ', '')}</h2>;
              if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-bold mt-3 mb-1" style={{ color: C.text }}>{line.replace('### ', '')}</h3>;
              if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold mt-2" style={{ color: C.text }}>{line.replace(/\*\*/g, '')}</p>;
              if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} className="flex gap-2 ml-2 my-1"><span style={{ color: C.accent }}>•</span><span style={{ color: C.muted }}>{line.replace(/^[-•] /, '')}</span></div>;
              if (line.match(/^\d+\. /)) return <div key={i} className="ml-2 my-1" style={{ color: C.muted }}>{line}</div>;
              return <p key={i} className={line === '' ? 'my-2' : 'my-1'} style={{ color: line === '' ? undefined : C.muted }}>{line}</p>;
            })}
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-12 text-center">
          <Sparkles size={32} style={{ color: C.accent, margin: "0 auto 12px", opacity: 0.5 }} />
          <p style={{ color: C.muted }} className="text-sm">Click "Generate Insights" to analyze your dataset with Claude AI</p>
        </div>
      )}
    </div>
  );
};

// DATA QUALITY PAGE
const QualityPage = ({ hasData }) => {
  const [showRuleModal, setShowRuleModal] = useState(false);

  if (!hasData) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4" style={{ color: C.muted }}>
      <Shield size={48} style={{ opacity: 0.3 }} />
      <p>Load a dataset to see quality metrics.</p>
    </div>
  );

  const dims = [
    { label: "Completeness", score: 87, desc: "Non-null values across all fields" },
    { label: "Validity", score: 79, desc: "Values conforming to domain rules" },
    { label: "Uniqueness", score: 94, desc: "Absence of duplicate records" },
    { label: "Consistency", score: 82, desc: "Referential integrity and cross-field logic" },
    { label: "Timeliness", score: 91, desc: "Data freshness vs. SLA" },
    { label: "Accuracy", score: 76, desc: "Correctness vs. reference data" },
  ];

  const overall = Math.round(dims.reduce((a, d) => a + d.score, 0) / dims.length);

  return (
    <div>
      <SectionHeader title="Data Quality Dashboard" sub="Rule-based scoring across 6 dimensions"
        action={
          <button onClick={() => setShowRuleModal(true)}
            style={{ background: C.accentDim, borderColor: C.accent + "44", color: C.accent }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm border">
            <Plus size={14} /> Add Rule
          </button>
        }
      />

      {/* Overall score */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6 flex flex-col items-center gap-2 col-span-1">
          <ScoreGauge score={overall} size={130} />
          <span className="font-bold" style={{ color: C.text }}>Overall Score</span>
          <Badge color={overall >= 85 ? "green" : overall >= 70 ? "amber" : "red"}>
            {overall >= 85 ? "Good" : overall >= 70 ? "Needs Attention" : "Critical"}
          </Badge>
        </div>
        <div className="col-span-3 grid grid-cols-3 gap-4">
          {dims.map(d => (
            <div key={d.label} style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold" style={{ color: C.muted }}>{d.label}</span>
                <span className="text-lg font-black" style={{ color: d.score >= 85 ? C.green : d.score >= 70 ? C.amber : C.red }}>{d.score}</span>
              </div>
              <div className="w-full h-1.5 rounded-full mb-2" style={{ background: C.border }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${d.score}%`, background: d.score >= 85 ? C.green : d.score >= 70 ? C.amber : C.red }} />
              </div>
              <p className="text-xs" style={{ color: C.muted }}>{d.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rules table */}
      <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border overflow-hidden mb-6">
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: C.border }}>
          <span className="font-semibold text-sm" style={{ color: C.text }}>Active Rules</span>
          <span style={{ color: C.muted }} className="text-xs">{RULES.filter(r => r.status === "fail").length} failing</span>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ borderColor: C.border }} className="border-b">
              {["Rule", "Column", "Type", "Severity", "Pass", "Fail", "Status"].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-wider" style={{ color: C.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RULES.map(r => (
              <tr key={r.id} style={{ borderColor: C.border }} className="border-b hover:bg-white/[0.02]">
                <td className="px-6 py-3 font-mono text-sm" style={{ color: C.text }}>{r.name}</td>
                <td className="px-6 py-3 font-mono text-sm" style={{ color: C.accent }}>{r.column}</td>
                <td className="px-6 py-3 text-sm" style={{ color: C.muted }}>{r.type}</td>
                <td className="px-6 py-3">
                  <Badge color={r.severity === "critical" ? "red" : r.severity === "warning" ? "amber" : "slate"}>{r.severity}</Badge>
                </td>
                <td className="px-6 py-3 text-sm font-mono" style={{ color: C.green }}>{r.passes}</td>
                <td className="px-6 py-3 text-sm font-mono" style={{ color: r.fails > 0 ? C.red : C.muted }}>{r.fails}</td>
                <td className="px-6 py-3">
                  {r.status === "pass"
                    ? <div className="flex items-center gap-1.5"><CheckCircle size={12} style={{ color: C.green }} /><span className="text-xs" style={{ color: C.green }}>Pass</span></div>
                    : <div className="flex items-center gap-1.5"><XCircle size={12} style={{ color: C.red }} /><span className="text-xs" style={{ color: C.red }}>Fail</span></div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alert subscription */}
      <div style={{ background: C.card, borderColor: C.border, borderLeft: `3px solid ${C.accent}` }} className="rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={16} style={{ color: C.accent }} />
            <div>
              <span className="font-semibold text-sm" style={{ color: C.text }}>Quality Alerts</span>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>Get notified when DQ score drops below threshold or rules fail.</p>
            </div>
          </div>
          <button style={{ borderColor: C.accent + "55", color: C.accent }} className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-cyan-500/10 transition-all">
            Configure Alerts
          </button>
        </div>
      </div>

      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div style={{ background: C.card, borderColor: C.border }} className="rounded-2xl border p-8 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg" style={{ color: C.text }}>Create DQ Rule</h3>
              <button onClick={() => setShowRuleModal(false)} style={{ color: C.muted }}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {[["Rule Name", "e.g. price_positive"], ["Column", "e.g. price"], ["Condition", "e.g. price > 0"]].map(([lbl, ph]) => (
                <div key={lbl}>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: C.muted }}>{lbl}</label>
                  <input placeholder={ph} style={{ background: C.surface, borderColor: C.border, color: C.text }}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.muted }}>Severity</label>
                <select style={{ background: C.surface, borderColor: C.border, color: C.text }}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none">
                  <option>critical</option><option>warning</option><option>info</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowRuleModal(false)}
                style={{ background: C.accent, color: "#000" }} className="flex-1 py-2.5 rounded-lg font-bold text-sm">
                Create Rule
              </button>
              <button onClick={() => setShowRuleModal(false)}
                style={{ borderColor: C.border, color: C.muted }} className="px-4 py-2.5 rounded-lg text-sm border">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ANOMALIES PAGE
const AnomaliesPage = ({ hasData }) => {
  const [activeFilter, setActiveFilter] = useState("all");

  if (!hasData) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4" style={{ color: C.muted }}>
      <AlertTriangle size={48} style={{ opacity: 0.3 }} />
      <p>No anomaly data yet. Load a dataset.</p>
    </div>
  );

  const anomalies = [
    { id: "ANO-001", type: "Outlier", col: "price", desc: "Value $99,999 is 45σ above mean ($487). Row: ORD-01011", severity: "critical", detected: "5 min ago" },
    { id: "ANO-002", type: "Negative Value", col: "price", desc: "Negative price -$50 detected. Row: ORD-01051", severity: "critical", detected: "5 min ago" },
    { id: "ANO-003", type: "Duplicate ID", col: "order_id", desc: "ORD-01006 appears twice. Rows: 5 and 25", severity: "critical", detected: "5 min ago" },
    { id: "ANO-004", type: "Null Spike", col: "rating", desc: "15% null rate in rating column — above 10% threshold", severity: "warning", detected: "5 min ago" },
    { id: "ANO-005", type: "Rare Category", col: "status", desc: "5% null values in status column — unclassified orders", severity: "warning", detected: "5 min ago" },
    { id: "ANO-006", type: "Zero Quantity", col: "quantity", desc: "1 order with quantity = 0. Row: ORD-01081", severity: "warning", detected: "5 min ago" },
    { id: "ANO-007", type: "Null ID", col: "customer_id", desc: "Null customer_id detected. Row: ORD-01121", severity: "warning", detected: "5 min ago" },
    { id: "ANO-008", type: "Empty Column", col: "revenue", desc: "Column revenue is 100% null — appears uncomputed", severity: "info", detected: "5 min ago" },
  ];

  const filtered = activeFilter === "all" ? anomalies : anomalies.filter(a => a.severity === activeFilter);

  return (
    <div>
      <SectionHeader title="Anomaly Detection" sub="Statistical and rule-based anomaly identification across all columns"
        action={<Badge color="red">{anomalies.filter(a => a.severity === "critical").length} Critical</Badge>}
      />

      {/* Time series anomaly chart */}
      <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6 mb-6">
        <h3 className="font-semibold mb-4" style={{ color: C.text }}>Order Volume Time Series — Anomaly Detection</h3>
        <p className="text-xs mb-4" style={{ color: C.muted }}>Z-score method: |z| &gt; 3 flagged as anomalous (shown in red)</p>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedAnomalyChart data={ANOMALY_DATA} />
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Total Anomalies" value={anomalies.length} sub="This run" color={C.red} icon={AlertTriangle} />
        <KpiCard label="Critical" value={anomalies.filter(a => a.severity === "critical").length} sub="Immediate action needed" color={C.red} icon={XCircle} />
        <KpiCard label="Warnings" value={anomalies.filter(a => a.severity === "warning").length} sub="Review recommended" color={C.amber} icon={AlertCircle} />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "critical", "warning", "info"].map(f => (
          <Pill key={f} active={activeFilter === f} onClick={() => setActiveFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)} {f === "all" ? `(${anomalies.length})` : `(${anomalies.filter(a => a.severity === f).length})`}
          </Pill>
        ))}
      </div>

      {/* Anomaly list */}
      <div className="space-y-3">
        {filtered.map(a => (
          <div key={a.id} style={{ background: C.card, borderColor: a.severity === "critical" ? C.red + "44" : a.severity === "warning" ? C.amber + "44" : C.border }}
            className="rounded-xl border p-5 flex items-start gap-4">
            <div className="mt-0.5">
              {a.severity === "critical" ? <XCircle size={18} style={{ color: C.red }} />
                : a.severity === "warning" ? <AlertTriangle size={18} style={{ color: C.amber }} />
                  : <Info size={18} style={{ color: C.accent }} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-mono text-xs" style={{ color: C.muted }}>{a.id}</span>
                <Badge color={a.severity === "critical" ? "red" : a.severity === "warning" ? "amber" : "cyan"}>{a.type}</Badge>
                <span className="font-mono text-xs" style={{ color: C.accent }}>col: {a.col}</span>
              </div>
              <p className="text-sm" style={{ color: C.text }}>{a.desc}</p>
              <p className="text-xs mt-1" style={{ color: C.muted }}>{a.detected}</p>
            </div>
            <div className="flex gap-2">
              <button style={{ color: C.muted }} className="hover:text-cyan-400 text-xs transition-colors">Investigate</button>
              <button style={{ color: C.muted }} className="hover:text-amber-400 text-xs transition-colors">Suppress</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composed chart for anomaly visualization
const ComposedAnomalyChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={220}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
      <XAxis dataKey="day" tick={{ fill: C.muted, fontSize: 11 }} />
      <YAxis tick={{ fill: C.muted, fontSize: 11 }} />
      <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}
        labelStyle={{ color: C.text }} itemStyle={{ color: C.text }} />
      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
        {data.map((entry, i) => (
          <Cell key={i} fill={Math.abs(entry.z) > 3 ? C.red : C.accent} />
        ))}
      </Bar>
      <Line type="monotone" data={data} dataKey="expected" stroke={C.green} strokeWidth={2} strokeDasharray="5 5" dot={false} />
    </BarChart>
  </ResponsiveContainer>
);

// SETTINGS PAGE
const SettingsPage = () => (
  <div>
    <SectionHeader title="Settings" sub="Project configuration, security, and integrations" />
    <div className="grid grid-cols-2 gap-6">
      {[
        {
          title: "Security & Access", icon: Lock, items: [
            { label: "Authentication", val: "Email + SSO (OIDC)", type: "badge", color: "green" },
            { label: "Your Role", val: "Admin", type: "badge", color: "purple" },
            { label: "MFA", val: "Enabled", type: "badge", color: "green" },
            { label: "Session Timeout", val: "8 hours", type: "text" },
          ]
        },
        {
          title: "Storage", icon: Database, items: [
            { label: "Storage Backend", val: "S3-Compatible", type: "badge", color: "cyan" },
            { label: "Upload Limit", val: "2 GB / file", type: "text" },
            { label: "Retention", val: "90 days", type: "text" },
            { label: "Encryption", val: "AES-256", type: "badge", color: "green" },
          ]
        },
        {
          title: "AI & Processing", icon: Cpu, items: [
            { label: "AI Model", val: "Claude Sonnet 4", type: "badge", color: "purple" },
            { label: "Data Privacy", val: "Local inference opt-in", type: "text" },
            { label: "Worker Threads", val: "4", type: "text" },
            { label: "Async Backend", val: "Celery + Redis", type: "badge", color: "amber" },
          ]
        },
        {
          title: "Alerts & Webhooks", icon: Bell, items: [
            { label: "Email Alerts", val: "Configured", type: "badge", color: "green" },
            { label: "Webhook", val: "Not configured", type: "badge", color: "slate" },
            { label: "DQ Alert Threshold", val: "< 80", type: "text" },
            { label: "Anomaly Sensitivity", val: "Z > 3.0", type: "text" },
          ]
        },
      ].map(sec => (
        <div key={sec.title} style={{ background: C.card, borderColor: C.border }} className="rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-5">
            <sec.icon size={16} style={{ color: C.accent }} />
            <span className="font-semibold" style={{ color: C.text }}>{sec.title}</span>
          </div>
          <div className="space-y-4">
            {sec.items.map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: C.muted }}>{item.label}</span>
                {item.type === "badge" ? <Badge color={item.color}>{item.val}</Badge>
                  : <span className="text-sm font-mono" style={{ color: C.text }}>{item.val}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    {/* Audit log */}
    <div style={{ background: C.card, borderColor: C.border }} className="rounded-xl border mt-6 overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: C.border }}>
        <Clock size={14} style={{ color: C.accent }} />
        <span className="font-semibold text-sm" style={{ color: C.text }}>Audit Log</span>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {[
          { action: "Pipeline run", user: "admin@company.com", time: "14:32", detail: "run-089 completed" },
          { action: "Rule created", user: "admin@company.com", time: "12:18", detail: "price_positive rule added" },
          { action: "Dataset uploaded", user: "admin@company.com", time: "11:45", detail: "ecommerce_orders.csv (48.2 KB)" },
          { action: "Report exported", user: "viewer@company.com", time: "10:02", detail: "Profiling report PDF" },
        ].map((log, i) => (
          <div key={i} className="px-6 py-3 flex items-center gap-4">
            <span className="text-xs font-mono w-12" style={{ color: C.muted }}>{log.time}</span>
            <span className="text-xs font-semibold w-32" style={{ color: C.text }}>{log.action}</span>
            <span className="text-xs" style={{ color: C.accent }}>{log.user}</span>
            <span className="text-xs" style={{ color: C.muted }}>{log.detail}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const Copy = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

export default function App() {
  const [page, setPage] = useState("welcome");
  const [hasData, setHasData] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notification, setNotification] = useState(null);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleLoadSample = () => {
    setHasData(true);
    setPage("pipeline");
    notify("Sample dataset loaded: ecommerce_orders.csv (200 rows, 12 columns)");
  };

  return (
    <div style={{ background: C.bg, fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", color: C.text }} className="flex h-screen overflow-hidden">
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2d47; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>

      {/* Sidebar */}
      <div style={{ background: C.surface, borderColor: C.border, width: sidebarOpen ? 220 : 64, transition: "width 0.3s ease" }}
        className="flex-shrink-0 border-r flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: C.border }}>
          <div style={{ background: C.accentDim, border: `1px solid ${C.accent}33` }}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={16} style={{ color: C.accent }} />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="text-sm font-bold whitespace-nowrap" style={{ color: C.text }}>Data Fusion IQ</div>
              <div className="text-xs font-mono whitespace-nowrap" style={{ color: C.muted }}>v2.4.1</div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ color: C.muted, marginLeft: "auto" }}
            className="hover:text-white transition-colors">
            {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                style={{
                  background: active ? C.accentDim : "transparent",
                  borderColor: active ? C.accent + "33" : "transparent",
                  color: active ? C.accent : C.muted,
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium hover:text-white transition-all text-left">
                <item.icon size={16} className="flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-3">
            <div style={{ background: C.accentDim, border: `1px solid ${C.accent}33` }}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={14} style={{ color: C.accent }} />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <div className="text-xs font-semibold truncate" style={{ color: C.text }}>Admin User</div>
                <div className="text-xs truncate" style={{ color: C.muted }}>admin@company.com</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div style={{ background: C.surface, borderColor: C.border }}
          className="border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {navItems.find(n => n.id === page)?.icon && (() => {
                const Icon = navItems.find(n => n.id === page).icon;
                return <Icon size={14} style={{ color: C.muted }} />;
              })()}
              <span className="text-sm" style={{ color: C.muted }}>
                {navItems.find(n => n.id === page)?.label}
              </span>
            </div>
            {hasData && <Badge color="green">ecommerce_orders.csv</Badge>}
          </div>
          <div className="flex items-center gap-4">
            {!hasData && (
              <button onClick={handleLoadSample}
                style={{ borderColor: C.accent + "55", color: C.accent }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-cyan-500/10 transition-all">
                <Sparkles size={12} /> Load Sample
              </button>
            )}
            <div style={{ background: C.card, borderColor: C.border }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border">
              <Search size={12} style={{ color: C.muted }} />
              <span className="text-xs" style={{ color: C.muted }}>Search…</span>
            </div>
            <Bell size={16} style={{ color: C.muted }} className="cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>

        {/* Notification toast */}
        {notification && (
          <div style={{
            position: "fixed", top: 20, right: 20, zIndex: 100,
            background: C.card, borderColor: notification.type === "success" ? C.green + "44" : C.red + "44",
            border: `1px solid`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
          }} className="rounded-xl px-5 py-3 flex items-center gap-3 min-w-72">
            <CheckCircle size={14} style={{ color: C.green, flexShrink: 0 }} />
            <span className="text-sm" style={{ color: C.text }}>{notification.msg}</span>
            <button onClick={() => setNotification(null)} style={{ color: C.muted }}><X size={12} /></button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {page === "welcome" && <WelcomePage onNavigate={setPage} onLoadSample={handleLoadSample} />}
          {page === "uploads" && <UploadsPage hasData={hasData} onLoadSample={handleLoadSample} />}
          {page === "pipeline" && <PipelinePage hasData={hasData} />}
          {page === "reports" && <ReportsPage hasData={hasData} />}
          {page === "quality" && <QualityPage hasData={hasData} />}
          {page === "anomalies" && <AnomaliesPage hasData={hasData} />}
          {page === "settings" && <SettingsPage />}
        </div>
      </div>
    </div>
  );
}
