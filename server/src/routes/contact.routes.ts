import { Router } from "express";

import { createContactLead } from "../controllers/contact.controller";

import {
    contactRateLimit,
    contactSecurityCheck,
} from "../middleware/contactSecurity.middleware";

const router = Router();

router.post(
    "/",
    contactRateLimit,
    contactSecurityCheck,
    createContactLead,
);

export default router;