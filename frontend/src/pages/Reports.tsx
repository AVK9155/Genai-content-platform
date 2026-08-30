import { useState, useEffect } from 'react';
import api from '../lib/api';
import { FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Reports() {
  const [summary, setSummary] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [district, setDistrict] = useState('');

  useEffect(() => { loadData(); }, [district]);

  const loadData = async () => {
    try {
      const params = district ? { district } : {};
      const [summaryRes, logsRes] = await Promise.all([
        api.get('/reports/district-summary', { params }),
        api.get('/reports/audit-log'),
      ]);
      setSummary(summaryRes.data);
      setAuditLogs(logsRes.data);
    } catch { toast.error('Failed to load reports'); } finally { setLoading(false); }
  };

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Exports</h1>
          <p className="text-gray-500">Generate compliance reports for state health department</p>
        </div>
        <select className="input w-auto" value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">All Districts</option>
          {['Kamrup', 'Nagaon', 'Jorhat', 'Dibrugarh', 'Tinsukia'].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setActiveTab('summary')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'summary' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
          District Summary
        </button>
        <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'audit' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
          Audit Log
        </button>
      </div>

      {activeTab === 'summary' && summary && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">District Summary Report</h3>
              <button onClick={() => downloadJSON(summary, `district-report-${summary.district}-${new Date().toISOString().slice(0, 10)}.json`)}
                className="btn-secondary text-sm flex items-center gap-1">
                <Download className="w-4 h-4" /> Export JSON
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{summary.totalSymptomReports}</p>
                <p className="text-sm text-gray-600">Symptom Reports</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{summary.waterTestsConducted}</p>
                <p className="text-sm text-gray-600">Water Tests</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{summary.activeAlerts}</p>
                <p className="text-sm text-gray-600">Active Alerts</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{summary.totalCases}</p>
                <p className="text-sm text-gray-600">Total Cases</p>
              </div>
            </div>

            {summary.symptomsByType && Object.keys(summary.symptomsByType).length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Symptoms Breakdown</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summary.symptomsByType).map(([type, count]) => (
                    <span key={type} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                      {type.replace('_', ' ')}: {count as number}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-gray-900 mb-4">Audit Log</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Time</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">User</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Action</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Entity</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="py-2 px-3">{log.user?.name || '—'}</td>
                  <td className="py-2 px-3">{log.action}</td>
                  <td className="py-2 px-3">{log.entity}</td>
                  <td className="py-2 px-3 text-gray-500 text-xs">{log.details ? JSON.stringify(log.details) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
