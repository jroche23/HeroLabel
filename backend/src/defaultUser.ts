import { prisma } from "./prisma";

export const DEFAULT_USER_ID = "local-admin";

export async function ensureDefaultUser() {
  await prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: {
      id: DEFAULT_USER_ID,
      name: "Admin",
      email: "admin@local",
      emailVerified: true,
    },
  });
}
