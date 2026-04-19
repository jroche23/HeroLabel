import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Hexagon, Tag, ClipboardCheck, FolderKanban } from 'lucide-react';
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Hexagon className="h-6 w-6 fill-white text-white" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">HeroLabel</h1>
          <p className="text-sm text-muted-foreground">
            {!isSignup
              ? 'Sign in to your account'
              : signupStep === 'credentials'
              ? 'Create your account'
              : 'Choose your role'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
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
                      'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                      selectedRole === id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                        selectedRole === id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSignupStep('credentials')}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button className="flex-1" onClick={handleSignup} disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </Button>
              </div>
            </div>
          ) : (
            /* ── Step 1: Credentials ── */
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {isSignup && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Full name</label>
                  <Input
                    type="text"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus={!isSignup}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email.trim() || !password}
              >
                {loading
                  ? 'Signing in…'
                  : isSignup
                  ? 'Continue'
                  : 'Sign in'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {!isSignup ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className="font-medium text-foreground hover:underline"
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="font-medium text-foreground hover:underline"
                    >
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
