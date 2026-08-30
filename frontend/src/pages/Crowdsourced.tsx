import { useState, useEffect } from 'react';
import api from '../lib/api';
import { MessageCircle, Plus, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'CONTAMINATED_WATER', label: 'Contaminated Water', emoji: '💧', color: 'from-blue-500 to-cyan-600' },
  { value: 'ILLNESS_CLUSTER', label: 'Illness Cluster', emoji: '🤒', color: 'from-red-500 to-rose-600' },
  { value: 'BROKEN_PIPE', label: 'Broken Pipe', emoji: '🔧', color: 'from-amber-500 to-orange-600' },
  { value: 'OPEN_DRAINAGE', label: 'Open Drainage', emoji: '🚰', color: 'from-yellow-500 to-amber-600' },
  { value: 'DEAD_ANIMAL', label: 'Dead Animal Near Water', emoji: '☠️', color: 'from-gray-600 to-gray-700' },
  { value: 'STAGNANT_WATER', label: 'Stagnant Water', emoji: '🦟', color: 'from-purple-500 to-violet-600' },
  { value: 'OTHER', label: 'Other Issue', emoji: '⚠️', color: 'from-slate-500 to-gray-600' },
];

const STATUS_MAP: Record<string, { label: string; gradient: string }> = {
  NEW: { label: 'New', gradient: 'from-orange-400 to-amber-500' },
  UNDER_REVIEW: { label: 'Under Review', gradient: 'from-blue-400 to-indigo-500' },
  VERIFIED: { label: 'Verified', gradient: 'from-emerald-400 to-green-500' },
  ACTION_TAKEN: { label: 'Action Taken', gradient: 'from-purple-400 to-violet-500' },
  RESOLVED: { label: 'Resolved', gradient: 'from-green-400 to-emerald-500' },
  DISMISSED: { label: 'Dismissed', gradient: 'from-gray-400 to-gray-500' },
};

export default function Crowdsourced() {
  const [reports, setReports] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    reporterName: '', category: 'CONTAMINATED_WATER', description: '',
    village: '', district: '', state: 'Assam',
  });

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    try { const { data } = await api.get('/crowdsourced'); setReports(data); }
    catch { toast.error('Failed to load reports'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/crowdsourced', form);
      toast.success('Report submitted! 🎉 Thank you for contributing.');
      setShowForm(false);
      setForm({ reporterName: '', category: 'CONTAMINATED_WATER', description: '', village: '', district: '', state: 'Assam' });
      loadReports();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to submit'); }
  };

  const NE_DISTRICTS = ['Kamrup', 'Nagaon', 'Jorhat', 'Dibrugarh', 'Tinsukia', 'Golaghat', 'Sonitpur', 'Lakhimpur', 'Cachar', 'Karimganj'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-in-down">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Community Reports</h1>
          <p className="text-gray-500 mt-1 font-medium">Report issues in your area — contaminated water, illness clusters, and more</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 anim-scale-in">
          <Plus className="w-4 h-4" /> Report Issue
        </button>
      </div>

      {showForm && (
        <div className="card anim-fade-in-up">
          <h3 className="font-bold text-gray-900 mb-4">Report an Issue</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Your Name *</label>
                <input className="input" value={form.reporterName} onChange={(e) => setForm({ ...form, reporterName: e.target.value })} required />
              </div>
              <div>
                <label className="label">District *</label>
                <select className="input" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required>
                  <option value="">Select</option>
                  {NE_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Village *</label>
                <input className="input" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="label">Issue Category *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => (
                  <button key={cat.value} type="button"
                    onClick={() => setForm({ ...form, category: cat.value })}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-300 hover:scale-[1.03] hover:shadow-md ${
                      form.category === cat.value
                        ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-500/10 scale-[1.02]'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}>
                    <span className="text-2xl">{cat.emoji}</span>
                    <p className="text-xs font-semibold mt-2 text-gray-700">{cat.label}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Describe the Issue *</label>
              <textarea className="input" rows={3} placeholder="Please describe what you observed..."
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <button type="submit" className="btn-primary">Submit Report</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 skeleton rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {reports.map((report, i) => {
            const cat = CATEGORIES.find((c) => c.value === report.category);
            const status = STATUS_MAP[report.status] || { label: report.status, gradient: 'from-gray-400 to-gray-500' };
            return (
              <div key={report.id} className="card hover-lift anim-fade-in-up cursor-default">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat?.color || 'from-gray-500 to-gray-600'} flex items-center justify-center text-2xl shadow-lg`}>
                    {cat?.emoji || '⚠️'}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white bg-gradient-to-r ${status.gradient}`}>
                    {status.label}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">{cat?.label || report.category}</h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-relaxed">{report.description}</p>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 font-medium">
                  <MapPin className="w-3 h-3" />
                  {report.village}, {report.district}
                  <span className="ml-auto">{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-[10px] text-gray-300 mt-1">Reported by {report.reporterName}</p>
              </div>
            );
          })}
          {reports.length === 0 && (
            <div className="col-span-full text-center py-16 anim-scale-in">
              <div className="text-6xl mb-4 anim-float">📢</div>
              <p className="text-gray-400 text-lg font-semibold">No reports yet</p>
              <p className="text-gray-300 text-sm mt-1">Be the first to report an issue!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
