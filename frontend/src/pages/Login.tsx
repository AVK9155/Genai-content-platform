import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Droplets, Eye, EyeOff, Shield, Stethoscope, Users, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

function WaterBubble({ delay, left, size, duration }: { delay: number; left: number; size: number; duration: number }) {
  return (
    <div
      className="absolute rounded-full bg-white/10"
      style={{
        left: `${left}%`,
        width: size,
        height: size,
        animation: `bubble-float ${duration}s ease-in ${delay}s infinite`,
      }}
    />
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome to Jal Suraksha! 🌊');
      navigate('/app/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword('password123');
    setLoading(true);
    try {
      await login(quickEmail, 'password123');
      toast.success('Welcome!');
      navigate('/app/dashboard');
    } catch {
      toast.error('Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickAccounts = [
    { label: 'State Admin', email: 'admin@jal-suraksha.gov.in', icon: Shield, color: 'from-red-500 to-rose-600' },
    { label: 'District Officer', email: 'district@jal-suraksha.gov.in', icon: Users, color: 'from-purple-500 to-violet-600' },
    { label: 'PHC Doctor', email: 'doctor@jal-suraksha.gov.in', icon: Stethoscope, color: 'from-emerald-500 to-green-600' },
    { label: 'ASHA Worker', email: 'asha1@jal-suraksha.gov.in', icon: Heart, color: 'from-blue-500 to-indigo-600' },
    { label: 'Villager', email: 'villager1@example.com', icon: Droplets, color: 'from-teal-500 to-cyan-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-login relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated floating bubbles */}
      <WaterBubble delay={0} left={10} size={20} duration={12} />
      <WaterBubble delay={2} left={25} size={14} duration={10} />
      <WaterBubble delay={4} left={40} size={24} duration={14} />
      <WaterBubble delay={1} left={55} size={18} duration={11} />
      <WaterBubble delay={3} left={70} size={16} duration={13} />
      <WaterBubble delay={5} left={85} size={22} duration={9} />
      <WaterBubble delay={0.5} left={15} size={10} duration={15} />
      <WaterBubble delay={3.5} left={60} size={12} duration={12} />
      <WaterBubble delay={2.5} left={90} size={8} duration={16} />
      <WaterBubble delay={6} left={5} size={30} duration={11} />
      <WaterBubble delay={1.5} left={48} size={26} duration={13} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 anim-fade-in-down">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 anim-float"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Droplets className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Jal Suraksha</h1>
          <p className="text-white/70 mt-2 text-sm font-medium">Water-Borne Disease Early Warning System</p>
          <p className="text-white/40 mt-1 text-xs">Northeast India • Smart India Hackathon 2026</p>
        </div>

        {/* Login Form - Glassmorphism Card */}
        <div className="glass rounded-3xl p-8 shadow-2xl anim-scale-in">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="anim-fade-in" style={{ animationDelay: '0.1s' }}>
              <label className="label text-gray-700">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="anim-fade-in" style={{ animationDelay: '0.2s' }}>
              <label className="label text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn-primary w-full text-base font-semibold py-3 anim-fade-in"
              style={{ animationDelay: '0.3s' }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 text-center anim-fade-in" style={{ animationDelay: '0.4s' }}>
            <Link to="/register" className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline transition-colors">
              Create an account →
            </Link>
          </div>
        </div>

        {/* Quick Demo Access */}
        <div className="mt-6 glass rounded-3xl p-6 shadow-xl anim-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-xs text-white/50 text-center mb-4 font-semibold uppercase tracking-wider">Quick Demo Access</p>
          <div className="space-y-2">
            {quickAccounts.map((account, i) => {
              const Icon = account.icon;
              return (
                <button
                  key={account.email}
                  onClick={() => quickLogin(account.email)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]`}
                  style={{
                    background: `linear-gradient(135deg, ${account.color.includes('red') ? 'rgba(239,68,68,0.2)' : account.color.includes('purple') ? 'rgba(139,92,246,0.2)' : account.color.includes('emerald') ? 'rgba(16,185,129,0.2)' : account.color.includes('blue') ? 'rgba(59,130,246,0.2)' : 'rgba(20,184,166,0.2)'}, rgba(255,255,255,0.05))`,
                    border: '1px solid rgba(255,255,255,0.1)',
                    animationDelay: `${0.4 + i * 0.05}s`,
                  }}
                  disabled={loading}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${account.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white/90">{account.label}</span>
                  <span className="ml-auto text-white/30 text-xs">{account.email.split('@')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
