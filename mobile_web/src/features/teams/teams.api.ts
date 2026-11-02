
import apiClient from "@/src/api/client";

import type {
  Team,
  TeamsResponse,
  TeamDetails,
  TeamDetailsResponse,
  CreateTeamRequest,
  CreateTeamResponse,
  UpdateTeamRequest,
  UpdateTeamResponse,
  AddTeamMemberRequest,
  AddTeamMemberResponse,
  UpdateTeamMemberRoleRequest,
  UpdateTeamMemberRoleResponse,
  RemoveTeamMemberResponse,
  DeleteTeamResponse,
} from "./teams.types";

// Get teams belonging to the authenticated user
export async function getTeams(): Promise<Team[]> {
  const response = await apiClient.get<TeamsResponse>("/teams");
  return response.data.data;
}

// Get team details and members
export async function getTeamById(teamId: string): Promise<TeamDetails> {
  const response = await apiClient.get<TeamDetailsResponse>(
    `/teams/${teamId}`,
  );
  return response.data.data;
}

// Create a team
export async function createTeam(
  data: CreateTeamRequest,
): Promise<Team> {
  const response = await apiClient.post<CreateTeamResponse>("/teams", data);
  return response.data.data;
}

// Update team information
export async function updateTeam(
  teamId: string,
  data: UpdateTeamRequest,
): Promise<Team> {
  const response = await apiClient.patch<UpdateTeamResponse>(
    `/teams/${teamId}`,
    data,
  );
  return response.data.data;
}

// Add a member to a team
export async function addTeamMember(
  teamId: string,
  data: AddTeamMemberRequest,
): Promise<AddTeamMemberResponse["data"]> {
  const response = await apiClient.post<AddTeamMemberResponse>(
    `/teams/${teamId}/members`,
    data,
  );
  return response.data.data;
}

// Change a team member's role
export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  data: UpdateTeamMemberRoleRequest,
): Promise<UpdateTeamMemberRoleResponse["data"]> {
  const response = await apiClient.patch<UpdateTeamMemberRoleResponse>(
    `/teams/${teamId}/members/${userId}/role`,
    data,
  );
  return response.data.data;
}

// Remove a member from a team
export async function removeTeamMember(
  teamId: string,
  userId: string,
): Promise<RemoveTeamMemberResponse["data"]> {
  const response = await apiClient.delete<RemoveTeamMemberResponse>(
    `/teams/${teamId}/members/${userId}`,
  );
  return response.data.data;
}

// Delete a team (platform ADMIN only)
export async function deleteTeam(teamId: string): Promise<void> {
  await apiClient.delete<DeleteTeamResponse>(`/teams/${teamId}`);
}
