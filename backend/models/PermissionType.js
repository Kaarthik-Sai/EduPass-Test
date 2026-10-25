import mongoose from "mongoose";

const permissionTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },

    requiresHODApproval: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const PermissionType = mongoose.model("PermissionType", permissionTypeSchema);

export default PermissionType;
