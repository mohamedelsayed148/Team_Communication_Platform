import { z } from "zod";

export const createTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Task title must be at least 2 characters")
      .max(200, "Task title cannot exceed 200 characters"),

    description: z
      .string()
      .trim()
      .max(5000, "Description cannot exceed 5000 characters")
      .nullable()
      .optional(),

    teamId: z.string().uuid("Invalid team ID"),

    assignedToId: z.string().uuid("Invalid assigned user ID").optional(),

    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),

    dueDate: z
      .string()
      .datetime({ offset: true, message: "Invalid deadline date" })
      .optional(),
  })
  .strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const getTasksQuerySchema = z
  .object({
    teamId: z.string().uuid("Invalid team ID").optional(),
    status: z
      .enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "CANCELLED"])
      .optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    assignedToId: z.string().uuid("Invalid assigned user ID").optional(),
  })
  .strict();

export type GetTasksQuery = z.infer<typeof getTasksQuerySchema>;

export const getTaskByIdSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
});

export type GetTaskByIdInput = z.infer<typeof getTaskByIdSchema>;

export const createTaskUpdateParamsSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
});

export const createTaskUpdateSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Progress update cannot be empty")
      .max(5000, "Progress update cannot exceed 5000 characters"),
  })
  .strict();

export type CreateTaskUpdateInput = z.infer<typeof createTaskUpdateSchema>;

export const updateTaskStatusParamsSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
});

export const updateTaskStatusSchema = z
  .object({
    status: z.enum([
      "TODO",
      "IN_PROGRESS",
      "IN_REVIEW",
      "COMPLETED",
      "CANCELLED",
    ]),
  })
  .strict();

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export const updateTaskParamsSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
});

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Task title must be at least 2 characters")
      .max(200, "Task title cannot exceed 200 characters")
      .optional(),

    description: z
      .string()
      .trim()
      .max(5000, "Description cannot exceed 5000 characters")
      .nullable()
      .optional(),

    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),

    dueDate: z
      .string()
      .datetime({
        offset: true,
        message: "Invalid deadline date",
      })
      .nullable()
      .optional(),

    assignedToId: z
      .string()
      .uuid("Invalid assigned user ID")
      .nullable()
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const deleteTaskParamsSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
});

export type DeleteTaskParams = z.infer<typeof deleteTaskParamsSchema>;
