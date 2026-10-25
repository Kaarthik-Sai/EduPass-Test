import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createPermission,
  getMyPermissions,
  getPendingPermissions,
  reviewPermission,
  reviewHODPermission,
  getPermissionById,
  verifyPermissionQR,
  completePermission,
  getPermissionHistory,
  getAllPermissions,
  getPermissionSummary,
} from "../controllers/permissionController.js";

const router = express.Router();

router.post("/verify-qr", protect, verifyPermissionQR);
router.post("/", protect, createPermission);
router.get("/my", protect, getMyPermissions);
router.get("/pending", protect, getPendingPermissions);
router.patch("/:id/review", protect, reviewPermission);
router.patch("/:id/hod-review", protect, reviewHODPermission);
router.patch("/:id/complete", protect, completePermission);
router.get("/:id", protect, getPermissionById);
router.get("/:id/history", protect, getPermissionHistory);
router.get("/", protect, getAllPermissions);
router.get("/summary", protect, getPermissionSummary);

export default router;
