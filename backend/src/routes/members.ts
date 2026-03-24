import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../prisma";
import {
  inviteMemberSchema,
  updateMemberRoleSchema,
  updateMemberStatusSchema,
  createOrganizationSchema,
} from "../types";
import {
  canInviteRole,
  canUpdateMemberRole,
  canRemoveMember,
  hasPermission,
} from "../utils/permissions";
import { randomBytes } from "crypto";

// Create router with typed context for auth
const membersRouter = new Hono<{
  Variables: {
    user: any;
    session: any;
  };
}>();

// Auth middleware - require authentication for all routes
membersRouter.use("*", async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }
  await next();
});

// Helper function to generate secure random token
function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

// Helper function to get member with role check
async function getMemberWithPermission(
  organizationId: string,
  userId: string,
  requiredPermission?: keyof ReturnType<typeof hasPermission> extends never
    ? string
    : Parameters<typeof hasPermission>[1]
) {
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId,
      status: "active",
    },
  });

  if (!member) {
    return null;
  }

  if (requiredPermission && !hasPermission(member.role, requiredPermission)) {
    return null;
  }

  return member;
}

// ==========================================
// Organization Management
// ==========================================

// POST /api/organizations - Create a new organization
membersRouter.post(
  "/organizations",
  zValidator("json", createOrganizationSchema),
  async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");

    // Create organization and add creator as owner
    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
            status: "active",
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    const transformedOrganization = {
      ...organization,
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString(),
      members: organization.members.map((member) => ({
        ...member,
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString(),
      })),
    };

    return c.json({ data: transformedOrganization }, 201);
  }
);

// GET /api/organizations - List user's organizations
membersRouter.get("/organizations", async (c) => {
  const user = c.get("user");

  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId: user.id,
      status: "active",
    },
    include: {
      organization: true,
    },
  });

  const transformedOrganizations = memberships.map((membership) => ({
    ...membership.organization,
    createdAt: membership.organization.createdAt.toISOString(),
    updatedAt: membership.organization.updatedAt.toISOString(),
    role: membership.role,
    memberSince: membership.createdAt.toISOString(),
  }));

  return c.json({ data: transformedOrganizations });
});

// GET /api/organizations/:orgId - Get organization details
membersRouter.get("/organizations/:orgId", async (c) => {
  const user = c.get("user");
  const organizationId = c.req.param("orgId");

  // Check if user is a member
  const member = await getMemberWithPermission(organizationId, user.id);
  if (!member) {
    return c.json(
      { error: { message: "Not a member of this organization", code: "FORBIDDEN" } },
      403
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!organization) {
    return c.json(
      { error: { message: "Organization not found", code: "NOT_FOUND" } },
      404
    );
  }

  const transformedOrganization = {
    ...organization,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    members: organization.members.map((member) => ({
      ...member,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    })),
  };

  return c.json({ data: transformedOrganization });
});

// ==========================================
// Member Management
// ==========================================

// GET /api/organizations/:orgId/members - List all members
membersRouter.get("/organizations/:orgId/members", async (c) => {
  const user = c.get("user");
  const organizationId = c.req.param("orgId");

  // Check if user is a member
  const member = await getMemberWithPermission(organizationId, user.id);
  if (!member) {
    return c.json(
      { error: { message: "Not a member of this organization", code: "FORBIDDEN" } },
      403
    );
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const transformedMembers = members.map((member) => ({
    ...member,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  }));

  return c.json({ data: transformedMembers });
});

// POST /api/organizations/:orgId/members/invite - Send invitation
membersRouter.post(
  "/organizations/:orgId/members/invite",
  zValidator("json", inviteMemberSchema),
  async (c) => {
    const user = c.get("user");
    const organizationId = c.req.param("orgId");
    const data = c.req.valid("json");

    // Check if user has permission to invite
    const inviter = await getMemberWithPermission(
      organizationId,
      user.id,
      "approveInvitations"
    );
    if (!inviter) {
      return c.json(
        { error: { message: "Not authorized to invite members", code: "FORBIDDEN" } },
        403
      );
    }

    // Check if inviter can invite this role
    if (!canInviteRole(inviter.role, data.role)) {
      return c.json(
        {
          error: {
            message: `You cannot invite members with role ${data.role}`,
            code: "FORBIDDEN",
          },
        },
        403
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        user: {
          email: data.email,
        },
      },
    });

    if (existingMember) {
      return c.json(
        {
          error: {
            message: "User is already a member of this organization",
            code: "CONFLICT",
          },
        },
        409
      );
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.memberInvitation.findFirst({
      where: {
        organizationId,
        email: data.email,
        status: "pending",
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvitation) {
      return c.json(
        {
          error: {
            message: "User already has a pending invitation",
            code: "CONFLICT",
          },
        },
        409
      );
    }

    // Create invitation (expires in 7 days)
    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.memberInvitation.create({
      data: {
        organizationId,
        email: data.email,
        role: data.role,
        invitedBy: user.id,
        token,
        expiresAt,
        status: "pending",
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const transformedInvitation = {
      ...invitation,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    };

    return c.json({ data: transformedInvitation }, 201);
  }
);

// PUT /api/organizations/:orgId/members/:memberId - Update member role
membersRouter.put(
  "/organizations/:orgId/members/:memberId",
  zValidator("json", updateMemberRoleSchema),
  async (c) => {
    const user = c.get("user");
    const organizationId = c.req.param("orgId");
    const memberId = c.req.param("memberId");
    const data = c.req.valid("json");

    // Check if user has permission to manage permissions
    const updater = await getMemberWithPermission(
      organizationId,
      user.id,
      "managePermissions"
    );
    if (!updater) {
      return c.json(
        { error: { message: "Not authorized to update member roles", code: "FORBIDDEN" } },
        403
      );
    }

    // Get the target member
    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.organizationId !== organizationId) {
      return c.json(
        { error: { message: "Member not found", code: "NOT_FOUND" } },
        404
      );
    }

    // Check if updater can change this member's role
    if (!canUpdateMemberRole(updater.role, targetMember.role, data.role)) {
      return c.json(
        {
          error: {
            message: "Not authorized to update this member's role",
            code: "FORBIDDEN",
          },
        },
        403
      );
    }

    // Don't allow changing own role
    if (targetMember.userId === user.id) {
      return c.json(
        {
          error: {
            message: "Cannot change your own role",
            code: "FORBIDDEN",
          },
        },
        403
      );
    }

    // Update member role
    const updatedMember = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: data.role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    const transformedMember = {
      ...updatedMember,
      createdAt: updatedMember.createdAt.toISOString(),
      updatedAt: updatedMember.updatedAt.toISOString(),
    };

    return c.json({ data: transformedMember });
  }
);

// DELETE /api/organizations/:orgId/members/:memberId - Remove member
membersRouter.delete("/organizations/:orgId/members/:memberId", async (c) => {
  const user = c.get("user");
  const organizationId = c.req.param("orgId");
  const memberId = c.req.param("memberId");

  // Check if user has permission to manage permissions
  const remover = await getMemberWithPermission(
    organizationId,
    user.id,
    "managePermissions"
  );
  if (!remover) {
    return c.json(
      { error: { message: "Not authorized to remove members", code: "FORBIDDEN" } },
      403
    );
  }

  // Get the target member
  const targetMember = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.organizationId !== organizationId) {
    return c.json(
      { error: { message: "Member not found", code: "NOT_FOUND" } },
      404
    );
  }

  // Check if remover can remove this member
  if (!canRemoveMember(remover.role, targetMember.role)) {
    return c.json(
      {
        error: {
          message: "Not authorized to remove this member",
          code: "FORBIDDEN",
        },
      },
      403
    );
  }

  // Don't allow removing self
  if (targetMember.userId === user.id) {
    return c.json(
      {
        error: {
          message: "Cannot remove yourself from the organization",
          code: "FORBIDDEN",
        },
      },
      403
    );
  }

  // Check if this is the last owner
  if (targetMember.role === "OWNER") {
    const ownerCount = await prisma.organizationMember.count({
      where: {
        organizationId,
        role: "OWNER",
        status: "active",
      },
    });

    if (ownerCount <= 1) {
      return c.json(
        {
          error: {
            message: "Cannot remove the last owner of the organization",
            code: "FORBIDDEN",
          },
        },
        403
      );
    }
  }

  // Remove member
  await prisma.organizationMember.delete({
    where: { id: memberId },
  });

  return c.body(null, 204);
});

// ==========================================
// Invitation Management
// ==========================================

// GET /api/invitations/pending - Get user's pending invitations
membersRouter.get("/invitations/pending", async (c) => {
  const user = c.get("user");

  const invitations = await prisma.memberInvitation.findMany({
    where: {
      email: user.email,
      status: "pending",
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const transformedInvitations = invitations.map((invitation) => ({
    ...invitation,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
  }));

  return c.json({ data: transformedInvitations });
});

// POST /api/invitations/:token/accept - Accept invitation
membersRouter.post("/invitations/:token/accept", async (c) => {
  const user = c.get("user");
  const token = c.req.param("token");

  // Find invitation
  const invitation = await prisma.memberInvitation.findUnique({
    where: { token },
    include: {
      organization: true,
    },
  });

  if (!invitation) {
    return c.json(
      { error: { message: "Invitation not found", code: "NOT_FOUND" } },
      404
    );
  }

  // Check if invitation is for this user
  if (invitation.email !== user.email) {
    return c.json(
      {
        error: {
          message: "This invitation is for a different email address",
          code: "FORBIDDEN",
        },
      },
      403
    );
  }

  // Check if invitation is still valid
  if (invitation.status !== "pending") {
    return c.json(
      {
        error: {
          message: `Invitation has already been ${invitation.status}`,
          code: "CONFLICT",
        },
      },
      409
    );
  }

  if (invitation.expiresAt < new Date()) {
    // Mark as expired
    await prisma.memberInvitation.update({
      where: { id: invitation.id },
      data: { status: "expired" },
    });

    return c.json(
      { error: { message: "Invitation has expired", code: "GONE" } },
      410
    );
  }

  // Check if user is already a member
  const existingMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId: invitation.organizationId,
      userId: user.id,
    },
  });

  if (existingMember) {
    // Mark invitation as accepted anyway
    await prisma.memberInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    });

    return c.json(
      {
        error: {
          message: "You are already a member of this organization",
          code: "CONFLICT",
        },
      },
      409
    );
  }

  // Create membership and mark invitation as accepted
  const [member] = await prisma.$transaction([
    prisma.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
        status: "active",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        organization: true,
      },
    }),
    prisma.memberInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    }),
  ]);

  const transformedMember = {
    ...member,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
    organization: {
      ...member.organization,
      createdAt: member.organization.createdAt.toISOString(),
      updatedAt: member.organization.updatedAt.toISOString(),
    },
  };

  return c.json({ data: transformedMember }, 201);
});

// GET /api/organizations/:orgId/invitations - List pending invitations for organization
membersRouter.get("/organizations/:orgId/invitations", async (c) => {
  const user = c.get("user");
  const organizationId = c.req.param("orgId");

  // Check if user has permission to view invitations
  const member = await getMemberWithPermission(
    organizationId,
    user.id,
    "approveInvitations"
  );
  if (!member) {
    return c.json(
      { error: { message: "Not authorized to view invitations", code: "FORBIDDEN" } },
      403
    );
  }

  const invitations = await prisma.memberInvitation.findMany({
    where: {
      organizationId,
      status: "pending",
    },
    include: {
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const transformedInvitations = invitations.map((invitation) => ({
    ...invitation,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
  }));

  return c.json({ data: transformedInvitations });
});

export { membersRouter };
