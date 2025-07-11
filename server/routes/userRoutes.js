import express from "express";
import {writeFile} from "fs/promises";
import directoriesData from "../directoriesDB.json" with {type: "json"};
import usersData from "../usersDB.json" with {type: "json"};
import CheckAuth from "../middlewares/authMiddleware.js";


const router = express.Router();


router.post("/register", async (req, res) => {
  const {name, email ,password} = req.body;

    // Check if the user already exists
    const existingUser = usersData.find(user => user.email === email);
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

  const userId = crypto.randomUUID();
  const dirId = crypto.randomUUID();
  
  directoriesData.push({
    id: dirId,
    name: `root-${email}`,
    userId,
    parentDirId: null,
    files: [],
    directories: [],
  })
  const newUser = {
    id: userId,
    name,
    email,
    password,
    rootDirId: dirId,
  };
  usersData.push(newUser);
  try{await writeFile("./usersDB.json", JSON.stringify(usersData));
  await writeFile("./directoriesDB.json", JSON.stringify(directoriesData));
  return res.status(201).json({
    message: "User Created",
    user: newUser,
  });
}
  catch(err){
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});


router.post("/login", async (req, res,next) => {

  const {email, password} = req.body;
  const user = usersData.find(user => user.email === email && user.password === password);
  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  res.cookie("uid", user.id, {
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

  router.post('/logout',(req,res)=>{
    res.clearCookie('uid')
    res.status(201).end()
  })
})






export default router;