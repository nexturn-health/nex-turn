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

router.post("/login-test", (req, res) => {
  console.log("🔥 LOGIN TEST HIT");
  console.log("BODY:", req.body);

  return res.status(200).json({
    success: true,
    message: "Production login route works",
    body: req.body,
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