import { Request, Response, NextFunction } from "express";
import { createTaskSchema } from "./tasks.validation";
import { createTask } from "./tasks.service";
import { getTasksQuerySchema } from "./tasks.validation";
import { getTasks } from "./tasks.service";
import { getTaskByIdSchema } from "./tasks.validation";
import { getTaskById } from "./tasks.service";
import {
  createTaskUpdateParamsSchema,
  createTaskUpdateSchema,
} from "./tasks.validation";

import { createTaskUpdate } from "./tasks.service";
import {
  updateTaskStatusParamsSchema,
  updateTaskStatusSchema,
} from "./tasks.validation";

import { updateTaskStatus } from "./tasks.service";

import { updateTaskParamsSchema, updateTaskSchema } from "./tasks.validation";

import { updateTask } from "./tasks.service";

import { deleteTaskParamsSchema } from "./tasks.validation";
import { deleteTask } from "./tasks.service";

export async function createTaskController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Validate request body
    const validation = createTaskSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid task data",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    // 2. Get authenticated requester information
    const requesterId = req.user!.id;
    const isAdmin = req.user!.roles.includes("ADMIN");

    // 3. Create task
    const task = await createTask(requesterId, isAdmin, validation.data);

    // 4. Return response
    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: task,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTasksController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation = getTasksQuerySchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid task filters",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const requesterId = req.user!.id;
    const isAdmin = req.user!.roles.includes("ADMIN");

    const tasks = await getTasks(requesterId, isAdmin, validation.data);

    res.status(200).json({
      success: true,
      message: "Tasks retrieved successfully",
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTaskByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation = getTaskByIdSchema.safeParse(req.params);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid task ID",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const requesterId = req.user!.id;
    const isAdmin = req.user!.roles.includes("ADMIN");

    const task = await getTaskById(
      requesterId,
      isAdmin,
      validation.data.taskId,
    );

    res.status(200).json({
      success: true,
      message: "Task retrieved successfully",
      data: task,
    });
  } catch (error) {
    next(error);
  }
}

export async function createTaskUpdateController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate task ID.
    const paramsValidation = createTaskUpdateParamsSchema.safeParse(req.params);

    if (!paramsValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid task ID",
        errors: paramsValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // Validate progress content.
    const bodyValidation = createTaskUpdateSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid progress update",
        errors: bodyValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const requesterId = req.user!.id;
    const taskId = paramsValidation.data.taskId;
    const content = bodyValidation.data.content;

    const update = await createTaskUpdate(requesterId, taskId, content);

    res.status(201).json({
      success: true,
      message: "Progress update created successfully",
      data: update,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTaskStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate task ID.
    const paramsValidation = updateTaskStatusParamsSchema.safeParse(req.params);

    if (!paramsValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid task ID",
        errors: paramsValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // Validate requested status.
    const bodyValidation = updateTaskStatusSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid task status",
        errors: bodyValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const requesterId = req.user!.id;
    const isAdmin = req.user!.roles.includes("ADMIN");

    const task = await updateTaskStatus(
      requesterId,
      isAdmin,
      paramsValidation.data.taskId,
      bodyValidation.data.status,
    );

    res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      data: task,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTaskController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate task ID.
    const paramsValidation = updateTaskParamsSchema.safeParse(req.params);

    if (!paramsValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid task ID",
        errors: paramsValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // Validate update fields.
    const bodyValidation = updateTaskSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid task data",
        errors: bodyValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const requesterId = req.user!.id;
    const isAdmin = req.user!.roles.includes("ADMIN");

    const task = await updateTask(
      requesterId,
      isAdmin,
      paramsValidation.data.taskId,
      bodyValidation.data,
    );

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTaskController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate task ID.
    const validation = deleteTaskParamsSchema.safeParse(req.params);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid task ID",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    // Only platform ADMIN can delete tasks.
    const isAdmin = req.user!.roles.includes("ADMIN");

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: "Only platform administrators can delete tasks",
      });
      return;
    }

    const task = await deleteTask(validation.data.taskId);

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      data: task,
    });
  } catch (error) {
    next(error);
  }
}

