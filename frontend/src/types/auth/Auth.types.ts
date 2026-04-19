// Mirrors the backend AuthenticatedUser interface (auth/interfaces/authenticated-user.interface.ts)
// Keep in sync with the backend schema manually — no codegen for this pet project
export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: 'USER' | 'ADMIN';
}

// Shape of the refresh endpoint response body
export interface RefreshResponse {
  accessToken: string;
}