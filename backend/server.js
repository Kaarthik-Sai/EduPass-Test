import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import permissionTypeRoutes from "./routes/permissionTypeRoutes.js";
import permissionRoutes from "./routes/permissionRoutes.js";

dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use;
("/api/permission-types", permissionTypeRoutes);
app.use("/api/permissions", permissionRoutes);

connectDB();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
