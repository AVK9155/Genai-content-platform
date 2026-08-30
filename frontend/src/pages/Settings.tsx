import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [thresholds, setThresholds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const [settingsRes, thresholdsRes] = await Promise.all([
        api.get('/settings'),
        api.get('/settings/thresholds'),
      ]);
      setSettings(settingsRes.data);
      setThresholds(thresholdsRes.data);
    } catch { toast.error('Failed to load settings'); } finally { setLoading(false); }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await api.put('/settings', { key, value, description: thresholds[key + '_description'] || '' });
      toast.success('Setting updated');
      setSettings({ ...settings, [key]: value });
    } catch { toast.error('Failed to update setting'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500">Configure alert thresholds and system parameters</p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Disease Alert Thresholds</h3>
        <div className="space-y-4">
          {Object.entries(thresholds).filter(([k]) => !k.includes('weight')).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <label className="text-sm text-gray-700 w-64">{key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</label>
              <input className="input w-32" value={value}
                onChange={(e) => setThresholds({ ...thresholds, [key]: e.target.value })} />
              <button onClick={() => updateSetting(key, thresholds[key])} className="text-primary-600 hover:text-primary-700">
                <Save className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">System Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Application</span>
            <span className="font-medium">Jal Suraksha v1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Region</span>
            <span className="font-medium">Northeast India</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">SMS Gateway</span>
            <span className="font-medium">{settings.sms_gateway || 'MSG91'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Data Sources</span>
            <span className="font-medium">IDSP, Jal Jeevan Mission, IMD</span>
          </div>
        </div>
      </div>
    </div>
  );
}
