import prisma from "../../config/database";

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
}
/**
 * Why use select? We explicitly choose which fields the API can return.
 * Notice that passwordHash is excluded. Never return password hashes through user endpoints. */

export async function updateUserProfile(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
  },
) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
}

interface ListUsersFilters {
  page: number;
  limit: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export async function getAllUsers(filters: ListUsersFilters) {
  const { page, limit, search, status } = filters;

  const where = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ],
    }),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map((user) => ({
      ...user,
      roles: user.userRoles.map((item) => item.role.name),
      userRoles: undefined,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserDetails(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        select: {
          role: {
            select: {
              name: true,
              description: true,
            },
          },
          assignedAt: true,
        },
      },
    },
  });
}

export async function updateUserStatus(
  userId: string,
  status: "ACTIVE" | "INACTIVE",
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        updatedAt: true,
      },
    });

    if (status === "INACTIVE") {
      await tx.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return user;
  });
}
