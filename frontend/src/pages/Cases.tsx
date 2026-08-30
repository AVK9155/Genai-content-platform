import { useState, useEffect } from 'react';
import api from '../lib/api';
import { ClipboardCheck, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-high',
  IN_PROGRESS: 'badge-medium',
  VERIFIED: 'badge-low',
  FALSE_POSITIVE: 'bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full',
  ACTION_TAKEN: 'bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full',
  RESOLVED: 'bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full',
};

export default function Cases() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [updateForm, setUpdateForm] = useState({ status: '', notes: '', actionTaken: '' });

  useEffect(() => { loadCases(); }, [filter]);

  const loadCases = async () => {
    try {
      const params: any = {};
      if (filter) params.status = filter;
      const { data } = await api.get('/cases', { params });
      setCases(data);
    } catch { toast.error('Failed to load cases'); } finally { setLoading(false); }
  };

  const updateCase = async (caseId: string) => {
    try {
      await api.put(`/cases/${caseId}/status`, updateForm);
      toast.success('Case updated');
      setSelectedCase(null);
      setUpdateForm({ status: '', notes: '', actionTaken: '' });
      loadCases();
    } catch { toast.error('Failed to update case'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Case Verification</h1>
        <p className="text-gray-500">Review and verify flagged cases</p>
      </div>

      <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="">All Statuses</option>
        {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
      </select>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases List */}
        <div className="lg:col-span-2 space-y-3">
          {cases.map((c) => (
            <div key={c.id} onClick={() => setSelectedCase(c)}
              className={`card cursor-pointer transition-all hover:shadow-md ${selectedCase?.id === c.id ? 'ring-2 ring-primary-500' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">Case {c.id.slice(0, 8)}</span>
                      <span className={STATUS_COLORS[c.status] || ''}>{c.status.replace('_', ' ')}</span>
                      <span className="text-xs text-gray-400">{c.reportType}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{new Date(c.createdAt).toLocaleString()}</p>
                    {c.tasks?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">{c.tasks.length} task(s) assigned</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </div>
          ))}
          {cases.length === 0 && <div className="card text-center py-8 text-gray-400">No cases found</div>}
        </div>

        {/* Case Detail */}
        <div className="lg:col-span-1">
          {selectedCase ? (
            <div className="card sticky top-20">
              <h3 className="font-semibold text-gray-900 mb-4">Case Details</h3>
              <div className="space-y-3 text-sm">
                <div><span className="text-gray-500">Status:</span> <span className={STATUS_COLORS[selectedCase.status]}>{selectedCase.status}</span></div>
                <div><span className="text-gray-500">Type:</span> {selectedCase.reportType}</div>
                {selectedCase.notes && <div><span className="text-gray-500">Notes:</span> {selectedCase.notes}</div>}
                {selectedCase.actionTaken && <div><span className="text-gray-500">Action:</span> {selectedCase.actionTaken}</div>}

                <hr className="my-3" />
                <h4 className="font-medium">Update Status</h4>
                <select className="input text-sm" value={updateForm.status} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}>
                  <option value="">Select status</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="FALSE_POSITIVE">False Positive</option>
                  <option value="ACTION_TAKEN">Action Taken</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
                <textarea className="input text-sm" rows={2} placeholder="Notes..." value={updateForm.notes} onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })} />
                <textarea className="input text-sm" rows={2} placeholder="Action taken..." value={updateForm.actionTaken} onChange={(e) => setUpdateForm({ ...updateForm, actionTaken: e.target.value })} />
                <button onClick={() => updateCase(selectedCase.id)} className="btn-primary w-full text-sm" disabled={!updateForm.status}>
                  Update Case
                </button>
              </div>

              {selectedCase.tasks?.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Assigned Tasks</h4>
                  {selectedCase.tasks.map((task: any) => (
                    <div key={task.id} className="p-2 bg-gray-50 rounded-lg text-xs mb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{task.taskType.replace('_', ' ')}</span>
                        <span className={STATUS_COLORS[task.status] || ''}>{task.status}</span>
                      </div>
                      <p className="text-gray-500 mt-1">{task.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-8 text-gray-400">
              <p>Select a case to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
