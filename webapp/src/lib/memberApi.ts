import { api } from "./api";
import type {
  Organization,
  OrganizationMember,
  MemberInvitation,
  CreateOrganizationRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
} from "../../../backend/src/types";

export const memberApi = {
  // Organization endpoints
  listOrganizations: () =>
    api.get<Organization[]>("/api/organizations"),

  getOrganization: (organizationId: string) =>
    api.get<Organization>(`/api/organizations/${organizationId}`),

  createOrganization: (data: CreateOrganizationRequest) =>
    api.post<Organization>("/api/organizations", data),

  // Member endpoints
  listMembers: (organizationId: string) =>
    api.get<OrganizationMember[]>(`/api/organizations/${organizationId}/members`),

  inviteMember: (organizationId: string, data: InviteMemberRequest) =>
    api.post<MemberInvitation>(`/api/organizations/${organizationId}/members/invite`, data),

  updateMemberRole: (organizationId: string, memberId: string, data: UpdateMemberRoleRequest) =>
    api.put<OrganizationMember>(`/api/organizations/${organizationId}/members/${memberId}`, data),

  removeMember: (organizationId: string, memberId: string) =>
    api.delete<void>(`/api/organizations/${organizationId}/members/${memberId}`),

  // Invitation endpoints
  listPendingInvitations: (organizationId: string) =>
    api.get<MemberInvitation[]>(`/api/organizations/${organizationId}/invitations`),

  acceptInvitation: (token: string) =>
    api.post<void>(`/api/invitations/${token}/accept`),
};
