import { Router } from "express";

import {
    getSuperAdminLeads,
    getSuperAdminLeadById,
    updateSuperAdminLeadStatus,
    updateSuperAdminLeadPriority,
    addSuperAdminLeadNote,
    updateSuperAdminLeadFollowUp,
    markSuperAdminLeadContacted,
    archiveSuperAdminLead,
} from "../controllers/superAdminLead.controller";

import { protect } from "../middleware/auth.middleware";
import { requireSuperAdmin } from "../middleware/superAdmin.middleware";

const router = Router();

router.use(protect);
router.use(requireSuperAdmin);

router.get("/", getSuperAdminLeads);

router.get(
    "/:id",
    getSuperAdminLeadById,
);

router.patch(
    "/:id/status",
    updateSuperAdminLeadStatus,
);

router.patch(
    "/:id/priority",
    updateSuperAdminLeadPriority,
);

router.post(
    "/:id/notes",
    addSuperAdminLeadNote,
);

router.patch(
    "/:id/follow-up",
    updateSuperAdminLeadFollowUp,
);

router.patch(
    "/:id/contacted",
    markSuperAdminLeadContacted,
);

router.patch(
    "/:id/archive",
    archiveSuperAdminLead,
);

export default router;