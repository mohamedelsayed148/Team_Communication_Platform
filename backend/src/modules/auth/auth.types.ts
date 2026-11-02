export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedRequestUser {
  id: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedRequestUser;
    }
  }
}
