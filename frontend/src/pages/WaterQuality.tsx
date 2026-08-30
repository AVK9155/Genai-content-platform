import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Droplets, Plus, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WaterQuality() {
  const { user } = useAuth();
  const [sources, setSources] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    sourceId: '', testDate: new Date().toISOString().slice(0, 16),
    phLevel: '', turbidity: '', tds: '', chlorineResidual: '',
    ecoliPresence: false, coliformCount: '', notes: '', kitUsed: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [sourcesRes, reportsRes] = await Promise.all([
        api.get('/water-quality/sources'),
        api.get('/water-quality/reports', { params: { limit: 50 } }),
      ]);
      setSources(sourcesRes.data);
      setReports(reportsRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/water-quality/reports', {
        ...form,
        phLevel: form.phLevel ? parseFloat(form.phLevel) : undefined,
        turbidity: form.turbidity ? parseFloat(form.turbidity) : undefined,
        tds: form.tds ? parseFloat(form.tds) : undefined,
        chlorineResidual: form.chlorineResidual ? parseFloat(form.chlorineResidual) : undefined,
        coliformCount: form.coliformCount ? parseInt(form.coliformCount) : undefined,
        testDate: new Date(form.testDate).toISOString(),
        enteredBy: user?.name || 'Unknown',
      });
      toast.success('Water quality report submitted!');
      setShowForm(false);
      setForm({ sourceId: '', testDate: new Date().toISOString().slice(0, 16), phLevel: '', turbidity: '', tds: '', chlorineResidual: '', ecoliPresence: false, coliformCount: '', notes: '', kitUsed: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit');
    }
  };

  const isContaminated = (report: any) => {
    return report.ecoliPresence || (report.phLevel && (report.phLevel < 6.5 || report.phLevel > 8.5)) || (report.turbidity && report.turbidity > 5);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Water Quality Monitoring</h1>
          <p className="text-gray-500">Track and report water test results</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-water flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card"><p className="text-2xl font-bold text-blue-600">{sources.length}</p><p className="text-sm text-gray-500">Water Sources</p></div>
        <div className="card"><p className="text-2xl font-bold text-yellow-600">{sources.filter((s) => s.isContaminated).length}</p><p className="text-sm text-gray-500">Contaminated</p></div>
        <div className="card"><p className="text-2xl font-bold text-green-600">{reports.filter((r) => !isContaminated(r)).length}</p><p className="text-sm text-gray-500">Safe Tests</p></div>
        <div className="card"><p className="text-2xl font-bold text-red-600">{reports.filter((r) => isContaminated(r)).length}</p><p className="text-sm text-gray-500">Failed Tests</p></div>
      </div>

      {/* Report Form */}
      {showForm && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Submit Water Quality Report</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Water Source *</label>
              <select className="input" value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })} required>
                <option value="">Select source</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.village}, {s.district})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Test Date *</label>
              <input type="datetime-local" className="input" value={form.testDate} onChange={(e) => setForm({ ...form, testDate: e.target.value })} required />
            </div>
            <div>
              <label className="label">pH Level</label>
              <input type="number" step="0.1" min="0" max="14" className="input" placeholder="6.5-8.5" value={form.phLevel} onChange={(e) => setForm({ ...form, phLevel: e.target.value })} />
            </div>
            <div>
              <label className="label">Turbidity (NTU)</label>
              <input type="number" step="0.1" min="0" className="input" placeholder="<5 NTU" value={form.turbidity} onChange={(e) => setForm({ ...form, turbidity: e.target.value })} />
            </div>
            <div>
              <label className="label">TDS (mg/L)</label>
              <input type="number" step="1" min="0" className="input" placeholder="<500 mg/L" value={form.tds} onChange={(e) => setForm({ ...form, tds: e.target.value })} />
            </div>
            <div>
              <label className="label">Chlorine Residual (mg/L)</label>
              <input type="number" step="0.01" min="0" className="input" placeholder="0.2-1.0" value={form.chlorineResidual} onChange={(e) => setForm({ ...form, chlorineResidual: e.target.value })} />
            </div>
            <div>
              <label className="label">E. Coli Present</label>
              <div className="flex items-center gap-3 mt-2">
                <button type="button" onClick={() => setForm({ ...form, ecoliPresence: false })} className={`px-3 py-1.5 rounded-lg text-sm ${!form.ecoliPresence ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-600'}`}>
                  <CheckCircle className="w-4 h-4 inline mr-1" /> No
                </button>
                <button type="button" onClick={() => setForm({ ...form, ecoliPresence: true })} className={`px-3 py-1.5 rounded-lg text-sm ${form.ecoliPresence ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-100 text-gray-600'}`}>
                  <XCircle className="w-4 h-4 inline mr-1" /> Yes
                </button>
              </div>
            </div>
            <div>
              <label className="label">Coliform Count</label>
              <input type="number" min="0" className="input" placeholder="0" value={form.coliformCount} onChange={(e) => setForm({ ...form, coliformCount: e.target.value })} />
            </div>
            <div>
              <label className="label">Test Kit Used</label>
              <input className="input" placeholder="e.g., WaterScope" value={form.kitUsed} onChange={(e) => setForm({ ...form, kitUsed: e.target.value })} />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} placeholder="Any observations..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-water">Submit Report</button>
            </div>
          </form>
        </div>
      )}

      {/* Reports Table */}
      <div className="card overflow-x-auto">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Test Results</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Source</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">pH</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Turbidity</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">TDS</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">E.Coli</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Entered By</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3">{report.source?.name || '—'}</td>
                <td className="py-2 px-3 text-gray-500">{new Date(report.testDate).toLocaleDateString()}</td>
                <td className="py-2 px-3">{report.phLevel?.toFixed(1) || '—'}</td>
                <td className="py-2 px-3">{report.turbidity?.toFixed(1) || '—'} NTU</td>
                <td className="py-2 px-3">{report.tds || '—'}</td>
                <td className="py-2 px-3">{report.ecoliPresence ? <span className="text-red-600 font-medium">Positive</span> : <span className="text-green-600">Negative</span>}</td>
                <td className="py-2 px-3">
                  {isContaminated(report) ? (
                    <span className="badge-critical">FAILED</span>
                  ) : (
                    <span className="badge-low">SAFE</span>
                  )}
                </td>
                <td className="py-2 px-3 text-gray-500">{report.enteredBy}</td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-gray-400">No reports yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
