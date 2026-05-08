import { createAuthClient } from 'better-auth/react';

// Configure backend URL for authentication
// Use empty string to make requests to same origin via CloudFront reverse proxy
// CloudFront will proxy /api requests to the backend
const BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

export const authClient = createAuthClient({
  baseURL: BASE_URL,
});

export const { useSession, signOut } = authClient;
