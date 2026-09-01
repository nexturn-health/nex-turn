import { Router } from "express";

import {
  registerHospital,
  login,
   logout,
} from "../controllers/auth.controller";
import {
    protect,
} from "../middleware/auth.middleware";

const router = Router();


router.get("/test", (_req, res) => {
  res.json({
    success: true,
    message: "AUTH ROUTES ARE WORKING",
  });
});

router.post("/register-hospital", registerHospital);

router.post("/login", login);
router.post(
    "/logout",
    protect,
    logout,
);

export default router;