import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  createDisplay,
  getPublicDisplayBoard,
  getDisplayAnnouncement,
  getDisplayConfig,
  updateDisplayConfig,
  regenerateDisplayKey,
} from "../controllers/display.controller";
import { protect } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

// Per-IP limit also protects invalid-key requests before database access.
// Configure Express trust proxy for your actual deployment, never blindly `true`.
const audioLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many announcement requests. Please try again shortly." },
});

router.get("/public/:displayKey", getPublicDisplayBoard);
router.post("/public/:displayKey/announcement", audioLimiter, getDisplayAnnouncement);
router.post("/", protect, authorize("HOSPITAL_ADMIN"), createDisplay);
router.get("/config", protect, authorize("HOSPITAL_ADMIN"), getDisplayConfig);
router.put("/config", protect, authorize("HOSPITAL_ADMIN"), updateDisplayConfig);
router.post("/regenerate-key", protect, authorize("HOSPITAL_ADMIN"), regenerateDisplayKey);

export default router;
