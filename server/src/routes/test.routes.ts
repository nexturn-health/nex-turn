import { Router } from "express";

import { protect } from "../middleware/auth.middleware";

const router = Router();

router.get("/protected", protect, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "You accessed a protected route",
    user: req.user,
  });
});

export default router;