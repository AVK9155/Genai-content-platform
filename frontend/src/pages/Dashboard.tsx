import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import {
  AlertTriangle, Droplets, FileText, Users, Activity, TrendingUp,
  CheckCircle, Clock, MessageCircle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalSymptoms: number; recentSymptoms: number;
  totalWaterReports: number; recentWaterReports: number;
  activeAlerts: number; pendingCases: number;
  totalUsers: number; crowdReports: number;
}

interface TrendData {
  dailyCases: Array<{ date: string; count: number }>;
  symptomsByType: Array<{ symptomType: string; _count: { id: number } }>;
  casesByDistrict: Array<{ district: string; _count: { id: number }; _sum: { affectedCount: number } }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [riskScores, setRiskScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [statsRes, trendsRes, alertsRes, riskRes] = await Promise.all([
        api.get('/dashboard/stats'), api.get('/dashboard/trends'),
        api.get('/alerts', { params: { active: true, limit: 5 } }),
        api.get('/risk'),
      ]);
      setStats(statsRes.data); setTrends(trendsRes.data);
      setAlerts(alertsRes.data); setRiskScores(riskRes.data);
    } catch { toast.error('Failed to load dashboard data'); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 skeleton" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 skeleton rounded-2xl" />
          <div className="h-64 skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Symptom Reports', value: stats?.recentSymptoms || 0, total: stats?.totalSymptoms || 0, icon: FileText, gradient: 'stat-card-blue', sub: 'last 7 days', trend: '+12%' },
    { label: 'Water Tests', value: stats?.recentWaterReports || 0, total: stats?.totalWaterReports || 0, icon: Droplets, gradient: 'stat-card-water', sub: 'last 7 days', trend: '+8%' },
    { label: 'Active Alerts', value: stats?.activeAlerts || 0, icon: AlertTriangle, gradient: 'stat-card-red', trend: '-3%' },
    { label: 'Pending Cases', value: stats?.pendingCases || 0, icon: Clock, gradient: 'stat-card-amber' },
    { label: 'Community Reports', value: stats?.crowdReports || 0, icon: MessageCircle, gradient: 'stat-card-purple', sub: 'last 30 days' },
    { label: 'Active Users', value: stats?.totalUsers || 0, icon: Users, gradient: 'stat-card-green' },
  ];

  const symptomColors: Record<string, string> = {
    DIARRHEA: '#ef4444', VOMITING: '#f59e0b', FEVER: '#f97316',
    DEHYDRATION: '#8b5cf6', NAUSEA: '#06b6d4', ABDOMINAL_PAIN: '#ec4899',
    BLOODY_STOOL: '#dc2626', HEADACHE: '#6366f1', SKIN_RASH: '#14b8a6',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between anim-fade-in-down">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {user?.role === 'ASHA_WORKER' ? 'ASHA Dashboard' : 'Dashboard'}
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            Welcome back, <span className="text-gray-700">{user?.name}</span>
            {user?.district ? <span className="text-primary-600"> • {user.district}</span> : ''}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 stagger-children">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`${card.gradient} rounded-2xl p-5 text-white hover-lift anim-fade-in-up cursor-default`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                {card.trend && (
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${card.trend.startsWith('+') ? 'text-emerald-200' : 'text-red-200'}`}>
                    {card.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {card.trend}
                  </span>
                )}
              </div>
              <p className="text-3xl font-extrabold tracking-tight">{card.value}</p>
              <p className="text-white/70 text-xs font-semibold mt-1">{card.label}</p>
              {card.sub && <p className="text-white/50 text-[10px] mt-0.5">{card.sub}</p>}
              {card.total !== undefined && (
                <p className="text-white/50 text-[10px]">Total: {card.total}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Symptom Trend Chart */}
        <div className="card anim-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Daily Case Trend
          </h3>
          <div className="space-y-2">
            {trends?.dailyCases && trends.dailyCases.length > 0 ? (
              <div className="flex items-end gap-1 h-44">
                {trends.dailyCases.slice(-30).map((day, i) => {
                  const maxCount = Math.max(...trends.dailyCases.map((d) => Number(d.count)));
                  const height = maxCount > 0 ? (Number(day.count) / maxCount) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group cursor-pointer bar-animate" style={{ animationDelay: `${i * 0.02}s` }}>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-gray-700 mb-1">{Number(day.count)}</div>
                      <div
                        className="w-full rounded-t-md transition-all duration-200 group-hover:shadow-lg"
                        style={{
                          height: `${Math.max(height, 4)}%`,
                          background: `linear-gradient(180deg, #3b82f6, #1d4ed8)`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-gray-400">No data</div>
            )}
          </div>
        </div>

        {/* Symptoms by Type */}
        <div className="card anim-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-500" />
            Cases by Symptom Type
          </h3>
          <div className="space-y-3">
            {trends?.symptomsByType.map((item, i) => {
              const maxCount = Math.max(...(trends.symptomsByType.map((s) => s._count.id)));
              const width = maxCount > 0 ? (item._count.id / maxCount) * 100 : 0;
              return (
                <div key={item.symptomType} className="group" style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-600 w-28 text-right truncate">{item.symptomType.replace(/_/g, ' ')}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-6 rounded-full transition-all duration-700 ease-out group-hover:shadow-md bar-animate"
                        style={{ width: `${width}%`, background: `linear-gradient(90deg, ${symptomColors[item.symptomType] || '#6b7280'}, ${symptomColors[item.symptomType] || '#6b7280'}88)` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-8 text-right">{item._count.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="card anim-fade-in-up" style={{ animationDelay: '0.35s' }}>
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Active Alerts
            <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>
          </h3>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {alerts.length > 0 ? alerts.map((alert, i) => (
              <div key={alert.id} className="p-4 rounded-xl transition-all duration-200 hover:scale-[1.01] cursor-pointer anim-fade-in"
                style={{
                  animationDelay: `${0.4 + i * 0.05}s`,
                  background: alert.riskLevel === 'CRITICAL'
                    ? 'linear-gradient(135deg, #fef2f2, #fee2e2)'
                    : alert.riskLevel === 'HIGH'
                    ? 'linear-gradient(135deg, #fff7ed, #ffedd5)'
                    : 'linear-gradient(135deg, #fefce8, #fef9c3)',
                  border: `1px solid ${alert.riskLevel === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : alert.riskLevel === 'HIGH' ? 'rgba(249,115,22,0.2)' : 'rgba(234,179,8,0.2)'}`,
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge-${alert.riskLevel.toLowerCase()}`}>{alert.riskLevel}</span>
                  <span className="text-[10px] text-gray-400 font-medium uppercase">{alert.triggerType.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm font-bold text-gray-900">{alert.title}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{alert.message}</p>
                <p className="text-[10px] text-gray-400 mt-2">📍 {alert.village}, {alert.district}</p>
              </div>
            )) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No active alerts</p>
              </div>
            )}
          </div>
        </div>

        {/* Risk Scores */}
        <div className="card anim-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Risk Scores
          </h3>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {riskScores.length > 0 ? riskScores.slice(0, 10).map((risk, i) => (
              <div key={risk.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer anim-fade-in"
                style={{ animationDelay: `${0.45 + i * 0.04}s` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                    style={{
                      background: risk.riskLevel === 'CRITICAL' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' :
                        risk.riskLevel === 'HIGH' ? 'linear-gradient(135deg, #f97316, #ea580c)' :
                        risk.riskLevel === 'MEDIUM' ? 'linear-gradient(135deg, #eab308, #ca8a04)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                    }}>
                    {Math.round(risk.score)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{risk.village}</p>
                    <p className="text-xs text-gray-500">{risk.district}</p>
                  </div>
                </div>
                <span className={`badge-${risk.riskLevel.toLowerCase()}`}>{risk.riskLevel}</span>
              </div>
            )) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No risk scores calculated yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* District Breakdown */}
      {trends?.casesByDistrict && trends.casesByDistrict.length > 0 && (
        <div className="card anim-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Cases by District
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 stagger-children">
            {trends.casesByDistrict.map((d, i) => {
              const maxCases = Math.max(...trends.casesByDistrict.map((x) => x._count.id));
              const intensity = maxCases > 0 ? d._count.id / maxCases : 0;
              return (
                <div key={d.district} className="p-4 rounded-xl text-center transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer anim-fade-in-up"
                  style={{
                    background: `linear-gradient(135deg, rgba(37,99,235,${0.05 + intensity * 0.15}), rgba(99,102,241,${0.03 + intensity * 0.1}))`,
                    border: `1px solid rgba(37,99,235,${0.05 + intensity * 0.15})`,
                  }}>
                  <p className="text-3xl font-extrabold text-gray-900">{d._count.id}</p>
                  <p className="text-sm font-semibold text-gray-600 mt-1">{d.district}</p>
                  <p className="text-xs text-gray-400">{d._sum.affectedCount} affected</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
