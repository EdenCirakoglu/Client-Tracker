export const userRoles = ['ADMIN', 'DEVELOPER', 'CLIENT'] as const;

export type UserRole = (typeof userRoles)[number];

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clientId: string | null;
};
