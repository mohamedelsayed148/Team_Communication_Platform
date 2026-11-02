import prisma from "../../config/database";
import { Prisma } from "@prisma/client";

interface CreateTeamInput {
  name: string;
  description?: string;
}

export async function createTeam(userId: string, data: CreateTeamInput) {
  return prisma.$transaction(async (tx) => {
    // Create the team
    const team = await tx.team.create({
      data: {
        name: data.name,
        description: data.description,
        createdById: userId,
      },
    });

    // Automatically add the creator as the first team leader
    await tx.teamMember.create({
      data: {
        teamId: team.id,
        userId,
        role: "LEADER",
      },
    });

    return team;
  });
}

export async function getUserTeams(userId: string, isAdmin: boolean) {
  return prisma.team.findMany({
    where: isAdmin
      ? {}
      : {
          members: {
            some: {
              userId,
            },
          },
        },
    select: {
      id: true,
      name: true,
      description: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,

      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },

      members: {
        where: {
          userId,
        },
        select: {
          role: true,
        },
      },

      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getTeamDetails(
  teamId: string,
  userId: string,
  isAdmin: boolean,
) {
  // Only non-admin users must be team members
  if (!isAdmin) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      const error = new Error("You are not a member of this team");
      (error as Error & { statusCode?: number }).statusCode = 403;
      throw error;
    }
  }

  // Retrieve team details
  return prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,

      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },

      members: {
        select: {
          role: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              status: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      },

      _count: {
        select: {
          members: true,
        },
      },
    },
  });
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  isAdmin: boolean,
) {
  return prisma.$transaction(async (tx) => {
    // 1. Only platform ADMIN can add team members
    if (!isAdmin) {
      const error = new Error(
        "Only platform administrators can add team members",
      ) as Error & { statusCode?: number };

      error.statusCode = 403;
      throw error;
    }

    // 2. Verify that the team exists
    const team = await tx.team.findUnique({
      where: { id: teamId },
      select: { id: true },
    });

    if (!team) {
      const error = new Error("Team not found") as Error & {
        statusCode?: number;
      };
      error.statusCode = 404;
      throw error;
    }

    // 3. Verify that the user exists and is active
    const newUser = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!newUser) {
      const error = new Error("User not found") as Error & {
        statusCode?: number;
      };
      error.statusCode = 404;
      throw error;
    }

    if (newUser.status !== "ACTIVE") {
      const error = new Error("Cannot add an inactive user") as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }

    // 4. Check whether the user is already a member
    const existingMembership = await tx.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (existingMembership) {
      const error = new Error(
        "User is already a member of this team",
      ) as Error & { statusCode?: number };

      error.statusCode = 409;
      throw error;
    }

    // 5. Add the user with the MEMBER role
    return tx.teamMember.create({
      data: {
        teamId,
        userId,
        role: "MEMBER",
      },
      select: {
        teamId: true,
        userId: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  });
}

export async function updateTeamMemberRole(
  teamId: string,
  targetUserId: string,
  newRole: "LEADER" | "MEMBER",
  requesterId: string,
  isAdmin: boolean,
) {
  return prisma.$transaction(
    async (tx) => {
      // 1. Verify that the team exists
      const team = await tx.team.findUnique({
        where: { id: teamId },
        select: { id: true },
      });

      if (!team) {
        const error = new Error("Team not found") as Error & {
          statusCode?: number;
        };
        error.statusCode = 404;
        throw error;
      }

      // 2. Verify requester permissions
      if (!isAdmin) {
        const requesterMembership = await tx.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId,
              userId: requesterId,
            },
          },
          select: {
            role: true,
          },
        });

        if (!requesterMembership || requesterMembership.role !== "LEADER") {
          const error = new Error(
            "Only team leaders or platform administrators can change member roles",
          ) as Error & { statusCode?: number };

          error.statusCode = 403;
          throw error;
        }
      }

      // 3. Find the target member
      const targetMembership = await tx.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: targetUserId,
          },
        },
        select: {
          role: true,
          user: {
            select: {
              status: true,
            },
          },
        },
      });

      if (!targetMembership) {
        const error = new Error(
          "User is not a member of this team",
        ) as Error & { statusCode?: number };

        error.statusCode = 404;
        throw error;
      }

      // 4. Do not promote an inactive user
      if (newRole === "LEADER" && targetMembership.user.status !== "ACTIVE") {
        const error = new Error(
          "An inactive user cannot be promoted to team leader",
        ) as Error & { statusCode?: number };

        error.statusCode = 400;
        throw error;
      }

      // 5. If the role is already correct, return the existing membership
      if (targetMembership.role === newRole) {
        return {
          teamId,
          userId: targetUserId,
          role: targetMembership.role,
          changed: false,
        };
      }

      // 6. Protect the last active team leader
      if (
        targetMembership.role === "LEADER" &&
        newRole === "MEMBER" &&
        targetMembership.user.status === "ACTIVE"
      ) {
        const otherActiveLeaders = await tx.teamMember.count({
          where: {
            teamId,
            role: "LEADER",
            userId: {
              not: targetUserId,
            },
            user: {
              status: "ACTIVE",
            },
          },
        });

        if (otherActiveLeaders === 0) {
          const error = new Error(
            "Cannot demote the last active leader of a team",
          ) as Error & { statusCode?: number };

          error.statusCode = 409;
          throw error;
        }
      }

      // 7. Update the role
      const updatedMembership = await tx.teamMember.update({
        where: {
          teamId_userId: {
            teamId,
            userId: targetUserId,
          },
        },
        data: {
          role: newRole,
        },
        select: {
          teamId: true,
          userId: true,
          role: true,
          joinedAt: true,
        },
      });

      return {
        ...updatedMembership,
        changed: true,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function removeTeamMember(
  teamId: string,
  targetUserId: string,
  requesterId: string,
  isAdmin: boolean,
) {
  return prisma.$transaction(
    async (tx) => {
      // 1. Verify that the team exists
      const team = await tx.team.findUnique({
        where: { id: teamId },
        select: { id: true },
      });

      if (!team) {
        const error = new Error("Team not found") as Error & {
          statusCode?: number;
        };
        error.statusCode = 404;
        throw error;
      }

      // 2. Prevent users from removing themselves
      if (requesterId === targetUserId) {
        const error = new Error(
          "You cannot remove yourself using this endpoint",
        ) as Error & { statusCode?: number };

        error.statusCode = 400;
        throw error;
      }

      // 3. Verify requester permissions
      if (!isAdmin) {
        const requesterMembership = await tx.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId,
              userId: requesterId,
            },
          },
          select: {
            role: true,
          },
        });

        if (!requesterMembership || requesterMembership.role !== "LEADER") {
          const error = new Error(
            "Only team leaders or platform administrators can remove members",
          ) as Error & { statusCode?: number };

          error.statusCode = 403;
          throw error;
        }
      }

      // 4. Find the target membership
      const targetMembership = await tx.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: targetUserId,
          },
        },
        select: {
          role: true,
          user: {
            select: {
              status: true,
            },
          },
        },
      });

      if (!targetMembership) {
        const error = new Error(
          "User is not a member of this team",
        ) as Error & { statusCode?: number };

        error.statusCode = 404;
        throw error;
      }

      // 5. Protect the last active team leader
      if (
        targetMembership.role === "LEADER" &&
        targetMembership.user.status === "ACTIVE"
      ) {
        const otherActiveLeaders = await tx.teamMember.count({
          where: {
            teamId,
            role: "LEADER",
            userId: {
              not: targetUserId,
            },
            user: {
              status: "ACTIVE",
            },
          },
        });

        if (otherActiveLeaders === 0) {
          const error = new Error(
            "Cannot remove the last active leader of a team",
          ) as Error & { statusCode?: number };

          error.statusCode = 409;
          throw error;
        }
      }

      // 6. Remove the membership, not the user account
      await tx.teamMember.delete({
        where: {
          teamId_userId: {
            teamId,
            userId: targetUserId,
          },
        },
      });

      return {
        teamId,
        userId: targetUserId,
        removed: true,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function updateTeam(
  teamId: string,
  requesterId: string,
  isAdmin: boolean,
  data: {
    name?: string;
    description?: string | null;
  },
) {
  // 1. Verify that the team exists
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });

  if (!team) {
    const error = new Error("Team not found") as Error & {
      statusCode?: number;
    };
    error.statusCode = 404;
    throw error;
  }

  // 2. Verify requester permissions
  if (!isAdmin) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: requesterId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership || membership.role !== "LEADER") {
      const error = new Error(
        "Only team leaders or platform administrators can update team information",
      ) as Error & { statusCode?: number };

      error.statusCode = 403;
      throw error;
    }
  }

  // 3. Update the team
  return prisma.team.update({
    where: { id: teamId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && {
        description: data.description,
      }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function deleteTeam(teamId: string, isAdmin: boolean) {
  if (!isAdmin) {
    throw Object.assign(new Error("Only platform admins can delete teams"), {
      statusCode: 403,
    });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });

  if (!team) {
    throw Object.assign(new Error("Team not found"), {
      statusCode: 404,
    });
  }

  await prisma.team.delete({
    where: { id: teamId },
  });

  return { message: "Team deleted successfully" };
}
