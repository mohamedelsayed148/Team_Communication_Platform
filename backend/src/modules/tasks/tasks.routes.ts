import { Router } from "express";
import {
  createTaskController,
  getTasksController,
  getTaskByIdController,
  createTaskUpdateController,
  updateTaskStatusController,
  updateTaskController,
  deleteTaskController,
} from "./tasks.controller";

const router = Router();

router.post("/", createTaskController);
router.get("/", getTasksController);
router.get("/:taskId", getTaskByIdController);
router.post("/:taskId/updates", createTaskUpdateController);
router.patch("/:taskId/status", updateTaskStatusController);
router.patch("/:taskId", updateTaskController);
router.delete("/:taskId", deleteTaskController);

export default router;
