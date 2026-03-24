import { createAuthClient } from 'better-auth/react';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

export const authClient = createAuthClient({
  baseURL: BASE_URL,
});

export const { useSession, signOut } = authClient;
