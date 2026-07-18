// import userData from "../usersDB.json" with {type: "json"};
import { secretKey } from "../controllers/userControllers.js";
import User from "../models/UserModel.js";
import crypto from "crypto"
// import { ObjectId } from "mongodb";
export default async function CheckAuth(req,res,next){

    const { token } = req.cookies;
    if (!token) {
      return res.status(401).json({ error: "Not Logged In !" });
    }
    // console.log(token);
    const [payload,oldSignature] = token.split(".")
    const jsonPayload = Buffer.from(payload,'base64url').toString()
    // console.log(id,expiry);
    const newSignature = crypto.createHash("sha256").update(secretKey).update(jsonPayload).update(secretKey).digest("base64url")
    
    if(oldSignature !== newSignature){
      res.clearCookie("token");
      return res.status(401).json({ error: "Not Logged In !" });
    }

    const {id,expiry:expiryTimeInSeconds} = JSON.parse(jsonPayload)

    // const db = req.db; // Use shared DB connection
     const currentTimeInSecond = Math.round(Date.now()/1000)
    // const expiryTimeInSeconds = parseInt(uid.substr(24,32),16)

    // console.log({currentTimeInSecond,expiryTimeInSeconds});

    if(currentTimeInSecond - expiryTimeInSeconds >=0){
      res.clearCookie("token");
      return res.status(401).json({ error: "Not Logged In !" });
    }

    const user = await User.findOne({_id: id}).lean();
    if (!user) {
      res.clearCookie("token");
      return res.status(401).json({ error: "Not Logged In !" });
    }
    req.user = user
    next()
}