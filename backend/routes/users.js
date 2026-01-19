const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "codveda_secret_key";

//  JWT VERIFY MIDDLEWARE
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // attach user info
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};



let users = [
    {
        id:1,
        name:"Aravindan",
        email:"aravindan.saran2001@gmail.com",
        password: "$2b$10$examplehash"},
]

// 🔒 PROTECTED ROUTE
router.get("/profile", verifyToken, (req, res) => {
  return res.json({
    message: "Access granted",
    user: req.user
  });
});





const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ✅ Only letters (A-Z, a-z). No spaces, no numbers, no symbols
const isValidUsername = (name) => /^[A-Za-z]+$/.test(name);

const emailExists = (email, ignoreId = null) =>
  users.some((u) => u.email === email && u.id !== ignoreId);

const usernameExists = (name, ignoreId = null) =>
  users.some((u) => u.name.toLowerCase() === name.toLowerCase() && u.id !== ignoreId);


//helper to generate new id
const getNextId = () => (users.length ? Math.max(...users.map(u => u.id)) + 1 : 1);

//Read all the users
router.get("/",(req,res) => {
 res.json(users);
});

// get user based on id 
router.get("/:id",(req,res) =>{
    const id = Number(req.Params.id);
    const user= users.find((u) => u.id === id);

    if(!user) return res.status(404).json({message:"User not Found"});

    res.json(user);
});

//create the user 

router.post("/",(req,res)=>{
    const {name,email} = req.body;

    if(!name || !email){
        return res.status(404).json({message:"Name anD Email Are Required"});
    }

const cleanName = String(name).trim();
const cleanEmail = String(email).trim().toLowerCase();

  // ✅ username rules
  if (cleanName.length < 6) {
    return res.status(400).json({ message: "username must be at least 6 letters" });
  }
  if (!isValidUsername(cleanName)) {
    return res.status(400).json({
      message: "username must contain only letters (no spaces, numbers, symbols)",
    });
  }
  if (usernameExists(cleanName)) {
    return res.status(409).json({ message: "username already exists" });
  }

  // ✅ email rules
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ message: "invalid email format" });
  }
  if (emailExists(cleanEmail)) {
    return res.status(409).json({ message: "email already exists" });
  }

    const newUser = {
        id:getNextId(),
        name :cleanName,
        email : cleanEmail,
    };

   users.push(newUser);
   res.status(201).json(newUser);
});

//update user details

router.put("/:id",(req,res)=>{

const id = Number(req.params.id);
const {name,email}=req.body;

const index = users.findIndex((u) => u.id=== id );

if (index === -1) {
    return res.status(404).json({message:"User Not Found"});
}

 // ✅ update username if provided
  if (name !== undefined) {
    const cleanName = String(name).trim();

    if (cleanName.length < 6) {
      return res.status(400).json({ message: "username must be at least 6 letters" });
    }
    if (!isValidUsername(cleanName)) {
      return res.status(400).json({
        message: "username must contain only letters (no spaces, numbers, symbols)",
      });
    }
    if (usernameExists(cleanName, id)) {
      return res.status(409).json({ message: "username already exists" });
    }

    updatedName = cleanName;
  }

  // ✅ update email if provided
  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ message: "invalid email format" });
    }
    if (emailExists(cleanEmail, id)) {
      return res.status(409).json({ message: "email already exists" });
    }

    updatedEmail = cleanEmail;
  }
// update only 
user [index] ={
    ...users[index],
    name :updatedName,
    email:updatedEmail
};

    res.json(users[index]);
});

//delete user details

router.delete("/:id",(req,res) => {

const id=Number(req.params.id);
const index = users.findIndex((u)=>u.id===id);

if (index === -1) return res.status(404).json({message:"User not Found"});

const deleted =users.splice(index, 1)[0];

    res.json({
       message:"User Deleted".deleted});
});

// ✅ SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }


    if (!isValidUsername(name)) {
      return res.status(400).json({
        message: "username must contain only letters (no spaces, numbers, symbols)",
      });
    }
    if (usernameExists(name)) {
      return res.status(409).json({ message: "username already exists" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "invalid email format" });
    }
    if (emailExists(email)) {
      return res.status(409).json({ message: "email already exists" });
    }

    // 3) hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4) save user
    const newUser = {
      id: getNextId(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
    };

    users.push(newUser);

    // 5) response (never return password)
    return res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      message: "Signup successful",
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

// ✅ LOGIN with JWT
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const user = users.find((u) => u.email === cleanEmail);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports=router;