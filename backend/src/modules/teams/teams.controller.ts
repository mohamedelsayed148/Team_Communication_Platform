import { Request, Response, NextFunction } from "express";
import {
  createTeamSchema,
  teamIdParamSchema,
  addTeamMemberSchema,
  updateTeamMemberRoleSchema,
  teamMemberParamsSchema,
  updateTeamSchema,
} from "./teams.validation";
import {
  createTeam,
  getUserTeams,
  getTeamDetails,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  updateTeam,
  deleteTeam,
} from "./teams.service";

export async function createTeamController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate request body
    const validation = createTeamSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid team data",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    // The authenticated user becomes the team creator and first leader
    const team = await createTeam(req.user!.id, validation.data);

    res.status(201).json({
      success: true,
      message: "Team created successfully",
      data: team,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserTeamsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.roles.includes("ADMIN");

    const teams = await getUserTeams(userId, isAdmin);

    res.status(200).json({
      success: true,
      results: teams.length,
      data: teams.map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        createdById: team.createdById,
        createdBy: team.createdBy,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        myRole: team.members[0]?.role ?? null,
        memberCount: team._count.members,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function getTeamDetailsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation = teamIdParamSchema.safeParse(req.params);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid team ID",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const isAdmin = req.user!.roles.includes("ADMIN");

    const team = await getTeamDetails(
      validation.data.teamId,
      req.user!.id,
      isAdmin,
    );

    if (!team) {
      res.status(404).json({
        success: false,
        message: "Team not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
}

export async function addTeamMemberController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate team ID
    const teamValidation = teamIdParamSchema.safeParse(req.params);

    if (!teamValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid team ID",
        errors: teamValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // Validate request body
    const bodyValidation = addTeamMemberSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid member data",
        errors: bodyValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const isAdmin = req.user!.roles.includes("ADMIN");

    const membership = await addTeamMember(
      teamValidation.data.teamId,
      bodyValidation.data.userId,
      isAdmin,
    );

    res.status(201).json({
      success: true,
      message: "Team member added successfully",
      data: membership,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTeamMemberRoleController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Validate URL parameters
    const paramsValidation = teamMemberParamsSchema.safeParse(req.params);

    if (!paramsValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid team ID or user ID",
        errors: paramsValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // 2. Validate request body
    const bodyValidation = updateTeamMemberRoleSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid role data",
        errors: bodyValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // 3. Get authenticated requester information
    const requesterId = req.user!.id;
    const isAdmin = req.user!.roles.includes("ADMIN");

    // 4. Update the member's role
    const membership = await updateTeamMemberRole(
      paramsValidation.data.teamId,
      paramsValidation.data.userId,
      bodyValidation.data.role,
      requesterId,
      isAdmin,
    );

    res.status(200).json({
      success: true,
      message: membership.changed
        ? "Team member role updated successfully"
        : "Team member already has this role",
      data: membership,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeTeamMemberController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Validate URL parameters
    const validation = teamMemberParamsSchema.safeParse(req.params);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid team ID or user ID",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    // 2. Get authenticated requester information
    const requesterId = req.user!.id;
    const isAdmin = req.user!.roles.includes("ADMIN");

    // 3. Remove the membership
    const result = await removeTeamMember(
      validation.data.teamId,
      validation.data.userId,
      requesterId,
      isAdmin,
    );

    res.status(200).json({
      success: true,
      message: "Team member removed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTeamController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Validate team ID
    const paramsValidation = teamIdParamSchema.safeParse(req.params);

    if (!paramsValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid team ID",
        errors: paramsValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // 2. Validate request body
    const bodyValidation = updateTeamSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid team data",
        errors: bodyValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // 3. Get authenticated requester information
    const requesterId = req.user!.id;
    const isAdmin = req.user!.roles.includes("ADMIN");

    // 4. Update team
    const updatedTeam = await updateTeam(
      paramsValidation.data.teamId,
      requesterId,
      isAdmin,
      bodyValidation.data,
    );

    res.status(200).json({
      success: true,
      message: "Team updated successfully",
      data: updatedTeam,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTeamController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation = teamIdParamSchema.safeParse(req.params);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid team ID",
      });
      return;
    }

    const isAdmin = req.user!.roles.includes("ADMIN");

    const result = await deleteTeam(validation.data.teamId, isAdmin);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
