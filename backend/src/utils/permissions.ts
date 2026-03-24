import { Role, RolePermissions } from "../types";

/**
 * Role permissions matrix defining what each role can do
 * Based on the Label Studio Enterprise permission model
 */
export const ROLE_PERMISSIONS: Record<Role, RolePermissions["permissions"]> = {
  OWNER: {
    // Full access to everything
    manageOrganization: true,
    manageAllWorkspaces: true,
    manageAllProjects: true,
    viewActivityLog: true,
    manageUsageAndLicense: true,
    viewUsageAndLicense: true,
    managePermissions: true,
    approveInvitations: true,
    manageAssignedWorkspaces: true,
    viewAllProjects: true,
    manageOwnProjects: true,
    reviewTasks: true,
    updateAnnotatedTasks: true,
    labelTasks: true,
    viewAllTasks: true,
    viewAssignedTasks: true,
    viewOwnTasks: true,
  },
  ADMINISTRATOR: {
    // Full access except organization management
    manageOrganization: false,
    manageAllWorkspaces: true,
    manageAllProjects: true,
    viewActivityLog: true,
    manageUsageAndLicense: false,
    viewUsageAndLicense: true,
    managePermissions: true,
    approveInvitations: true,
    manageAssignedWorkspaces: true,
    viewAllProjects: true,
    manageOwnProjects: true,
    reviewTasks: true,
    updateAnnotatedTasks: true,
    labelTasks: true,
    viewAllTasks: true,
    viewAssignedTasks: true,
    viewOwnTasks: true,
  },
  MANAGER: {
    // Limited to assigned workspaces and own projects
    manageOrganization: false,
    manageAllWorkspaces: false,
    manageAllProjects: false,
    viewActivityLog: false,
    manageUsageAndLicense: false,
    viewUsageAndLicense: false,
    managePermissions: false,
    approveInvitations: false,
    manageAssignedWorkspaces: true,
    viewAllProjects: true,
    manageOwnProjects: true,
    reviewTasks: true,
    updateAnnotatedTasks: true,
    labelTasks: true,
    viewAllTasks: false,
    viewAssignedTasks: true,
    viewOwnTasks: true,
  },
  REVIEWER: {
    // Can review and label tasks
    manageOrganization: false,
    manageAllWorkspaces: false,
    manageAllProjects: false,
    viewActivityLog: false,
    manageUsageAndLicense: false,
    viewUsageAndLicense: false,
    managePermissions: false,
    approveInvitations: false,
    manageAssignedWorkspaces: false,
    viewAllProjects: false,
    manageOwnProjects: false,
    reviewTasks: true,
    updateAnnotatedTasks: true,
    labelTasks: true,
    viewAllTasks: false,
    viewAssignedTasks: true,
    viewOwnTasks: true,
  },
  ANNOTATOR: {
    // Can only label and view own/assigned tasks
    manageOrganization: false,
    manageAllWorkspaces: false,
    manageAllProjects: false,
    viewActivityLog: false,
    manageUsageAndLicense: false,
    viewUsageAndLicense: false,
    managePermissions: false,
    approveInvitations: false,
    manageAssignedWorkspaces: false,
    viewAllProjects: false,
    manageOwnProjects: false,
    reviewTasks: false,
    updateAnnotatedTasks: false,
    labelTasks: true,
    viewAllTasks: false,
    viewAssignedTasks: true,
    viewOwnTasks: true,
  },
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: Role,
  permission: keyof RolePermissions["permissions"]
): boolean {
  return ROLE_PERMISSIONS[role][permission];
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): RolePermissions {
  return {
    role,
    permissions: ROLE_PERMISSIONS[role],
  };
}

/**
 * Check if a role can invite members with a specific role
 * Only owners and administrators can invite, and they can't invite roles higher than their own
 */
export function canInviteRole(inviterRole: Role, inviteeRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    OWNER: 5,
    ADMINISTRATOR: 4,
    MANAGER: 3,
    REVIEWER: 2,
    ANNOTATOR: 1,
  };

  // Must have permission to approve invitations
  if (!hasPermission(inviterRole, "approveInvitations")) {
    return false;
  }

  // Can only invite roles at same level or lower
  return roleHierarchy[inviterRole] >= roleHierarchy[inviteeRole];
}

/**
 * Check if a role can update another member's role
 * Same rules as invitation
 */
export function canUpdateMemberRole(
  updaterRole: Role,
  currentMemberRole: Role,
  newMemberRole: Role
): boolean {
  const roleHierarchy: Record<Role, number> = {
    OWNER: 5,
    ADMINISTRATOR: 4,
    MANAGER: 3,
    REVIEWER: 2,
    ANNOTATOR: 1,
  };

  // Must have permission to manage permissions
  if (!hasPermission(updaterRole, "managePermissions")) {
    return false;
  }

  // Can only update roles lower than or equal to own role
  return (
    roleHierarchy[updaterRole] >= roleHierarchy[currentMemberRole] &&
    roleHierarchy[updaterRole] >= roleHierarchy[newMemberRole]
  );
}

/**
 * Check if a role can remove another member
 * Can only remove members with lower or equal role
 */
export function canRemoveMember(removerRole: Role, targetRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    OWNER: 5,
    ADMINISTRATOR: 4,
    MANAGER: 3,
    REVIEWER: 2,
    ANNOTATOR: 1,
  };

  // Must have permission to manage permissions
  if (!hasPermission(removerRole, "managePermissions")) {
    return false;
  }

  // Can only remove roles lower than own role (not equal)
  return roleHierarchy[removerRole] > roleHierarchy[targetRole];
}
