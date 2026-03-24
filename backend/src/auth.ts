import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { env } from "./env";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_BASE_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "ANNOTATOR",
        input: true,
      },
    },
  },
  trustedOrigins: [
    "http://localhost:*",
    "http://127.0.0.1:*",
    "https://*.onrender.com",
    "https://*.vercel.app",
  ],
  advanced: {
    trustedProxyHeaders: true,
    disableCSRFCheck: true,
    // Cross-origin cookie settings for iframe web preview
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      partitioned: true,
    },
  },
});
