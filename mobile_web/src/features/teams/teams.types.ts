export interface Team {
  id: string;
  name: string;
  description: string | null;
  createdById: string;

  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  createdAt: string;
  updatedAt: string;

  myRole: "LEADER" | "MEMBER" | null;
  memberCount: number;
}

export interface TeamsResponse {
  success: boolean;
  results: number;
  data: Team[];
}

export interface TeamMemberUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
}

export interface TeamMember {
  role: "LEADER" | "MEMBER";
  joinedAt: string;
  user: TeamMemberUser;
}

export interface TeamDetails {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  members: TeamMember[];
  _count: {
    members: number;
  };
}

export interface TeamDetailsResponse {
  success: boolean;
  data: TeamDetails;
}

// Create Team
export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface CreateTeamResponse {
  success: boolean;
  message: string;
  data: Team;
}

// Update Team
export interface UpdateTeamRequest {
  name?: string;
  description?: string | null;
}

export interface UpdateTeamResponse {
  success: boolean;
  message: string;
  data: Team;
}

// Add Team Member
export interface AddTeamMemberRequest {
  userId: string;
}

export interface AddTeamMemberResponse {
  success: boolean;
  message: string;
  data: {
    teamId: string;
    userId: string;
    role: "LEADER" | "MEMBER";
    joinedAt: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

// Update Team Member Role
export interface UpdateTeamMemberRoleRequest {
  role: "LEADER" | "MEMBER";
}

export interface UpdateTeamMemberRoleResponse {
  success: boolean;
  message: string;
  data: {
    teamId: string;
    userId: string;
    role: "LEADER" | "MEMBER";
    joinedAt?: string;
    changed?: boolean;
  };
}

// Remove Team Member
export interface RemoveTeamMemberResponse {
  success: boolean;
  message: string;
  data: {
    teamId: string;
    userId: string;
    removed: boolean;
  };
}

// Delete Team
export interface DeleteTeamResponse {
  success: boolean;
  message: string;
}
