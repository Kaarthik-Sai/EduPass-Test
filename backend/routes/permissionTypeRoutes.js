import express from "express";
import protect from "../middleware/authMiddleware.js";
import { createPermissionType } from "../controllers/permissionTypeController.js";

const router = express.Router();

router.post("/", protect, createPermissionType);

export default router;
