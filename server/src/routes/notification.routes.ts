import { Router } from "express";

import {
    testSMS,
} from "../controllers/testNotification.controller";

const router = Router();

router.post(
    "/test-sms",
    testSMS,
);

export default router;