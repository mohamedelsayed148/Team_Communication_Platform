import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import prisma from "../config/database";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const token = authorization.substring(7).trim();

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    // Check the user's current status and roles in SQL Server.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        status: true,
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

    if (!user || user.status !== "ACTIVE") {
      res.status(401).json({
        success: false,
        message: "User account is inactive or no longer exists",
      });
      return;
    }

    // Use current database roles, not potentially outdated JWT roles.
    req.user = {
      id: user.id,
      roles: user.userRoles.map((userRole) => userRole.role.name),
    };

    next();
  } catch (error) {
    if (error instanceof Error && error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
      return;
    }

    if (error instanceof Error && error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
      return;
    }

    next(error);
  }
}
