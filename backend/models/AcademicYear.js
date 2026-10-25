import mongoose from "mongoose";

const academicYearSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const AcademicYear = mongoose.model("AcademicYear", academicYearSchema);

export default AcademicYear;
