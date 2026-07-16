// import userData from "../usersDB.json" with {type: "json"};
import User from "../models/UserModel.js";
// import { ObjectId } from "mongodb";
export default async function CheckAuth(req,res,next){

    const { uid } = req.cookies;
    const {id,expiry:expiryTimeInSeconds} = JSON.parse(Buffer.from(uid,"base64url").toString())
    // console.log(id,expiry);

    // const db = req.db; // Use shared DB connection
     const currentTimeInSecond = Math.round(Date.now()/1000)
    // const expiryTimeInSeconds = parseInt(uid.substr(24,32),16)

    // console.log({currentTimeInSecond,expiryTimeInSeconds});

    if(currentTimeInSecond - expiryTimeInSeconds >=0){
      res.clearCookie("uid");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findOne({_id: id}).lean();
    if (!uid || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = user
    next()
}