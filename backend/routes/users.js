const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ JWT VERIFY MIDDLEWARE
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ message: "Invalid token format" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidUsername = (name) => /^[A-Za-z]+$/.test(name); // only letters

// ✅ SIGNUP (MongoDB)
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (!isValidUsername(cleanName)) {
      return res.status(400).json({
        message: "username must contain only letters (no spaces, numbers, symbols)",
      });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ message: "invalid email format" });
    }

    // ✅ duplicate checks (Mongo)
    const nameExists = await User.findOne({ name: new RegExp("^" + cleanName + "$", "i") });
    if (nameExists) return res.status(409).json({ message: "username already exists" });

    const emailExists = await User.findOne({ email: cleanEmail });
    if (emailExists) return res.status(409).json({ message: "email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      message: "Signup successful",
    });
  } catch (err) {
    console.log("SIGNUP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ✅ LOGIN (MongoDB + JWT)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// 🔒 PROTECTED ROUTE
router.get("/profile", verifyToken, async (req, res) => {
  return res.json({
    message: "Access granted",
    user: req.user,
  });
});

//  Get all users from Mongo (for checking)
router.get("/profile", verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json({
    message: "Access granted",
    user
  });
});

module.exports = router;
