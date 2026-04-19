import { useState } from "react";
import { X, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Role } from "../../../../backend/src/types";

const PRIVILEGED_ROLES: Role[] = ["OWNER", "ADMINISTRATOR"];

interface InviteMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (emails: string[], role: Role) => Promise<void>;
  isAdmin?: boolean;
}

const roleDescriptions: Record<Role, { label: string; access: string; description: string }> = {
  OWNER: {
    label: "Owner",
    access: "Full access",
    description: "Full access to organization settings, billing, and all workspaces and projects. Can manage all members and permissions.",
  },
  ADMINISTRATOR: {
    label: "Administrator",
    access: "Full access",
    description: "Can manage organization settings, workspaces, and projects. Can invite and manage members (except Owners).",
  },
  MANAGER: {
    label: "Manager",
    access: "Limited access",
    description: "Can manage assigned workspaces and their projects. Can review and update tasks within their scope.",
  },
  REVIEWER: {
    label: "Reviewer",
    access: "Limited access",
    description: "Can review and approve annotated tasks. Can view all tasks but cannot modify settings.",
  },
  ANNOTATOR: {
    label: "Annotator",
    access: "Minimal access",
    description: "Can label and annotate assigned tasks. Can only view tasks assigned to them.",
  },
};

export function InviteMembersModal({ open, onOpenChange, onInvite, isAdmin = false }: InviteMembersModalProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [role, setRole] = useState<Role>("ANNOTATOR");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddEmail = () => {
    setEmails([...emails, ""]);
  };

  const handleRemoveEmail = (index: number) => {
    if (emails.length > 1) {
      const newEmails = emails.filter((_, i) => i !== index);
      setEmails(newEmails);
    }
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const validateEmails = (): string[] => {
    const validEmails = emails.filter((email) => {
      const trimmed = email.trim();
      return trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    });
    return validEmails;
  };

  const handleSubmit = async () => {
    const validEmails = validateEmails();
    if (validEmails.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onInvite(validEmails, role);
      setEmails([""]);
      setRole("ANNOTATOR");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Invite Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email inputs */}
          <div className="space-y-3">
            <Label htmlFor="email-0" className="text-sm font-medium">
              Email addresses
            </Label>
            {emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  id={`email-${index}`}
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  className="flex-1"
                />
                {emails.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveEmail(index)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddEmail}
              className="mt-2"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add another email
            </Button>
          </div>

          {/* Role selector */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium">
              Role
            </Label>
            <div className="flex items-center gap-2">
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger id="role" className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(roleDescriptions) as Role[])
                    .filter((roleKey) => isAdmin || !PRIVILEGED_ROLES.includes(roleKey))
                    .map((roleKey) => (
                      <SelectItem key={roleKey} value={roleKey}>
                        <div className="flex items-center gap-2">
                          <span>{roleDescriptions[roleKey].label}</span>
                          <Badge variant="secondary" className="text-xs">
                            {roleDescriptions[roleKey].access}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Info className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">
                      {roleDescriptions[role].label}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {roleDescriptions[role].description}
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Role description */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              {roleDescriptions[role].description}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || validateEmails().length === 0}
          >
            {isSubmitting ? "Sending..." : "Send Invite"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
