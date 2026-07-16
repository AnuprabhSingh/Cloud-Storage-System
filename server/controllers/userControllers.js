// import { client } from "../config/db.js";
import Directory from "../models/directoryModels.js";
import User from "../models/UserModel.js";
import mongoose, { Schema } from "mongoose";

export const registerUser = async (req, res, next) => {
  const { name, email, password } = req.body;
  // const db = req.db;

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
        password,
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
  const user = await User.findOne({ email, password });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const cookiePayload = {
    id: user._id.toString(),
    expiry: Math.round(Date.now()/1000 + 10).toString()
  }
  // console.log(cookiePayload);

  res.cookie("uid", Buffer.from(JSON.stringify(cookiePayload)).toString("base64url"),  {
    httpOnly: true,
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
  res.clearCookie("uid");
  res.status(201).end();
};
