import { Request, Response } from "express";
import { getUserById as getUserByIdService } from "./users.service";
import { updateUserProfile } from "./users.service";
import { updateProfileSchema } from "./users.validation";
import { getAllUsers } from "./users.service";
import { listUsersQuerySchema } from "./users.validation";
import { getUserDetails } from "./users.service";
import { userIdParamSchema } from "./users.validation";
import { updateUserStatus } from "./users.service";
import { updateUserStatusSchema } from "./users.validation";

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await getUserByIdService(req.user!.id);

  if (!user) {
    res.status(404).json({
      success: false,
      message: "User not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      ...user,
      roles: user.userRoles.map((item) => item.role.name),
      userRoles: undefined,
    },
  });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const validation = updateProfileSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.flatten().fieldErrors,
    });
    return;
  }

  const user = await updateUserProfile(req.user!.id, validation.data);

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      ...user,
      roles: user.userRoles.map((item) => item.role.name),
      userRoles: undefined,
    },
  });
}

export async function getUsers(req: Request, res: Response): Promise<void> {
  const validation = listUsersQuerySchema.safeParse(req.query);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid query parameters",
      errors: validation.error.flatten().fieldErrors,
    });
    return;
  }

  const result = await getAllUsers(validation.data);

  res.status(200).json({
    success: true,
    data: result.users,
    pagination: result.pagination,
  });
}
export async function getUserById(req: Request, res: Response): Promise<void> {
  const validation = userIdParamSchema.safeParse(req.params);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid user ID format",
      errors: validation.error.flatten().fieldErrors,
    });
    return;
  }

  const user = await getUserDetails(validation.data.id);

  if (!user) {
    res.status(404).json({
      success: false,
      message: "User not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      ...user,
      roles: user.userRoles.map((item) => ({
        name: item.role.name,
        description: item.role.description,
        assignedAt: item.assignedAt,
      })),
      userRoles: undefined,
    },
  });
}

export async function changeUserStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const paramsValidation = userIdParamSchema.safeParse(req.params);

  if (!paramsValidation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid user ID format",
    });
    return;
  }

  const bodyValidation = updateUserStatusSchema.safeParse(req.body);

  if (!bodyValidation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid status",
      errors: bodyValidation.error.flatten().fieldErrors,
    });
    return;
  }

  const userId = paramsValidation.data.id;
  const { status } = bodyValidation.data;

  if (userId === req.user!.id && status === "INACTIVE") {
    res.status(400).json({
      success: false,
      message: "You cannot deactivate your own account",
    });
    return;
  }

  const existingUser = await getUserDetails(userId);

  if (!existingUser) {
    res.status(404).json({
      success: false,
      message: "User not found",
    });
    return;
  }

  if (
    userId.toLowerCase() === req.user!.id.toLowerCase() &&
    status === "INACTIVE"
  ) {
    res.status(400).json({
      success: false,
      message: "You cannot deactivate your own account",
    });
    return;
  }
  const user = await updateUserStatus(userId, status);

  res.status(200).json({
    success: true,
    message: `User ${status === "ACTIVE" ? "activated" : "deactivated"} successfully`,
    data: user,
  });
}
