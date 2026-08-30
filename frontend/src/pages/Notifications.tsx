import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Bell, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadNotifications(); }, [filter]);

  const loadNotifications = async () => {
    try {
      const params = filter === 'unread' ? { unread: 'true' } : {};
      const { data } = await api.get('/notifications', { params });
      setNotifications(data);
    } catch { toast.error('Failed to load notifications'); } finally { setLoading(false); }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* silent */ }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  };

  const typeIcons: Record<string, string> = {
    ALERT: '🚨', TASK_ASSIGNMENT: '📋', TASK_REMINDER: '⏰', ADVISORY: '📢', STATUS_UPDATE: '🔄', SYSTEM: '⚙️',
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">{notifications.filter((n) => !n.isRead).length} unread</p>
        </div>
        <div className="flex gap-2">
          <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="unread">Unread</option>
          </select>
          <button onClick={markAllAsRead} className="btn-secondary text-sm flex items-center gap-1">
            <Check className="w-4 h-4" /> Mark all read
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {notifications.map((n) => (
          <div key={n.id} className={`card flex items-start gap-3 transition-colors ${!n.isRead ? 'bg-blue-50 border-blue-100' : ''}`}
            onClick={() => !n.isRead && markAsRead(n.id)}>
            <span className="text-xl shrink-0">{typeIcons[n.type] || '📩'}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</h3>
                {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="card text-center py-8">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
}
