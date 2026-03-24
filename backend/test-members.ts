import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testMemberManagement() {
  console.log("=".repeat(60));
  console.log("Testing Organization Member Management System");
  console.log("=".repeat(60));

  try {
    // Clean up any existing test data
    console.log("\n1. Cleaning up existing test data...");
    await prisma.memberInvitation.deleteMany({
      where: {
        OR: [
          { email: { contains: "@test.com" } },
          { token: { startsWith: "test-token-" } },
        ],
      },
    });
    await prisma.organizationMember.deleteMany({});
    await prisma.organization.deleteMany({});
    console.log("✓ Cleaned up test data");

    // Find or create a test user
    let testUser = await prisma.user.findFirst();

    if (!testUser) {
      console.log("\n2. Creating test user...");
      testUser = await prisma.user.create({
        data: {
          id: "test-user-1",
          name: "Test Owner",
          email: "owner@test.com",
          emailVerified: true,
        },
      });
      console.log("✓ Created test user:", testUser.email);
    } else {
      console.log("\n2. Using existing user:", testUser.email);
    }

    // Create test organization
    console.log("\n3. Creating test organization...");
    const organization = await prisma.organization.create({
      data: {
        name: "Test Organization",
        members: {
          create: {
            userId: testUser.id,
            role: "OWNER",
            status: "active",
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
    console.log("✓ Created organization:", organization.name);
    console.log("  ID:", organization.id);
    console.log("  Owner:", organization.members[0].user.email);
    console.log("  Role:", organization.members[0].role);

    // Create additional test users for different roles
    console.log("\n4. Creating test users for different roles...");
    const roleUsers = [];
    const roles = ["ADMINISTRATOR", "MANAGER", "REVIEWER", "ANNOTATOR"];

    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const email = `${role.toLowerCase()}@test.com`;

      // Find or create user
      let roleUser = await prisma.user.findUnique({ where: { email } });
      if (!roleUser) {
        roleUser = await prisma.user.create({
          data: {
            id: `test-user-${role.toLowerCase()}`,
            name: `Test ${role}`,
            email,
            emailVerified: true,
          },
        });
      }
      roleUsers.push({ user: roleUser, role });

      const member = await prisma.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: roleUser.id,
          role: role as any,
          status: "active",
        },
      });
      console.log(`  ✓ Created ${role} member: ${roleUser.email}`);
    }

    // Create an invitation for a new user
    console.log("\n5. Creating member invitation...");
    const inviteeEmail = "newuser@test.com";
    const invitation = await prisma.memberInvitation.create({
      data: {
        organizationId: organization.id,
        email: inviteeEmail,
        role: "MANAGER",
        invitedBy: testUser.id,
        token: "test-token-" + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: "pending",
      },
      include: {
        inviter: true,
        organization: true,
      },
    });
    console.log("✓ Created invitation:");
    console.log("  For:", invitation.email);
    console.log("  Role:", invitation.role);
    console.log("  Token:", invitation.token);
    console.log("  Expires:", invitation.expiresAt);

    // Get organization with all members
    console.log("\n6. Fetching organization with all members...");
    const orgWithMembers = await prisma.organization.findUnique({
      where: { id: organization.id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        invitations: {
          where: {
            status: "pending",
          },
        },
      },
    });

    console.log("\n✓ Organization members:");
    orgWithMembers?.members.forEach((member, idx) => {
      console.log(
        `  ${idx + 1}. ${member.user.email} - ${member.role} (${member.status})`
      );
    });

    console.log("\n✓ Pending invitations:");
    orgWithMembers?.invitations.forEach((inv, idx) => {
      console.log(`  ${idx + 1}. ${inv.email} - ${inv.role} (${inv.status})`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("Database test completed successfully!");
    console.log("=".repeat(60));
    console.log("\nTest data created:");
    console.log(`- Organization ID: ${organization.id}`);
    console.log(`- Test User ID: ${testUser.id}`);
    console.log(`- Test User Email: ${testUser.email}`);
    console.log(`- Invitation Token: ${invitation.token}`);
    console.log("\nYou can now test the API endpoints with these values.");
    console.log("Note: You'll need a valid session token from Better Auth to test the APIs.");

  } catch (error) {
    console.error("\n❌ Error during testing:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testMemberManagement();
