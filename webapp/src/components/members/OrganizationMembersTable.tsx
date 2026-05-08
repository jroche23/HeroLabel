import { useState } from "react";
import { MoreVertical, Search, Filter, Settings2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { OrganizationMember, Role } from "@/types/shared";

const PRIVILEGED_ROLES: Role[] = ["OWNER", "ADMINISTRATOR"];

interface OrganizationMembersTableProps {
  members: OrganizationMember[];
  currentUserId: string;
  currentUserRole: Role;
  isAdmin?: boolean;
  onInviteClick: () => void;
  onRoleChange: (memberId: string, role: Role) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
}

const roleLabels: Record<Role, string> = {
  OWNER: "Owner",
  ADMINISTRATOR: "Administrator",
  MANAGER: "Manager",
  REVIEWER: "Reviewer",
  ANNOTATOR: "Annotator",
};

const roleColors: Record<Role, string> = {
  OWNER: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  ADMINISTRATOR: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  MANAGER: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  REVIEWER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ANNOTATOR: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

type ColumnKey = "id" | "name" | "email" | "role" | "lastActive" | "dateAdded" | "actions";

const defaultVisibleColumns: ColumnKey[] = ["name", "email", "role", "lastActive", "dateAdded", "actions"];

export function OrganizationMembersTable({
  members,
  currentUserId,
  currentUserRole,
  isAdmin = false,
  onInviteClick,
  onRoleChange,
  onRemoveMember,
}: OrganizationMembersTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(defaultVisibleColumns);

  const canManageMembers = currentUserRole === "OWNER" || currentUserRole === "ADMINISTRATOR";

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user?.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getLastActiveText = (member: OrganizationMember) => {
    if (member.status === "inactive") {
      return "Inactive";
    }
    // Simulate last active - in real app this would come from the backend
    return "Today";
  };

  const toggleColumn = (column: ColumnKey) => {
    setVisibleColumns((prev) =>
      prev.includes(column)
        ? prev.filter((col) => col !== column)
        : [...prev, column]
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as Role | "all")}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles ({members.length})</SelectItem>
              {(Object.keys(roleLabels) as Role[]).map((role) => {
                const count = members.filter((m) => m.role === role).length;
                return (
                  <SelectItem key={role} value={role}>
                    {roleLabels[role]} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.includes("id")}
                onCheckedChange={() => toggleColumn("id")}
              >
                ID
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.includes("name")}
                onCheckedChange={() => toggleColumn("name")}
              >
                Name
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.includes("email")}
                onCheckedChange={() => toggleColumn("email")}
              >
                Email
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.includes("role")}
                onCheckedChange={() => toggleColumn("role")}
              >
                Role
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.includes("lastActive")}
                onCheckedChange={() => toggleColumn("lastActive")}
              >
                Last Active
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.includes("dateAdded")}
                onCheckedChange={() => toggleColumn("dateAdded")}
              >
                Date Added
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button onClick={onInviteClick}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Members
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.includes("id") ? <TableHead className="w-20">ID</TableHead> : null}
              {visibleColumns.includes("name") ? <TableHead>Name</TableHead> : null}
              {visibleColumns.includes("email") ? <TableHead>Email</TableHead> : null}
              {visibleColumns.includes("role") ? <TableHead>Role</TableHead> : null}
              {visibleColumns.includes("lastActive") ? <TableHead>Last Active</TableHead> : null}
              {visibleColumns.includes("dateAdded") ? <TableHead>Date Added</TableHead> : null}
              {visibleColumns.includes("actions") ? <TableHead className="w-12"></TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  {visibleColumns.includes("id") ? (
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {member.id.slice(0, 8)}
                    </TableCell>
                  ) : null}
                  {visibleColumns.includes("name") ? (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user?.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.user?.name ? getInitials(member.user.name) : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.user?.name}</span>
                        {member.userId === currentUserId ? (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
                  {visibleColumns.includes("email") ? (
                    <TableCell className="text-muted-foreground">
                      {member.user?.email}
                    </TableCell>
                  ) : null}
                  {visibleColumns.includes("role") ? (
                    <TableCell>
                      {canManageMembers && member.userId !== currentUserId ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) => onRoleChange(member.id, value as Role)}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(roleLabels) as Role[])
                              .filter((r) => isAdmin || !PRIVILEGED_ROLES.includes(r))
                              .map((r) => (
                                <SelectItem key={r} value={r}>
                                  {roleLabels[r]}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={roleColors[member.role]}>
                          {roleLabels[member.role]}
                        </Badge>
                      )}
                    </TableCell>
                  ) : null}
                  {visibleColumns.includes("lastActive") ? (
                    <TableCell>
                      {member.status === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          {getLastActiveText(member)}
                        </span>
                      )}
                    </TableCell>
                  ) : null}
                  {visibleColumns.includes("dateAdded") ? (
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.createdAt)}
                    </TableCell>
                  ) : null}
                  {visibleColumns.includes("actions") ? (
                    <TableCell>
                      {canManageMembers && member.userId !== currentUserId ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onRemoveMember(member.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing {filteredMembers.length} of {members.length} members
        </div>
      </div>
    </div>
  );
}
