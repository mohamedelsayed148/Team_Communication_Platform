import { Router } from "express";

import {
  getNotificationsController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
} from "./notifications.controller";

const router = Router();

router.get("/", getNotificationsController);
router.patch("/:notificationId/read", markNotificationAsReadController);
router.patch("/read-all", markAllNotificationsAsReadController);

export default router;
