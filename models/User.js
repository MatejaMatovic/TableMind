import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Ime je obavezno"],
    },
    email: {
      type: String,
      required: [true, "Email je obavezan"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Lozinka je obavezna"],
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);

