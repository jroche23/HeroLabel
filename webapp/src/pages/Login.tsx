import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Tag, ClipboardCheck, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { authClient, useSession } from '@/lib/auth';

type Mode = 'signin' | 'signup';
type SignupStep = 'credentials' | 'role';

const ROLES = [
  {
    id: 'ANNOTATOR',
    label: 'Annotator',
    description: 'Label tasks and submit annotations',
    icon: Tag,
  },
  {
    id: 'REVIEWER',
    label: 'Reviewer',
    description: 'Review and validate completed annotations',
    icon: ClipboardCheck,
  },
  {
    id: 'MANAGER',
    label: 'Manager',
    description: 'Manage projects, tasks and team members',
    icon: FolderKanban,
  },
] as const;

type RoleId = typeof ROLES[number]['id'];

export default function Login() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  const [mode, setMode] = useState<Mode>('signin');
  const [signupStep, setSignupStep] = useState<SignupStep>('credentials');

  // Credentials
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Role
  const [selectedRole, setSelectedRole] = useState<RoleId>('ANNOTATOR');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPending && session) return <Navigate to="/" replace />;

  function switchMode(m: Mode) {
    setMode(m);
    setSignupStep('credentials');
    setError(null);
    setPassword('');
  }

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'signin') {
      setLoading(true);
      setError(null);
      const { error: err } = await authClient.signIn.email({ email: email.trim(), password });
      setLoading(false);
      if (err) {
        setError(err.message ?? 'Invalid email or password.');
      } else {
        navigate('/');
      }
    } else {
      // Move to role selection
      setError(null);
      setSignupStep('role');
    }
  }

  async function handleSignup() {
    setLoading(true);
    setError(null);
    const { error: err } = await (authClient.signUp.email as any)({
      email: email.trim(),
      password,
      name: name.trim() || email.split('@')[0],
      role: selectedRole,
    });
    setLoading(false);
    if (err) {
      setError(err.message ?? 'Could not create account. Please try again.');
      setSignupStep('credentials');
    } else {
      navigate('/');
    }
  }

  const isSignup = mode === 'signup';
  const isRoleStep = isSignup && signupStep === 'role';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a0a0a 40%, #0f0f0f 100%)' }}
    >
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #e5364b 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #c0392b 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #e5364b 0%, transparent 60%)' }} />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#e5364b 1px, transparent 1px), linear-gradient(90deg, #e5364b 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg shadow-red-900/50"
            style={{ background: 'linear-gradient(135deg, #e5364b, #c0392b)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L4 14h8l-3 8 11-12h-8l1-8z" fill="white"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">HeroLabel</h1>
            <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {!isSignup
                ? 'Sign in to your account'
                : signupStep === 'credentials'
                ? 'Create your account'
                : 'Choose your role'}
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-6 shadow-2xl backdrop-blur-sm"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(229,54,75,0.1)',
          }}
        >
          {isRoleStep ? (
            /* ── Step 2: Role selection ── */
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {ROLES.map(({ id, label, description, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedRole(id)}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
                      selectedRole === id
                        ? 'border-red-500/40 bg-red-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20',
                    )}
                  >
                    <div className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                      selectedRole === id ? 'text-white' : 'text-white/40',
                    )}
                      style={selectedRole === id ? { background: 'linear-gradient(135deg, #e5364b, #c0392b)' } : { background: 'rgba(255,255,255,0.08)' }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-2">
                <Button variant="outline"
                  className="flex-1 border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  onClick={() => setSignupStep('credentials')} disabled={loading}>
                  Back
                </Button>
                <Button className="flex-1 font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #e5364b, #c0392b)' }}
                  onClick={handleSignup} disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </Button>
              </div>
            </div>
          ) : (
            /* ── Step 1: Credentials ── */
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {isSignup && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Full name</label>
                  <Input
                    type="text"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/20 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Email address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus={!isSignup}
                  required
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/20 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                <Input
                  type="password"
                  placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/20 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button
                type="submit"
                className="w-full font-semibold text-white shadow-lg shadow-red-900/30 transition-all hover:shadow-red-900/50 hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #e5364b, #c0392b)' }}
                disabled={loading || !email.trim() || !password}
              >
                {loading ? 'Signing in…' : isSignup ? 'Continue' : 'Sign in'}
              </Button>

              <div className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {!isSignup ? (
                  <>
                    Don't have an account?{' '}
                    <button type="button" onClick={() => switchMode('signup')}
                      className="font-semibold text-white/70 hover:text-white transition-colors">
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button type="button" onClick={() => switchMode('signin')}
                      className="font-semibold text-white/70 hover:text-white transition-colors">
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Step indicator for signup */}
        {isSignup && (
          <div className="flex justify-center gap-1.5">
            {(['credentials', 'role'] as SignupStep[]).map((step, i) => (
              <div
                key={step}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  signupStep === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted',
                  i === 0 && signupStep === 'role' ? 'bg-primary/40' : '',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
