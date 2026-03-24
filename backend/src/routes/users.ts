import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";

export const usersRouter = new Hono<{
  Variables: { user: any; session: any };
}>();

// GET /api/users — return all users (id, name, email, role)
usersRouter.get("/", async (c) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  return c.json({ data: users });
});

// PATCH /api/users/me — update current user's profile (name and/or email)
const updateMeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

usersRouter.patch("/me", zValidator("json", updateMeSchema), async (c) => {
  const user = c.get("user");
  if (!user?.id) return c.json({ error: { message: "Unauthorized" } }, 401);

  const body = c.req.valid("json");

  const data: { name?: string; email?: string } = {};
  if (body.name) data.name = body.name;
  if (body.email) data.email = body.email;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, name: true, email: true, role: true },
  });

  return c.json({ data: updated });
});
