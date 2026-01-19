const connectDB = require("./config/db");


require("dotenv").config();
const express =require("express");
const userRoutes = require("./routes/users");

console.log("MONGO_URI =", process.env.MONGO_URI); // ✅ add this
connectDB();

const app=express();
const PORT = process.env.PORT || 5000;


//middleware to read json
app.use (express.json());

app.use("/api/users",userRoutes);
//TEST Route

app.get("/",(req,res) => {

    res.json({
        message:"Hi Welcome to Codveda , Backend is Running with Nodemon 🚀 Successfully"
    });
});

app.listen(PORT,()=>{
   console.log(`Server running on http://localhost:${PORT}`);

});
