import { z } from "zod";

export const createTeamSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional(),
  })
  .strict();

export const teamIdParamSchema = z.object({
  teamId: z.string().uuid(),
});

export const addTeamMemberSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict();

export const updateTeamMemberRoleSchema = z
  .object({
    role: z.enum(["LEADER", "MEMBER"]),
  })
  .strict();

export const teamMemberParamsSchema = z.object({
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const updateTeamSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "At least one field must be provided",
  });
