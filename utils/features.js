import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { getBase64, getSockets } from "../lib/helper.js";

const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};
const connectDB = (uri) => {
  mongoose
    .connect(uri, {
      dbName: "OurChat",
    })
    .then((data) => console.log(`Connected to DB: ${data.connection.host}`))
    .catch((err) => {
      throw err;
    });
};

const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  return res.status(code).cookie("ourchat-token", token, cookieOptions).json({
    success: true,
    user,
    message,
  });
};

const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io"); // Ensure io is retrieved from Express app

  if (!io) {
    console.error("emitEvent Error: Socket.io instance not found.");
    return;
  }

  // Ensure users array is valid
  if (!Array.isArray(users) || users.length === 0) {
    console.error("emitEvent Error: No valid users to send event.");
    return;
  }

  let usersSocket = getSockets(users);

  // Filter out undefined sockets
  usersSocket = usersSocket.filter((socket) => socket !== undefined);

  if (usersSocket.length === 0) {
    console.error("emitEvent Error: No active sockets found for users:", users);
    return;
  }

  console.log(`Emitting event: ${event} to users:`, usersSocket);

  io.to(usersSocket).emit(event, data);
};

const deleteFilesFromCloudinary = async (public_ids) => {};

export {
  connectDB,
  sendToken,
  cookieOptions,
  emitEvent,
  deleteFilesFromCloudinary,
};
