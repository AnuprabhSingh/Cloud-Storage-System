// import userData from "../usersDB.json" with {type: "json"};

import { ObjectId } from "mongodb";
export default async function CheckAuth(req,res,next){
    const { uid } = req.cookies;
    const db = req.db; // Use shared DB connection
    const user = await db.collection("users").findOne({_id: new ObjectId(uid)});
    if (!uid || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = user
    next()
}