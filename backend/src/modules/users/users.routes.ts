import { Router } from "express";
import { getMe, updateMe } from "./users.controller";
import { getUsers } from "./users.controller";
import { authorize } from "../../middlewares/authorize";
import { getUserById } from "./users.controller";
import { changeUserStatus } from "./users.controller";

const router = Router();

router.get("/", authorize("ADMIN"), getUsers);

router.get("/me", getMe);
router.patch("/me", updateMe);

router.get("/:id", authorize("ADMIN"), getUserById);
router.patch("/:id/status", authorize("ADMIN"), changeUserStatus);

export default router;
