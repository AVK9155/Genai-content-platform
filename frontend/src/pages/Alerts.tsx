import { useState, useEffect } from 'react';
import api from '../lib/api';
import { AlertTriangle, Bell, CheckCircle, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ riskLevel: '', active: 'true' });

  useEffect(() => { loadAlerts(); }, [filter]);

  const loadAlerts = async () => {
    try {
      const params: any = {};
      if (filter.riskLevel) params.riskLevel = filter.riskLevel;
      if (filter.active) params.active = filter.active;
      const { data } = await api.get('/alerts', { params });
      setAlerts(data);
    } catch { toast.error('Failed to load alerts'); } finally { setLoading(false); }
  };

  const dismissAlert = async (id: string) => {
    try {
      await api.put(`/alerts/${id}/dismiss`);
      toast.success('Alert dismissed');
      loadAlerts();
    } catch { toast.error('Failed to dismiss alert'); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 skeleton" />
        <div className="flex gap-3"><div className="h-10 w-32 skeleton rounded-xl" /></div>
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="anim-fade-in-down">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Disease Alerts</h1>
        <p className="text-gray-500 mt-1 font-medium">Active alerts and threshold notifications</p>
      </div>

      <div className="flex gap-3 anim-fade-in" style={{ animationDelay: '0.1s' }}>
        <select className="input w-auto" value={filter.riskLevel} onChange={(e) => setFilter({ ...filter, riskLevel: e.target.value })}>
          <option value="">All Levels</option>
          <option value="CRITICAL">🔴 Critical</option>
          <option value="HIGH">🟠 High</option>
          <option value="MEDIUM">🟡 Medium</option>
          <option value="LOW">🟢 Low</option>
        </select>
        <select className="input w-auto" value={filter.active} onChange={(e) => setFilter({ ...filter, active: e.target.value })}>
          <option value="true">Active</option>
          <option value="false">Dismissed</option>
          <option value="">All</option>
        </select>
      </div>

      <div className="space-y-4 stagger-children">
        {alerts.map((alert, i) => {
          const configs: Record<string, { gradient: string; border: string; iconBg: string; pulse: boolean }> = {
            CRITICAL: { gradient: 'linear-gradient(135deg, #fef2f2, #fff1f2)', border: '#fca5a5', iconBg: 'from-red-500 to-rose-600', pulse: true },
            HIGH: { gradient: 'linear-gradient(135deg, #fff7ed, #fffbeb)', border: '#fdba74', iconBg: 'from-orange-500 to-amber-600', pulse: false },
            MEDIUM: { gradient: 'linear-gradient(135deg, #fefce8, #fef9c3)', border: '#fcd34d', iconBg: 'from-yellow-500 to-amber-500', pulse: false },
            LOW: { gradient: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '#86efac', iconBg: 'from-green-500 to-emerald-600', pulse: false },
          };
          const config = configs[alert.riskLevel] || configs.LOW;

          return (
            <div key={alert.id} className="rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg anim-fade-in"
              style={{ background: config.gradient, border: `1px solid ${config.border}` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${config.iconBg} flex items-center justify-center text-white shadow-lg ${config.pulse ? 'anim-wave' : ''}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">{alert.title}</h3>
                      <span className={`badge-${alert.riskLevel.toLowerCase()}`}>{alert.riskLevel}</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{alert.triggerType.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400 font-medium">
                      <span>📍 {alert.village}, {alert.district}</span>
                      <span>•</span>
                      <span>{new Date(alert.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {alert.isActive && (
                  <button onClick={() => dismissAlert(alert.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/60 hover:bg-white text-gray-600 text-xs font-semibold transition-all duration-200 hover:shadow-md hover:scale-105 shrink-0">
                    <CheckCircle className="w-3.5 h-3.5" /> Dismiss
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {alerts.length === 0 && (
          <div className="card text-center py-12 anim-scale-in">
            <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-semibold">No alerts found</p>
            <p className="text-gray-300 text-sm mt-1">All clear for now</p>
          </div>
        )}
      </div>
    </div>
  );
}
