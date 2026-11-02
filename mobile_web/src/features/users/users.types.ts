export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  roles: string[];
}

export interface UsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
}

export interface UsersPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UsersResponse {
  success: boolean;
  data: User[];
  pagination: UsersPagination;
}
