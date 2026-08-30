import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Droplets, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const NE_DISTRICTS = ['Kamrup', 'Nagaon', 'Jorhat', 'Dibrugarh', 'Tinsukia', 'Golaghat', 'Sonitpur', 'Lakhimpur', 'Cachar', 'Karimganj'];
const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'as', label: 'Assamese', flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali', flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'kha', label: 'Khasi', flag: '🇮🇳' },
  { code: 'mizo', label: 'Mizo', flag: '🇮🇳' },
  { code: 'nag', label: 'Nagamese', flag: '🇮🇳' },
  { code: 'bodo', label: 'Bodo', flag: '🇮🇳' },
];

function WaterBubble({ delay, left, size, duration }: { delay: number; left: number; size: number; duration: number }) {
  return (
    <div className="absolute rounded-full bg-white/10" style={{ left: `${left}%`, width: size, height: size, animation: `bubble-float ${duration}s ease-in ${delay}s infinite` }} />
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', role: 'VILLAGER',
    village: '', district: '', state: 'Assam', language: 'en',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! 🎉');
      navigate('/app/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-login relative overflow-hidden flex items-center justify-center p-4">
      <WaterBubble delay={0} left={10} size={20} duration={12} />
      <WaterBubble delay={2} left={30} size={16} duration={10} />
      <WaterBubble delay={4} left={60} size={24} duration={14} />
      <WaterBubble delay={1} left={80} size={14} duration={11} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6 anim-fade-in-down">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 anim-float"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Droplets className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Join Jal Suraksha</h1>
          <p className="text-white/60 mt-1 text-sm">Create your account to get started</p>
        </div>

        <div className="glass rounded-3xl p-7 shadow-2xl anim-scale-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="anim-fade-in" style={{ animationDelay: '0.05s' }}>
              <label className="label text-gray-700">Full Name *</label>
              <input className="input" placeholder="Your full name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="anim-fade-in" style={{ animationDelay: '0.1s' }}>
              <label className="label text-gray-700">Email *</label>
              <input type="email" className="input" placeholder="you@example.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="anim-fade-in" style={{ animationDelay: '0.15s' }}>
              <label className="label text-gray-700">Phone</label>
              <input className="input" placeholder="+91..." value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="anim-fade-in" style={{ animationDelay: '0.2s' }}>
              <label className="label text-gray-700">Password *</label>
              <input type="password" className="input" placeholder="Min 6 characters" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <div className="grid grid-cols-2 gap-3 anim-fade-in" style={{ animationDelay: '0.25s' }}>
              <div>
                <label className="label text-gray-700">Role</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="VILLAGER">👤 Villager</option>
                  <option value="ASHA_WORKER">🏥 ASHA Worker</option>
                </select>
              </div>
              <div>
                <label className="label text-gray-700">Language</label>
                <select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
                </select>
              </div>
            </div>
            <div className="anim-fade-in" style={{ animationDelay: '0.3s' }}>
              <label className="label text-gray-700">District</label>
              <select className="input" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                <option value="">Select district</option>
                {NE_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="anim-fade-in" style={{ animationDelay: '0.35s' }}>
              <label className="label text-gray-700">Village</label>
              <input className="input" placeholder="Your village" value={form.village}
                onChange={(e) => setForm({ ...form, village: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary w-full text-base font-semibold py-3 mt-2 anim-fade-in" style={{ animationDelay: '0.4s' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <div className="mt-5 text-center anim-fade-in" style={{ animationDelay: '0.45s' }}>
            <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-1 hover:underline transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
