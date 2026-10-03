import {
  Router,
} from "express";

import appointmentAssistantController from "../controllers/appointmentAssistant.controller";

const router = Router();

router.post(
  "/search",
  appointmentAssistantController.searchAppointmentWithAI,
);

export default router;