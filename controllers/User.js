import { compare } from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { User } from "../models/user.js";
import cloudinary from "cloudinary";
import { cookieOptions, emitEvent, sendToken } from "../utils/features.js";
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import mongooseu from "mongoose";

// Create a new user and save it to the database and save in cookie and save token
const newUser = TryCatch(async (req, res, next) => {
  const { name, username, password, bio } = req.body;

  const file = req.file;

  if (!file) return next(new ErrorHandler("Please Upload Avatar"));

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = req.file.path;
    console.log("file Path", filePath);

    const result = await cloudinary.uploader.upload(filePath, {
      folder: "uploads",
    });

    fs.unlinkSync(filePath);

    const avatar = {
      url: result.secure_url,
      public_id: result.public_id,
    };

    const user = await User.create({
      name,
      username,
      password,
      bio,
      avatar,
    });

    sendToken(res, user, 201, "User Created Successfully");
  } catch (error) {
    console.error("File upload error:", error);
    return res.status(500).json({ message: "File upload failed" });
  }
});

// Login user and save token in cookie
const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select("+password");

  if (!user) return next(new ErrorHandler("Invalid Username or Password", 404));

  const isMatch = await compare(password, user.password);

  if (!isMatch) return next(new Error("Invalid Username or Password", 404));

  sendToken(res, user, 201, `Welcome Back, ${user.name}`);
});

const getMyProfile = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);

  if (!user) return next(new ErrorHandler("User not found", 404));

  res.status(200).json({
    success: true,
    user,
  });
});

const logout = TryCatch(async (req, res) => {
  return res
    .status(200)
    .cookie("ourchat-token", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Logged out successfully",
    });
});

const searchUser = TryCatch(async (req, res) => {
  const { name } = req.query;

  const myChats = await Chat.find({ groupChat: false, members: req.user });

  const allUsersFromMyChats = myChats.reduce(
    (acc, chat) => acc.concat(chat.members),
    []
  );

  const allUsers = await User.find({ _id: { $ne: req.user._id } });

  let users = allUsers;

  if (name !== "") {
    users = await User.find({
      _id: { $ne: req.user._id },
      name: { $regex: name, $options: "i" },
    });
  }

  const formattedUsers = users.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  return res.status(200).json({
    success: true,
    users: formattedUsers,
  });
});

const sendFriendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;

  // console.log("Receiver ID:", userId);

  // // Check if the user ID is valid
  // if (!mongoose.Types.ObjectId.isValid(userId)) {
  //   console.log("Invalid user ID:", userId);
  //   return next(new ErrorHandler("Invalid user ID", 400));
  // }

  // Check if the user exists in the database
  // const user = await User.findById(userId);
  // if (!user) {
  //   console.log("User not found:", userId);
  //   return next(new ErrorHandler("User not found", 404));
  // }

  // // Check if the user is already a friend
  // const friendship = await friendship.findOne({
  //   $or: [
  //     { user1: req.user, user2: userId },
  //     { user1: userId, user2: req.user },
  //   ],
  // });
  // if (friendship) {
  //   console.log("Users are already friends:", req.user, userId);
  //   return next(new ErrorHandler("Users are already friends", 400));
  // }

  // Check if a friend request already exists
  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });
  if (request)
    return next(new ErrorHandler("Friend request already exists", 400));

  // Create a new friend request
  await Request.create({
    sender: req.user,
    receiver: userId,
  });

  // Emit an event for real-time updates
  emitEvent(req, NEW_REQUEST, [userId]);

  // Success response
  return res.status(200).json({
    success: true,
    message: "Friend Request Sent successfully",
  });
});

const acceptFriendRequest = TryCatch(async (req, res, next) => {
  try {
    const { requestId, accept } = req.body;

    // Fetch request and populate sender & receiver details
    const request = await Request.findById(requestId)
      .populate("sender", "name")
      .populate("receiver", "_id name");

    // Update the receiver field in the request document
    if (!request.receiver) {
      request.receiver = req.user;
      await request.save();
    }


    // Check if request exists
    if (!request) {
      console.log("Request not found:", requestId);
      return next(new ErrorHandler("Request not found", 404));
    }

    // Check if the current user is the receiver
    if (request.receiver._id.toString() !== req.user.toString()) {
      console.log("Unauthorized access attempt by user:", req.user);
      return next(
        new ErrorHandler("You are not authorized to accept this request", 403)
      );
    }

    // If request is rejected
    if (!accept) {
      await request.deleteOne();
      return res.status(200).json({
        success: true,
        message: "Friend Request Rejected",
      });
    }

    // Check if sender exists before proceeding
    if (!request.sender || !request.sender._id) {
      console.log("Sender not found in request:", request);
      return res.status(404).json({ message: "Sender not found" });
    }

    // Define members of the chat
    const members = [request.sender._id, request.receiver._id];

    // Create a new chat and delete the request
    await Promise.all([
      Chat.create({
        members,
        name: `${request.sender.name}-${request.receiver.name}`,
      }),
      request.deleteOne(),
    ]);

    // Emit an event for real-time updates
    emitEvent(req, REFETCH_CHATS, members);

    // Success response
    return res.status(200).json({
      success: true,
      message: "Friend Request Accepted",
      senderId: request.sender._id,
    });
  } catch (error) {
    console.error("Error in acceptFriendRequest:", error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

const getMyNotifications = TryCatch(async (req, res) => {
  const requests = await Request.find({ receiver: req.user }).populate(
    "sender",
    "name avatar"
  );

  const allRequests = requests.map((request) => ({
    _id: request._id,
    sender: {
      _id: request.sender._id,
      name: request.sender.name,
      avatar: request.sender.avatar.url,
    },
  }));

  return res.status(200).json({
    success: true,
    allrequests: allRequests,
  });
});

const getMyFriends = TryCatch(async (req, res) => {
  const chatId = req.query.chatId;

  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user);
   
    if (otherUser) {
      return {
        _id: otherUser._id,
        name: otherUser.name,
        avatar: otherUser.avatar.url,
      };
    } else {
      return null;
    }
  });

  const filteredFriends = friends.filter((friend) => friend !== null);

  if (chatId) {
    const chat = await Chat.findById(chatId);

    const availableFriends = filteredFriends.filter(
      (friend) => !chat.members.includes(friend._id)
    );

    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends: filteredFriends,
    });
  }
});

export {
  login,
  newUser,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getMyNotifications,
  getMyFriends,

};
