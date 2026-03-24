import { Shield, Users, FolderKanban, CheckSquare, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "../../../../backend/src/types";

interface RoleInfo {
  icon: React.ReactNode;
  label: string;
  description: string;
  permissions: string[];
}

const roleInfo: Record<Role, RoleInfo> = {
  OWNER: {
    icon: <Shield className="h-5 w-5" />,
    label: "Owner",
    description: "Full control over the organization",
    permissions: [
      "Manage organization settings",
      "Manage billing and subscriptions",
      "Manage all workspaces and projects",
      "Invite and manage all members",
      "View activity logs and analytics",
      "Manage permissions and roles",
    ],
  },
  ADMINISTRATOR: {
    icon: <Users className="h-5 w-5" />,
    label: "Administrator",
    description: "Manage organization and members",
    permissions: [
      "Manage organization settings",
      "Manage all workspaces and projects",
      "Invite and manage members",
      "View activity logs",
      "Manage permissions (except Owners)",
    ],
  },
  MANAGER: {
    icon: <FolderKanban className="h-5 w-5" />,
    label: "Manager",
    description: "Manage assigned workspaces",
    permissions: [
      "Manage assigned workspaces",
      "View all projects in workspace",
      "Manage own projects",
      "Review and update tasks",
      "Assign tasks to team members",
    ],
  },
  REVIEWER: {
    icon: <CheckSquare className="h-5 w-5" />,
    label: "Reviewer",
    description: "Review and approve annotations",
    permissions: [
      "Review annotated tasks",
      "Approve or reject annotations",
      "View all tasks in assigned projects",
      "Update task status",
      "Leave comments and feedback",
    ],
  },
  ANNOTATOR: {
    icon: <Pencil className="h-5 w-5" />,
    label: "Annotator",
    description: "Label and annotate tasks",
    permissions: [
      "View assigned tasks",
      "Label and annotate data",
      "Submit completed annotations",
      "View own task history",
    ],
  },
};

export function RoleDescriptionsSidebar() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Role Descriptions</h3>
      <p className="text-sm text-muted-foreground">
        Different roles have different levels of access and permissions within the organization.
      </p>

      <div className="space-y-3">
        {(Object.keys(roleInfo) as Role[]).map((role) => {
          const info = roleInfo[role];
          return (
            <Card key={role}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {info.icon}
                  {info.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{info.description}</p>
                <div className="space-y-1">
                  {info.permissions.map((permission, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="text-muted-foreground">{permission}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
