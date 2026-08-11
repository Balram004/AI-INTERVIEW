import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import interviewRouter from "./routes/interview.js";
import authRouter from "./routes/auth.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/interview", interviewRouter);
app.use("/api/auth", authRouter);

app.get("/", (req, res) => res.json({ status: "AI Interview Coach API 🚀" }));

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("MongoDB Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));