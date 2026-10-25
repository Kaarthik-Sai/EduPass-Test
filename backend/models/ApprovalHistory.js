import mongoose from "mongoose";

const approvalHistorySchema = new mongoose.Schema(
    {
        permission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Permission",
            required: true
        },

        actionBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        action: {
            type: String,
            enum: [
                "submitted",
                "faculty_approved",
                "faculty_rejected",
                "hod_approved",
                "hod_rejected",
                "qr_verified",
                "completed",
                "expired"
            ],
            required: true
        },

        previousStatus: {
            type: String
        },

        newStatus: {
            type: String
        },

        remarks: {
            type: String,
        }
    },
    {
        timestamps: true
    }
);

const ApprovalHistory = mongoose.model(
    "ApprovalHistory",
    approvalHistorySchema
);

export default ApprovalHistory;