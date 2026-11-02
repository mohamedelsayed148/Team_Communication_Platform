import apiClient from "@/src/api/client";
import type { AuthUser } from "./auth.types";

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  data: AuthUser & {
    status: "ACTIVE" | "INACTIVE";
    createdAt: string;
    updatedAt: string;
  };
}

export async function updateMyProfile(
  profileData: UpdateProfileRequest,
): Promise<UpdateProfileResponse> {
  const response = await apiClient.patch<UpdateProfileResponse>(
    "/users/me",
    profileData,
  );

  return response.data;
}
