import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_ICONS: Record<string, any> = {
  PENDING: Clock,
  IN_PROGRESS: AlertCircle,
  COMPLETED: CheckCircle,
};

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [form, setForm] = useState({
    caseId: '', assignedTo: '', taskType: 'field_verification', description: '', priority: 'MEDIUM',
  });

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    try {
      const endpoint = user?.role === 'ASHA_WORKER' ? '/tasks/my-tasks' : '/tasks';
      const { data } = await api.get(endpoint);
      setTasks(data);
      if (user?.role !== 'ASHA_WORKER') {
        const [casesRes, workersRes] = await Promise.all([
          api.get('/cases', { params: { status: 'PENDING' } }),
          api.get('/users/asha-workers'),
        ]);
        setCases(casesRes.data);
        setWorkers(workersRes.data);
      }
    } catch { toast.error('Failed to load tasks'); } finally { setLoading(false); }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/tasks', form);
      toast.success('Task created');
      setShowCreate(false);
      loadTasks();
    } catch { toast.error('Failed to create task'); }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await api.put(`/tasks/${taskId}/status`, { status });
      toast.success('Task updated');
      loadTasks();
    } catch { toast.error('Failed to update task'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const pendingTasks = tasks.filter((t) => ['PENDING', 'IN_PROGRESS'].includes(t.status));
  const completedTasks = tasks.filter((t) => ['COMPLETED', 'CANCELLED'].includes(t.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === 'ASHA_WORKER' ? 'My Tasks' : 'Task Management'}
          </h1>
          <p className="text-gray-500">{pendingTasks.length} pending, {completedTasks.length} completed</p>
        </div>
        {user?.role !== 'ASHA_WORKER' && (
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">Assign Task</button>
        )}
      </div>

      {showCreate && (
        <div className="card">
          <h3 className="font-semibold mb-4">Create Task</h3>
          <form onSubmit={createTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Related Case</label>
              <select className="input" value={form.caseId} onChange={(e) => setForm({ ...form, caseId: e.target.value })} required>
                <option value="">Select case</option>
                {cases.map((c) => <option key={c.id} value={c.id}>Case {c.id.slice(0, 8)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assign To</label>
              <select className="input" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} required>
                <option value="">Select worker</option>
                {workers.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.village})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Task Type</label>
              <select className="input" value={form.taskType} onChange={(e) => setForm({ ...form, taskType: e.target.value })}>
                <option value="field_verification">Field Verification</option>
                <option value="sample_collection">Sample Collection</option>
                <option value="water_testing">Water Testing</option>
                <option value="awareness">Awareness Campaign</option>
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <button type="submit" className="btn-primary">Create Task</button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {pendingTasks.map((task) => {
          const Icon = STATUS_ICONS[task.status] || Clock;
          return (
            <div key={task.id} className="card flex items-center gap-4">
              <Icon className="w-5 h-5 text-yellow-500 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{task.taskType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                  <span className={`badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                  <span className="badge-medium">{task.status}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Assigned to: {task.assignee?.name || '—'} • Created: {new Date(task.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {task.status === 'PENDING' && (
                  <button onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')} className="btn-secondary text-xs">Start</button>
                )}
                {task.status === 'IN_PROGRESS' && (
                  <button onClick={() => updateTaskStatus(task.id, 'COMPLETED')} className="btn-primary text-xs">Complete</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {completedTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Completed</h3>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div key={task.id} className="card opacity-75 flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700">{task.taskType.replace('_', ' ')}</span>
                  <p className="text-xs text-gray-500">{task.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
