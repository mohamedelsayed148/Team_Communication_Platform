import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),

  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255)
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .refine(
      (value) => Buffer.byteLength(value, "utf8") <= 72,
      "Password must not exceed 72 bytes",
    ),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255)
    .transform((value) => value.toLowerCase()),

  password: z.string().min(1, "Password is required"),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
