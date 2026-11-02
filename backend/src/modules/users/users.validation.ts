import { z } from "zod";

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const updateUserStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE"]),
  })
  .strict();
