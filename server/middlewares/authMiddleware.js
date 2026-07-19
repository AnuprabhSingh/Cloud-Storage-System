// import userData from "../usersDB.json" with {type: "json"};
import User from "../models/UserModel.js";
// import { ObjectId } from "mongodb";
export default async function CheckAuth(req,res,next){
    const { uid } = req.cookies;
    // const db = req.db; // Use shared DB connection
    const user = await User.findOne({_id: uid}).lean();
    if (!uid || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = user
    next()
}