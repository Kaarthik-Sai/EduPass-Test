import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
  },
);

const Department = mongoose.model("Department", departmentSchema);

export default Department;
