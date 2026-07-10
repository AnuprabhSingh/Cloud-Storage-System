import { ObjectId } from "mongodb";
import { client } from "../config/db.js";

export const registerUser = async (req, res, next) => {
  const { name, email, password } = req.body;
  const db = req.db;

  const existingUser = await db.collection("users").findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: "User already exists" });
  }

  const session = client.startSession();

  try {
    const rootDirId = new ObjectId();
    const userId = new ObjectId();

    session.startTransaction();
    const dirCollection = db.collection("directories");
    await dirCollection.insertOne(
      {
        _id: rootDirId,
        name: `root-${email}`,
        parentDirId: null,
        userId: userId,
      },
      { session }
    );

    await db.collection("users").insertOne(
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
      await session.abortTransaction();
    }
    if (err.code === 121) {
      return res.status(400).json({ error: "Data validation failed. Please check your input." });
    }
    next(err);
  } finally {
    await session.endSession();
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const db = req.db;
  const user = await db.collection("users").findOne({ email, password });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  res.cookie("uid", user._id.toString(), {
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
