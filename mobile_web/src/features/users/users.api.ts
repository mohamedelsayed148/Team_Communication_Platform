
import apiClient from "@/src/api/client";

import type {
  User,
  UsersQueryParams,
  UsersResponse,
} from "./users.types";

export async function getUsers(
  params: UsersQueryParams = {},
): Promise<UsersResponse> {
  const response = await apiClient.get<UsersResponse>("/users", {
    params,
  });

  return response.data;
}
