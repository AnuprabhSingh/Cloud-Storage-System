import express from "express";
import {writeFile} from "fs/promises";
import directoriesData from "../directoriesDB.json" with {type: "json"};
import usersData from "../usersDB.json" with {type: "json"};
import CheckAuth from "../middlewares/authMiddleware.js";
import { ObjectId } from "mongodb";


const router = express.Router();


router.post("/register", async (req, res) => {
  const {name, email ,password} = req.body;
    const db = req.db; // Use shared DB connection
    if (!db) {
      console.error("req.db is undefined in /user/register");
      return res.status(500).json({ message: "Database not initialized" });
    }
    // Check if the user already exists
    // const existingUser = usersData.find(user => user.email === email);
    const existingUser = await db.collection("users").findOne({email});
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

  // const userId = crypto.randomUUID();
  // const dirId = crypto.randomUUID();
  
  // earlier code using no database
  // directoriesData.push({
  //   id: dirId,
  //   name: `root-${email}`,
  //   userId,
  //   parentDirId: null,
  //   files: [],
  //   directories: [],
  // })
    
    // console.log(rootDirId);

  // const newUser = {
  //   id: userId,
  //   name,
  //   email,
  //   password,
  //   rootDirId: dirId,
  // };
  // usersData.push(newUser);

  try{
  // await writeFile("./usersDB.json", JSON.stringify(usersData));
  // await writeFile("./directoriesDB.json", JSON.stringify(directoriesData));
  const rootDirId = new ObjectId();
  const userId = new ObjectId();

  const dirCollection = db.collection("directories");
     await dirCollection.insertOne({
      _id: rootDirId,
      name: `root-${email}`,
      parentDirId: null,
      userId: userId
    })

  await db.collection("users").insertOne({
    _id: userId,
    name,
    email,
    password,
    rootDirId: rootDirId,
  });


  return res.status(201).json({
    message: "User Created",
    user: {
      id: userId,
      name,
      email,
      rootDirId
    },
  });
}
  catch(err){
    console.error("Registration error:", err);
    return res.status(500).json({
      message: "Something went wrong",
      error: err?.message,
    });
  }
});


router.post("/login", async (req, res,next) => {

  const {email, password} = req.body;
  // const user = usersData.find(user => user.email === email && user.password === password);
  const db = req.db; // Use shared DB connection
  const user = await db.collection("users").findOne({email,password});
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  res.cookie("uid", user._id.toString(), {
    httpOnly: true,
    sameSite: "Lax",
    maxAge: 24 * 60 * 60 * 1000 * 7, // 7 day
  });
  res.json({message: "Login successful"})

})

router.get('/',CheckAuth,(req,res)=>{

  res.status(200).json({
    name: req.user.name,
    email: req.user.email
  })

})

router.post('/logout',(req,res)=>{
  res.clearCookie('uid')
  res.status(201).end()
})






export default router;