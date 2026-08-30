import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Plus, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const SYMPTOM_OPTIONS = [
  { value: 'DIARRHEA', label: 'Diarrhea' },
  { value: 'VOMITING', label: 'Vomiting' },
  { value: 'FEVER', label: 'Fever' },
  { value: 'DEHYDRATION', label: 'Dehydration' },
  { value: 'NAUSEA', label: 'Nausea' },
  { value: 'ABDOMINAL_PAIN', label: 'Abdominal Pain' },
  { value: 'BLOODY_STOOL', label: 'Bloody Stool' },
  { value: 'MULTIPLE', label: 'Multiple Symptoms' },
];

const SEVERITY_OPTIONS = [
  { value: 'MILD', label: 'Mild', color: 'badge-low' },
  { value: 'MODERATE', label: 'Moderate', color: 'badge-medium' },
  { value: 'SEVERE', label: 'Severe', color: 'badge-high' },
  { value: 'CRITICAL', label: 'Critical', color: 'badge-critical' },
];

export default function Symptoms() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ district: '', symptomType: '' });
  const [form, setForm] = useState({
    reporterName: user?.name || '', reporterPhone: '', village: user?.village || '', district: user?.district || '',
    symptomType: 'DIARRHEA', severity: 'MODERATE', onsetDate: new Date().toISOString().slice(0, 10),
    ageGroup: 'ADULT', affectedCount: '1', waterSourceUsed: '', notes: '', source: 'WEB',
  });

  useEffect(() => { loadReports(); }, [filters]);

  const loadReports = async () => {
    try {
      const params: any = {};
      if (filters.district) params.district = filters.district;
      if (filters.symptomType) params.symptomType = filters.symptomType;
      const { data } = await api.get('/symptoms', { params });
      setReports(data);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/symptoms', {
        ...form,
        affectedCount: parseInt(form.affectedCount),
        onsetDate: new Date(form.onsetDate).toISOString(),
      });
      toast.success('Symptom report submitted!');
      setShowForm(false);
      loadReports();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit');
    }
  };

  const NE_DISTRICTS = ['Kamrup', 'Nagaon', 'Jorhat', 'Dibrugarh', 'Tinsukia', 'Golaghat', 'Sonitpur', 'Lakhimpur', 'Cachar', 'Karimganj'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Symptom Reports</h1>
          <p className="text-gray-500">Report and track disease symptoms in your community</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Report Symptoms
        </button>
      </div>

      {/* Report Form */}
      {showForm && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Submit Symptom Report</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Reporter Name *</label>
              <input className="input" value={form.reporterName} onChange={(e) => setForm({ ...form, reporterName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="+91..." value={form.reporterPhone} onChange={(e) => setForm({ ...form, reporterPhone: e.target.value })} />
            </div>
            <div>
              <label className="label">Symptom Type *</label>
              <select className="input" value={form.symptomType} onChange={(e) => setForm({ ...form, symptomType: e.target.value })}>
                {SYMPTOM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Severity</label>
              <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Onset Date *</label>
              <input type="date" className="input" value={form.onsetDate} onChange={(e) => setForm({ ...form, onsetDate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Age Group</label>
              <select className="input" value={form.ageGroup} onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}>
                <option value="INFANT">Infant (0-1)</option>
                <option value="TODDLER">Toddler (1-5)</option>
                <option value="CHILD">Child (5-18)</option>
                <option value="ADULT">Adult (18-60)</option>
                <option value="ELDERLY">Elderly (60+)</option>
              </select>
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
            <div>
              <label className="label">No. of Affected People</label>
              <input type="number" min="1" className="input" value={form.affectedCount} onChange={(e) => setForm({ ...form, affectedCount: e.target.value })} />
            </div>
            <div>
              <label className="label">Water Source Used</label>
              <input className="input" placeholder="e.g., village well" value={form.waterSourceUsed} onChange={(e) => setForm({ ...form, waterSourceUsed: e.target.value })} />
            </div>
            <div>
              <label className="label">Report Via</label>
              <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                <option value="WEB">Web Portal</option>
                <option value="MOBILE">Mobile App</option>
                <option value="SMS">SMS</option>
                <option value="ASHA">ASHA Worker</option>
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <label className="label">Additional Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary">Submit Report</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select className="input w-auto" value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value })}>
          <option value="">All Districts</option>
          {NE_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input w-auto" value={filters.symptomType} onChange={(e) => setFilters({ ...filters, symptomType: e.target.value })}>
          <option value="">All Symptoms</option>
          {SYMPTOM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {reports.map((report) => {
          const severity = SEVERITY_OPTIONS.find((s) => s.value === report.severity);
          return (
            <div key={report.id} className="card flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{report.reporterName}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{report.village}, {report.district}</span>
                  {severity && <span className={severity.color}>{severity.label}</span>}
                  {report.isVerified && <span className="badge-low">Verified</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                  <span>{SYMPTOM_OPTIONS.find((s) => s.value === report.symptomType)?.label}</span>
                  <span>•</span>
                  <span>{new Date(report.onsetDate).toLocaleDateString()}</span>
                  {report.affectedCount > 1 && <><span>•</span><span>{report.affectedCount} affected</span></>}
                  {report.ageGroup && <><span>•</span><span>{report.ageGroup}</span></>}
                </div>
                {report.notes && <p className="text-xs text-gray-500 mt-1">{report.notes}</p>}
              </div>
            </div>
          );
        })}
        {reports.length === 0 && !loading && (
          <div className="card text-center py-8 text-gray-400">No symptom reports found</div>
        )}
      </div>
    </div>
  );
}
