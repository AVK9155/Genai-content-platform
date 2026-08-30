import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Users as UsersIcon, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<string, string> = {
  VILLAGER: 'badge-low',
  ASHA_WORKER: 'bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full',
  PHC_DOCTOR: 'bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full',
  DISTRICT_OFFICER: 'bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full',
  STATE_ADMIN: 'badge-critical',
};

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: '', district: '', search: '' });

  useEffect(() => { loadUsers(); }, [filters]);

  const loadUsers = async () => {
    try {
      const params: any = {};
      if (filters.role) params.role = filters.role;
      if (filters.district) params.district = filters.district;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get('/users', { params });
      setUsers(data);
    } catch { toast.error('Failed to load users'); } finally { setLoading(false); }
  };

  const toggleActive = async (id: string) => {
    try {
      await api.put(`/users/${id}/toggle-active`);
      toast.success('User updated');
      loadUsers();
    } catch { toast.error('Failed to update user'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500">{users.length} users registered</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input className="input w-64" placeholder="Search name or email..." value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select className="input w-auto" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
          <option value="">All Roles</option>
          <option value="VILLAGER">Villager</option>
          <option value="ASHA_WORKER">ASHA Worker</option>
          <option value="PHC_DOCTOR">PHC Doctor</option>
          <option value="DISTRICT_OFFICER">District Officer</option>
          <option value="STATE_ADMIN">State Admin</option>
        </select>
        <select className="input w-auto" value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value })}>
          <option value="">All Districts</option>
          {['Kamrup', 'Nagaon', 'Jorhat', 'Dibrugarh'].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 text-gray-500 font-medium">Name</th>
              <th className="text-left py-3 px-3 text-gray-500 font-medium">Email</th>
              <th className="text-left py-3 px-3 text-gray-500 font-medium">Role</th>
              <th className="text-left py-3 px-3 text-gray-500 font-medium">District</th>
              <th className="text-left py-3 px-3 text-gray-500 font-medium">Village</th>
              <th className="text-left py-3 px-3 text-gray-500 font-medium">Status</th>
              <th className="text-left py-3 px-3 text-gray-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-3 font-medium">{u.name}</td>
                <td className="py-3 px-3 text-gray-500">{u.email}</td>
                <td className="py-3 px-3"><span className={ROLE_COLORS[u.role]}>{u.role.replace('_', ' ')}</span></td>
                <td className="py-3 px-3 text-gray-500">{u.district || '—'}</td>
                <td className="py-3 px-3 text-gray-500">{u.village || '—'}</td>
                <td className="py-3 px-3">
                  <span className={u.isActive ? 'badge-low' : 'badge-critical'}>{u.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="py-3 px-3">
                  <button onClick={() => toggleActive(u.id)} className="text-xs text-primary-600 hover:underline">
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
