import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      studentId,
      facultyId,
      department,
      academicYear,
      section,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    if (!["student", "faculty", "hod", "admin"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      studentId,
      facultyId,
      department,
      academicYear,
      section,
    });

    await newUser.save();

    const token = generateToken(newUser._id);

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        studentId: newUser.studentId,
        facultyId: newUser.facultyId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

//-------------------------------------------------------------------------------

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        facultyId: user.facultyId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error during login",
    });
  }
};
