import Permission from "../models/Permission.js";
import ApprovalHistory from "../models/ApprovalHistory.js";
import PermissionType from "../models/PermissionType.js";
import User from "../models/User.js";
import { generatePermissionQR } from "../utils/generateQR.js";

export const createPermission = async (req, res) => {
  try {
    const {
      permissionType,
      reason,
      date,
      fromTime,
      toTime,
      destination,
      contactDetails,
    } = req.body;

    if (!permissionType || !reason || !date || !fromTime || !toTime) {
      return res.status(400).json({
        message: "Please provide all required permission details",
      });
    }

    if (fromTime >= toTime) {
      return res.status(400).json({
        message: "End time must be later than start time",
      });
    }

    const student = await User.findById(req.user._id);

    if (!student || student.role !== "student") {
      return res.status(403).json({
        message: "Only students can submit permission requests",
      });
    }

    if (!student.department || !student.academicYear || !student.section) {
      return res.status(400).json({
        message:
          "Your profile must have a department, academic year and section assigned",
      });
    }

    const type = await PermissionType.findById(permissionType);

    if (!type) {
      return res.status(404).json({
        message: "Permission type not found",
      });
    }

    const permission = await Permission.create({
      student: student._id,
      department: student.department,
      academicYear: student.academicYear,
      section: student.section,
      permissionType,
      reason,
      date,
      fromTime,
      toTime,
      destination,
      contactDetails,
      status: "pending_faculty",
    });

    await ApprovalHistory.create({
      permission: permission._id,
      actionBy: student._id,
      action: "submitted",
      previousStatus: "draft",
      newStatus: "pending_faculty",
      remarks: "Permission request submitted",
    });

    return res.status(201).json({
      message: "Permission request submitted successfully",
      permission,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to submit permission request",
      error: error.message,
    });
  }
};

export const getMyPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find({
      student: req.user._id,
    })
      .populate("permissionType", "name requiresHODApproval")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: permissions.length,
      permissions,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch permission requests",
      error: error.message,
    });
  }
};

export const getPendingPermissions = async (req, res) => {
  try {
    if (!["faculty", "hod", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const permissions = await Permission.find({
      status: "pending_faculty",
    })
      .populate("student", "name email studentId")
      .populate("permissionType", "name")
      .populate("department", "name code")
      .populate("academicYear", "name")
      .populate("section", "name")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      count: permissions.length,
      permissions,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch pending permissions",
      error: error.message,
    });
  }
};

export const reviewPermission = async (req, res) => {
  try {
    const { action, remarks } = req.body;
    const { id } = req.params;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        message: "Action must be approve or reject",
      });
    }

    if (req.user.role !== "faculty") {
      return res.status(403).json({
        message: "Only faculty can review permissions",
      });
    }

    if (action === "reject" && !remarks?.trim()) {
      return res.status(400).json({
        message: "Remarks are required when rejecting a request",
      });
    }

    const permission = await Permission.findById(id);

    if (!permission) {
      return res.status(404).json({
        message: "Permission request not found",
      });
    }

    if (permission.status !== "pending_faculty") {
      return res.status(400).json({
        message: "This permission is not awaiting faculty review",
      });
    }

    const previousStatus = permission.status;

    if (action === "approve") {
      const type = await PermissionType.findById(permission.permissionType);

      permission.approvalRemarks = remarks?.trim() || "";

      if (type?.requiresHODApproval) {
        permission.status = "pending_hod";
      } else {
        const qrData = await generatePermissionQR(permission._id);

        permission.status = "approved";
        permission.qrCode = qrData.qrCode;
        permission.qrToken = qrData.qrToken;
        permission.qrGeneratedAt = qrData.qrGeneratedAt;
      }
    } else {
      permission.status = "rejected";
      permission.rejectionReason = remarks.trim();
    }

    await permission.save();

    await ApprovalHistory.create({
      permission: permission._id,
      actionBy: req.user._id,
      action: action === "approve" ? "faculty_approved" : "faculty_rejected",
      previousStatus,
      newStatus: permission.status,
      remarks: remarks?.trim() || "",
    });

    return res.status(200).json({
      message: `Permission ${action}d successfully`,
      permission,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to review permission",
      error: error.message,
    });
  }
};

export const reviewHODPermission = async (req, res) => {
  try {
    const { action, remarks } = req.body;
    const { id } = req.params;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        message: "Action must be approve or reject",
      });
    }

    if (req.user.role !== "hod") {
      return res.status(403).json({
        message: "Only the HOD can review these requests",
      });
    }

    if (action === "reject" && !remarks?.trim()) {
      return res.status(400).json({
        message: "Remarks are required when rejecting a request",
      });
    }

    const permission = await Permission.findById(id);

    if (!permission) {
      return res.status(404).json({
        message: "Permission request not found",
      });
    }

    if (permission.status !== "pending_hod") {
      return res.status(400).json({
        message: "This permission is not awaiting HOD review",
      });
    }

    const previousStatus = permission.status;

    if (action === "approve") {
      const qrData = await generatePermissionQR(permission._id);

      permission.status = "approved";
      permission.approvalRemarks = remarks?.trim() || "";
      permission.qrCode = qrData.qrCode;
      permission.qrToken = qrData.qrToken;
      permission.qrGeneratedAt = qrData.qrGeneratedAt;
    } else {
      permission.status = "rejected";
      permission.rejectionReason = remarks.trim();
    }

    await permission.save();

    await ApprovalHistory.create({
      permission: permission._id,
      actionBy: req.user._id,
      action: action === "approve" ? "hod_approved" : "hod_rejected",
      previousStatus,
      newStatus: permission.status,
      remarks: remarks?.trim() || "",
    });

    return res.status(200).json({
      message: `Permission ${action === "approve" ? "approved" : "rejected"} by HOD`,
      permission,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to review permission",
      error: error.message,
    });
  }
};

export const getPermissionById = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id)
      .populate("student", "name email studentId")
      .populate("permissionType", "name requiresHODApproval")
      .populate("department", "name code")
      .populate("academicYear", "name")
      .populate("section", "name");

    if (!permission) {
      return res.status(404).json({
        message: "Permission request not found",
      });
    }

    const isOwner =
      permission.student._id.toString() === req.user._id.toString();

    const isAuthorizedStaff = ["faculty", "hod", "admin"].includes(
      req.user.role,
    );

    if (!isOwner && !isAuthorizedStaff) {
      return res.status(403).json({
        message: "You are not authorized to view this permission",
      });
    }

    return res.status(200).json({
      message: "Permission fetched successfully",
      permission,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid permission ID",
      });
    }

    return res.status(500).json({
      message: "Failed to fetch permission",
      error: error.message,
    });
  }
};

export const verifyPermissionQR = async (req, res) => {
  try {
    const { permissionId, token } = req.body;

    if (!permissionId || !token) {
      return res.status(400).json({
        message: "Permission ID and QR token are required",
      });
    }

    if (!["faculty", "hod", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only authorized staff can verify QR passes",
      });
    }

    const permission =
      await Permission.findById(permissionId).select("+qrToken");

    if (!permission) {
      return res.status(404).json({
        message: "Permission not found",
      });
    }

    if (permission.status !== "approved") {
      return res.status(400).json({
        message: "Permission is not approved or has already been used",
      });
    }

    if (!permission.qrToken || permission.qrToken !== token) {
      return res.status(401).json({
        message: "Invalid QR token",
      });
    }

    const now = new Date();
    const permissionDate = new Date(permission.date);

    const today = now.toLocaleDateString("en-CA");
    const allowedDate = permissionDate.toLocaleDateString("en-CA");

    const currentTime = now.toTimeString().slice(0, 5);

    if (today !== allowedDate) {
      return res.status(400).json({
        message: "Permission is not valid today",
      });
    }

    if (currentTime < permission.fromTime || currentTime > permission.toTime) {
      return res.status(400).json({
        message: "Permission is outside its allowed time",
      });
    }

    permission.status = "active";
    permission.qrVerifiedAt = now;
    await permission.save();

    await ApprovalHistory.create({
      permission: permission._id,
      actionBy: req.user._id,
      action: "qr_verified",
      previousStatus: "approved",
      newStatus: "active",
      remarks: "QR pass verified successfully",
    });

    return res.status(200).json({
      message: "QR verified. Permission is now active",
      permission,
    });
  } catch (error) {
    return res.status(500).json({
      message: "QR verification failed",
      error: error.message,
    });
  }
};

export const completePermission = async (req, res) => {
  try {
    if (!["faculty", "hod", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only authorized staff can complete permissions",
      });
    }

    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({
        message: "Permission not found",
      });
    }

    if (permission.status !== "active") {
      return res.status(400).json({
        message: "Only active permissions can be completed",
      });
    }

    permission.status = "completed";
    await permission.save();

    await ApprovalHistory.create({
      permission: permission._id,
      actionBy: req.user._id,
      action: "completed",
      previousStatus: "active",
      newStatus: "completed",
      remarks: "Student return confirmed",
    });

    return res.status(200).json({
      message: "Permission completed successfully",
      permission,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to complete permission",
      error: error.message,
    });
  }
};

export const getPermissionHistory = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({
        message: "Permission not found",
      });
    }

    const isOwner = permission.student.toString() === req.user._id.toString();

    const isStaff = ["faculty", "hod", "admin"].includes(req.user.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        message: "You are not authorized to view this history",
      });
    }

    const history = await ApprovalHistory.find({
      permission: permission._id,
    })
      .populate("actionBy", "name email role")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      count: history.length,
      history,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid permission ID",
      });
    }

    return res.status(500).json({
      message: "Failed to fetch permission history",
      error: error.message,
    });
  }
};

export const getAllPermissions = async (req, res) => {
  try {
    if (!["faculty", "hod", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only authorized staff can view all permissions",
      });
    }

    const allowedStatuses = [
      "draft",
      "submitted",
      "pending_faculty",
      "faculty_approved",
      "pending_hod",
      "approved",
      "rejected",
      "active",
      "completed",
      "expired",
    ];

    const filter = {};

    if (req.query.status) {
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          message: "Invalid permission status",
        });
      }

      filter.status = req.query.status;
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10),
    );

    const skip = (page - 1) * limit;

    const [permissions, total] = await Promise.all([
      Permission.find(filter)
        .populate("student", "name email studentId")
        .populate("permissionType", "name requiresHODApproval")
        .populate("academicYear", "name")
        .populate("section", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Permission.countDocuments(filter),
    ]);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      permissions,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch permissions",
      error: error.message,
    });
  }
};

export const getPermissionSummary = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        message: "Only students can access this summary",
      });
    }

    const studentId = req.user._id;

    const [total, pending, approved, rejected, active, completed] =
      await Promise.all([
        Permission.countDocuments({ student: studentId }),
        Permission.countDocuments({
          student: studentId,
          status: {
            $in: ["submitted", "pending_faculty", "pending_hod"],
          },
        }),
        Permission.countDocuments({
          student: studentId,
          status: "approved",
        }),
        Permission.countDocuments({
          student: studentId,
          status: "rejected",
        }),
        Permission.countDocuments({
          student: studentId,
          status: "active",
        }),
        Permission.countDocuments({
          student: studentId,
          status: "completed",
        }),
      ]);

    return res.status(200).json({
      summary: {
        total,
        pending,
        approved,
        rejected,
        active,
        completed,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch permission summary",
      error: error.message,
    });
  }
};
