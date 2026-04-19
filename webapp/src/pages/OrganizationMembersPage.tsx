import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { OrganizationMembersTable } from "@/components/members/OrganizationMembersTable";
import { InviteMembersModal } from "@/components/members/InviteMembersModal";
import { RoleDescriptionsSidebar } from "@/components/members/RoleDescriptionsSidebar";
import { memberApi } from "@/lib/memberApi";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/Spinner";
import { useSession } from "@/lib/auth";
import type { Role } from "../../../backend/src/types";

const SUPER_ADMIN_EMAIL = "jorge.roche@deliveryhero.com";

export default function OrganizationMembersPage() {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const isAdmin = session?.user?.email === SUPER_ADMIN_EMAIL;
  const organizationId = "default-org-id";

  // Fetch members
  const { data: members, isLoading } = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: () => memberApi.listMembers(organizationId),
  });

  // Get current user's role
  const currentMember = members?.find((m) => m.userId === currentUserId);
  const currentUserRole = currentMember?.role || "ANNOTATOR";

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: async ({ emails, role }: { emails: string[]; role: Role }) => {
      const promises = emails.map((email) =>
        memberApi.inviteMember(organizationId, { email, role })
      );
      return Promise.all(promises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["organization-members", organizationId] });
      toast({
        title: "Invitations sent",
        description: `Successfully sent ${data.length} invitation(s).`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitations",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      memberApi.updateMemberRole(organizationId, memberId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members", organizationId] });
      toast({
        title: "Role updated",
        description: "Member role has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      memberApi.removeMember(organizationId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members", organizationId] });
      toast({
        title: "Member removed",
        description: "Member has been removed from the organization.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInvite = async (emails: string[], role: Role) => {
    await inviteMutation.mutateAsync({ emails, role });
  };

  const handleRoleChange = async (memberId: string, role: Role) => {
    await updateRoleMutation.mutateAsync({ memberId, role });
  };

  const handleRemoveMember = async (memberId: string) => {
    await removeMemberMutation.mutateAsync(memberId);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Spinner size={40} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Organization Members</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your organization members and their roles.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Main content */}
          <div className="min-w-0 flex-1">
            <OrganizationMembersTable
              members={members || []}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              isAdmin={isAdmin}
              onInviteClick={() => setInviteModalOpen(true)}
              onRoleChange={handleRoleChange}
              onRemoveMember={handleRemoveMember}
            />
          </div>

          {/* Sidebar */}
          <aside className="w-full shrink-0 lg:w-[350px]">
            <RoleDescriptionsSidebar />
          </aside>
        </div>
      </div>

      <InviteMembersModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onInvite={handleInvite}
        isAdmin={isAdmin}
      />
    </AppLayout>
  );
}
