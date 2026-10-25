import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },

    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },

    permissionType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PermissionType",
      required: true,
    },

    reason: {
      type: String,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    fromTime: {
      type: String,
      required: true,
    },

    toTime: {
      type: String,
      required: true,
    },

    destination: {
      type: String,
    },

    contactDetails: {
      type: String,
    },

    supportingDocument: {
      url: String,
      publicId: String,
      fileName: String,
    },

    status: {
      type: String,
      enum: [
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
      ],
      default: "draft",
    },

    approvalRemarks: {
      type: String,
    },

    rejectionReason: {
      type: String,
    },

    qrCode: {
      type: String,
    },

    qrToken: {
      type: String,
    },

    qrGeneratedAt: {
      type: Date,
    },

    qrVerifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

const Permission = mongoose.model("Permission", permissionSchema);

export default Permission;
