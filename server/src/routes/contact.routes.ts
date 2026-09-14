import { Router } from "express";
import { createContactLead } from "../controllers/contact.controller";

const router = Router();

router.post(
    "/",
    createContactLead,
);

export default router;