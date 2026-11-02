import { Request, Response, NextFunction } from "express";
import { registerUser } from "./auth.service";
import { registerSchema } from "./auth.validation";
import { loginUser } from "./auth.service";
import { loginSchema } from "./auth.validation";
import { refreshUser } from "./auth.service";
import { logoutUser } from "./auth.service";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await registerUser(validation.data);

    // Web clients receive the refresh token in an HttpOnly cookie.
    // Mobile clients receive it in the response body for SecureStore.
    const isMobile = req.headers["x-client-type"] === "mobile";

    if (!isMobile) {
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/auth",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user: result.user,
        accessToken: result.accessToken,
        ...(isMobile && { refreshToken: result.refreshToken }),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await loginUser(validation.data);

    const isMobile = req.headers["x-client-type"] === "mobile";

    if (!isMobile) {
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/auth",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        accessToken: result.accessToken,
        ...(isMobile && { refreshToken: result.refreshToken }),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_CREDENTIALS") {
        res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
        return;
      }

      if (error.message === "ACCOUNT_INACTIVE") {
        res.status(403).json({
          success: false,
          message: "Your account is inactive",
        });
        return;
      }
    }

    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  const isMobile = req.headers["x-client-type"] === "mobile";

  const rawToken = isMobile
    ? req.body?.refreshToken
    : req.cookies?.refreshToken;

  if (!rawToken || typeof rawToken !== "string") {
    res.status(401).json({
      success: false,
      message: "Refresh token is required",
    });
    return;
  }

  try {
    const result = await refreshUser(rawToken);

    if (!isMobile) {
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/auth",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        user: result.user,
        accessToken: result.accessToken,
        ...(isMobile && {
          refreshToken: result.refreshToken,
        }),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "INVALID_REFRESH_TOKEN" ||
        error.message === "REFRESH_TOKEN_REUSE"
      ) {
        res.clearCookie("refreshToken", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/api/auth",
        });

        res.status(401).json({
          success: false,
          message:
            error.message === "REFRESH_TOKEN_REUSE"
              ? "Refresh token reuse detected. Please sign in again."
              : "Invalid or expired refresh token",
        });
        return;
      }

      if (error.message === "ACCOUNT_INACTIVE") {
        res.status(403).json({
          success: false,
          message: "Your account is inactive",
        });
        return;
      }
    }

    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  const isMobile = req.headers["x-client-type"] === "mobile";

  const rawToken = isMobile
    ? req.body?.refreshToken
    : req.cookies?.refreshToken;

  try {
    if (typeof rawToken === "string" && rawToken.length > 0) {
      await logoutUser(rawToken);
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
}
