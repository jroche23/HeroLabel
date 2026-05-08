import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { env } from "./env";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
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
    "https://*.cloudfront.net",
    "https://app.herolabel.io",
    "https://herolabel.io",
  ],
  advanced: {
    trustedProxyHeaders: true,
    disableCSRFCheck: false,  // Always enforce CSRF in production
    // Cross-origin cookie settings for iframe web preview
    defaultCookieAttributes: {
      sameSite: "lax",  // Stricter than 'none'
      secure: true,
      partitioned: true,
    },
  },
});
