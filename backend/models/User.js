import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  interviews: [{
    date: String,
    score: Number,
    difficulty: String,
    recommendation: String,
    questions: Number,
  }],
}, { timestamps: true });

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.methods.comparePassword = function (pass) {
  return bcrypt.compare(pass, this.password);
};

export default mongoose.model("User", userSchema);