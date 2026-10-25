import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            uppercase: true
        },

        academicYear: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicYear",
            required: true
        },

        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true
        }
    },
    {
        timestamps: true
    }
);

const Section = mongoose.model("Section", sectionSchema);

export default Section;