// import { client } from "../config/db.js";
import Directory from "../models/directoryModels.js";
import User from "../models/UserModel.js";
import mongoose, { Schema } from "mongoose";
import crypto, { pbkdf2, pbkdf2Sync, sign } from "crypto"
import { buffer } from "stream/consumers";

// export const secretKey = "anuprabh"

export const registerUser = async (req, res, next) => {
  const { name, email, password } = req.body;
  // const db = req.db;

  // const hashedPassword = crypto.createHash("sha256").update(password).digest("hex") // basic hashing using hmac
  const salt = crypto.randomBytes(16)
  const hashedPassword = pbkdf2Sync(password,salt,100000,32,"sha256")

  const existingUser = await User.findOne({ email }).lean();
  // if (existingUser) {
  //   return res.status(409).json({ message: "User already exists" });
  // }

  const session = await mongoose.startSession();

  try {
    const rootDirId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    session.startTransaction();
    // const dirCollection = db.collection("directories");
    await Directory.insertOne(
      {
        _id: rootDirId,
        name: `root-${email}`,
        parentDirId: null,
        userId: userId,
      },
      { session }
    );

    await User.insertOne(
      {
        _id: userId,
        name,
        email,
        password : `${salt.toString("base64url")}.${hashedPassword.toString("base64url")}`,
        rootDirId: rootDirId,
      },
      { session }
    );
    await session.commitTransaction();

    return res.status(201).json({
      message: "User Created",
      user: {
        id: userId,
        name,
        email,
        rootDirId,
      },
    });
  } catch (err) {
    if (session.inTransaction()) {
     console.dir(err.errorResponse.errInfo.details, { depth: null });
      await session.abortTransaction();
    }
    if (err.code === 121) {
      return res.status(400).json({ error: "Data validation failed. Please check your input." });
    }
    else if(err.code === 11000){
      if(err.KeyValue.email){
        return res.status(409).json({ message: "User already exists" });
      }
    }
    else{
    next(err);
    }
  } finally {
    await session.endSession();
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  // const db = req.db;
  const user = await User.findOne({ email});
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // const enteredPasswordhash = crypto.createHash("sha256").update(password).digest("hex")
  const [salt , savedHashedPassword] = user.password.split('.')
  const enteredPasswordhash = pbkdf2Sync(password,Buffer.from(salt,"base64url"),100000,32,"sha256").toString("base64url")
  // console.log(enteredPasswordhash);
  // console.log(savedHashedPassword);

  if(enteredPasswordhash !== savedHashedPassword ){
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const cookiePayload = JSON.stringify({
    id: user._id.toString(),
    expiry: Math.round(Date.now()/1000 + 60).toString()
  })
  // console.log(cookiePayload);

  // const signature = crypto.createHash("sha256").update(secretKey).update(cookiePayload).update(secretKey).digest("base64url")
  //basically this is not signature but a hmac. there is btter method to generate hmac as crypto.createHmac("sha256",secretKey).update(path).digest("hex")

  // const signedCookiePayload = `${Buffer.from(cookiePayload).toString("base64url")}.${signature}`
  res.cookie("token", Buffer.from(cookiePayload).toString("base64url"),  {
    httpOnly: true,
    signed : true,
    sameSite: "Lax",
    maxAge: 24 * 60 * 60 * 1000 * 7, // 7 day
  });
  res.json({ message: "Login successful" });
};

export const getCurrentUser = (req, res) => {
  res.status(200).json({
    name: req.user.name,
    email: req.user.email,
  });
};

export const logoutUser = (req, res) => {
  res.clearCookie("token");
  res.status(201).end();
};
