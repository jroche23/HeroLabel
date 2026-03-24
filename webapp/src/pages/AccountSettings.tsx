import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/store';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function AccountSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});

  useEffect(() => {
    const parts = currentUser.name.trim().split(/\s+/);
    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' '));
    setEmail(currentUser.email);
  }, [currentUser.name, currentUser.email]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    if (!name) return;

    setSavingProfile(true);
    try {
      const patch: { name?: string; email?: string } = {};
      if (name !== currentUser.name) patch.name = name;
      if (email.trim() !== currentUser.email) patch.email = email.trim();

      if (Object.keys(patch).length > 0) {
        await api.patch('/api/users/me', patch);
        await queryClient.invalidateQueries({ queryKey: ['users'] });
      }

      toast({ title: 'Profile saved', description: 'Your changes have been updated.' });
    } catch {
      toast({ title: 'Error', description: 'Could not save changes. Please try again.', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    // Validate all fields inline
    const errors: typeof passwordErrors = {};
    if (!currentPassword) errors.current = 'Please enter your current password.';
    if (!newPassword) errors.new = 'Please enter a new password.';
    else if (newPassword.length < 8) errors.new = 'Must be at least 8 characters.';
    if (!confirmPassword) errors.confirm = 'Please confirm your new password.';
    else if (newPassword && confirmPassword !== newPassword) errors.confirm = 'Passwords do not match.';

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors({});

    setSavingPassword(true);
    try {
      const { error } = await authClient.changePassword({ currentPassword, newPassword });
      if (error) {
        // Map Better Auth's generic message to something actionable
        const msg = (error.message ?? '').toLowerCase();
        if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('wrong')) {
          setPasswordErrors({ current: 'Current password is incorrect.' });
        } else {
          toast({ title: 'Error', description: error.message ?? 'Could not change password.', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Password updated', description: 'Your password has been changed successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordErrors({});
      }
    } catch {
      toast({ title: 'Error', description: 'Could not change password. Please try again.', variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center border-b border-border bg-card px-4 gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground">Account &amp; Settings</span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10 space-y-10">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Account &amp; Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your personal information and preferences.</p>
        </div>

        {/* ── Profile section ── */}
        <section className="rounded-lg border border-border bg-card p-6 space-y-6">
          <h2 className="text-base font-semibold text-foreground">Personal Information</h2>

          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white"
              style={{ backgroundColor: currentUser.color }}
            >
              {currentUser.initials}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{currentUser.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled>
                  <User className="mr-1.5 h-3.5 w-3.5" />
                  Upload Image
                </Button>
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">First name</label>
                <Input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Last name</label>
                <Input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {/* Role (read-only) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Role</label>
              <Input
                type="text"
                value={currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).toLowerCase()}
                readOnly
                className="cursor-not-allowed opacity-60"
              />
              <p className="text-xs text-muted-foreground">Role is assigned by your organization owner.</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingProfile || !firstName.trim()}>
                {savingProfile ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </section>

        {/* ── Password section ── */}
        <section className="rounded-lg border border-border bg-card p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Change Password</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Choose a strong password with at least 8 characters.</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Current password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordErrors((p) => ({ ...p, current: undefined })); }}
                placeholder="••••••••"
                autoComplete="current-password"
                className={passwordErrors.current ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {passwordErrors.current && (
                <p className="text-xs text-destructive">{passwordErrors.current}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">New password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors((p) => ({ ...p, new: undefined })); }}
                placeholder="••••••••"
                autoComplete="new-password"
                className={passwordErrors.new ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {passwordErrors.new ? (
                <p className="text-xs text-destructive">{passwordErrors.new}</p>
              ) : (
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Confirm new password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordErrors((p) => ({ ...p, confirm: undefined })); }}
                placeholder="••••••••"
                autoComplete="new-password"
                className={passwordErrors.confirm ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {passwordErrors.confirm && (
                <p className="text-xs text-destructive">{passwordErrors.confirm}</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {savingPassword ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
