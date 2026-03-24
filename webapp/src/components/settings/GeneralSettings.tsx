import { useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const COLOR_OPTIONS = [
  '#FFFFFF',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#52C41A',
  '#2DB89A',
  '#4A90D9',
  '#EB5B8C',
];

interface GeneralSettingsProps {
  name: string;
  description: string;
  workspace: string | null;
  workspaceNames: string[];
  onSave: (updates: { name: string; description: string; workspace: string | null }) => void;
}

export function GeneralSettings({
  name: initialName,
  description: initialDescription,
  workspace: initialWorkspace,
  workspaceNames,
  onSave,
}: GeneralSettingsProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [workspace, setWorkspace] = useState<string>(initialWorkspace ?? '');
  const [color, setColor] = useState('#4A90D9');
  const [proxyOpen, setProxyOpen] = useState(false);
  const [proxyLogin, setProxyLogin] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');

  function handleSave() {
    onSave({ name, description, workspace: workspace || null });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">General</h2>
        <p className="text-sm text-muted-foreground">
          Manage your project name, description, and settings.
        </p>
      </div>

      {/* Workspace */}
      <div className="space-y-2">
        <Label htmlFor="workspace">Workspace</Label>
        {workspaceNames.length > 0 ? (
          <Select value={workspace || '__none__'} onValueChange={(v) => setWorkspace(v === '__none__' ? '' : v)}>
            <SelectTrigger id="workspace">
              <SelectValue placeholder="No workspace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No workspace</SelectItem>
              {workspaceNames.map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="workspace"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            placeholder="e.g. Research Team"
          />
        )}
      </div>

      {/* Project Name */}
      <div className="space-y-2">
        <Label htmlFor="project-name">Project Name</Label>
        <Input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter project name"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter a description for this project"
          rows={3}
        />
      </div>

      {/* Color Picker */}
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex items-center gap-2">
          {COLOR_OPTIONS.map((c) => {
            const isSelected = color === c;
            const isWhite = c === '#FFFFFF';
            return (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all',
                  isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  isWhite && 'border border-border',
                )}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              >
                {isSelected ? (
                  <Check
                    className={cn('h-4 w-4', isWhite ? 'text-foreground' : 'text-white')}
                    strokeWidth={3}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Proxy Credentials */}
      <Collapsible open={proxyOpen} onOpenChange={setProxyOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {proxyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Proxy Credentials
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3 pl-5">
          <div className="space-y-2">
            <Label htmlFor="proxy-login">Login</Label>
            <Input
              id="proxy-login"
              value={proxyLogin}
              onChange={(e) => setProxyLogin(e.target.value)}
              placeholder="Proxy login"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proxy-password">Password</Label>
            <Input
              id="proxy-password"
              type="password"
              value={proxyPassword}
              onChange={(e) => setProxyPassword(e.target.value)}
              placeholder="Proxy password"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button variant="outline">Save as Template</Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}
