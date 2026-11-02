import { Router } from "express";
import {
  createTeamController,
  getUserTeamsController,
  getTeamDetailsController,
  addTeamMemberController,
  updateTeamMemberRoleController,
  removeTeamMemberController,
  updateTeamController,
  deleteTeamController,
} from "./teams.controller";

const router = Router();

router.post("/", createTeamController);
router.get("/", getUserTeamsController);
router.get("/:teamId", getTeamDetailsController);

router.patch("/:teamId", updateTeamController);
router.delete("/:teamId", deleteTeamController);

router.post("/:teamId/members", addTeamMemberController);
router.patch("/:teamId/members/:userId/role", updateTeamMemberRoleController);
router.delete("/:teamId/members/:userId", removeTeamMemberController);

export default router;
