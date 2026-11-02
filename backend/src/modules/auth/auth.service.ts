import prisma from "../../config/database";
import { hashPassword, comparePassword } from "../../utils/password";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpirationDate,
} from "../../utils/jwt";
import { hashToken } from "../../utils/token";
import { RegisterInput } from "./auth.types";

export async function registerUser(input: RegisterInput) {
  const email = input.email.toLowerCase().trim();

  // Check whether the email already exists.
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  // Hash the password before storing it.
  const passwordHash = await hashPassword(input.password);

  // Create the user and role assignment in one transaction.
  const user = await prisma.$transaction(async (tx) => {
    const memberRole = await tx.role.findUnique({
      where: { name: "MEMBER" },
    });

    if (!memberRole) {
      throw new Error("MEMBER_ROLE_NOT_FOUND");
    }

    const newUser = await tx.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        passwordHash,
        userRoles: {
          create: {
            roleId: memberRole.id,
          },
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return newUser;
  });

  // Generate tokens using the actual user ID.
  const accessToken = generateAccessToken(
    user.id,
    user.userRoles.map((userRole) => userRole.role.name),
  );

  const actualRefreshToken = generateRefreshToken(user.id);

  // Store only the SHA-256 hash of the refresh token.
  const refreshTokenPayload = JSON.parse(
    Buffer.from(actualRefreshToken.split(".")[1], "base64url").toString(),
  );

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(actualRefreshToken),
      userId: user.id,
      expiresAt: new Date(refreshTokenPayload.exp * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roles: user.userRoles.map((userRole) => userRole.role.name),
    },
    accessToken,
    refreshToken: actualRefreshToken,
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  // Use the same error for unknown email and incorrect password.
  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("ACCOUNT_INACTIVE");
  }

  const passwordMatches = await comparePassword(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const roles = user.userRoles.map((userRole) => userRole.role.name);

  const accessToken = generateAccessToken(user.id, roles);
  const refreshToken = generateRefreshToken(user.id);

  const refreshTokenPayload = JSON.parse(
    Buffer.from(refreshToken.split(".")[1], "base64url").toString(),
  );

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(refreshTokenPayload.exp * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roles,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshUser(rawToken: string) {
  // Verify the JWT signature and expiration first.
  let payload;

  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const existingToken = await tx.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!existingToken) {
      return { status: "INVALID" as const };
    }

    // A revoked token being reused is a security incident.
    if (existingToken.revokedAt) {
      await tx.refreshToken.updateMany({
        where: {
          userId: existingToken.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      return { status: "REUSE" as const };
    }

    if (
      existingToken.expiresAt <= now ||
      existingToken.userId !== payload.sub
    ) {
      return { status: "INVALID" as const };
    }

    if (existingToken.user.status !== "ACTIVE") {
      await tx.refreshToken.updateMany({
        where: {
          userId: existingToken.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      return { status: "INACTIVE" as const };
    }

    // Atomically revoke the old token.
    const revoked = await tx.refreshToken.updateMany({
      where: {
        id: existingToken.id,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    if (revoked.count !== 1) {
      await tx.refreshToken.updateMany({
        where: {
          userId: existingToken.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      return { status: "REUSE" as const };
    }

    const roles = existingToken.user.userRoles.map(
      (userRole) => userRole.role.name,
    );

    const accessToken = generateAccessToken(existingToken.user.id, roles);

    const refreshToken = generateRefreshToken(existingToken.user.id);

    await tx.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId: existingToken.user.id,
        expiresAt: getTokenExpirationDate(refreshToken),
      },
    });

    return {
      status: "SUCCESS" as const,
      user: {
        id: existingToken.user.id,
        firstName: existingToken.user.firstName,
        lastName: existingToken.user.lastName,
        email: existingToken.user.email,
        roles,
      },
      accessToken,
      refreshToken,
    };
  });

  if (result.status === "INVALID") {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  if (result.status === "REUSE") {
    throw new Error("REFRESH_TOKEN_REUSE");
  }

  if (result.status === "INACTIVE") {
    throw new Error("ACCOUNT_INACTIVE");
  }

  return result;
}

export async function logoutUser(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const existingToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existingToken || existingToken.revokedAt) {
    return;
  }

  await prisma.refreshToken.update({
    where: { id: existingToken.id },
    data: {
      revokedAt: new Date(),
    },
  });
}
