import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { User } from "../models/user.js";
import { Message } from "../models/message.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";
import { cookieOptions } from "../utils/features.js";


const adminLogin = TryCatch(async (req,res,next) => {
 
  const { secretKey } = req.body;

  const isMatched = secretKey === process.env.ADMIN_SECRET_KEY;

  if (!isMatched) return next(new ErrorHandler("Invalid Secret Key", 401));
  
  const token = jwt.sign(secretKey, process.env.JWT_SECRET);

  return res.status(200).cookie("ourchat-admin-token", token, { ...cookieOptions, maxAge:1000*60*15 }).json({
    success: true,
    message: "Authenticated Sucessfull , Welcome BOSS ",
  });
});

const adminLogout = TryCatch(async (req, res, next) => {
  
  return res
    .status(200)
    .cookie("ourchat-admin-token", "", {
      ...cookieOptions,
      maxAge: 0,
    })
    .json({
      success: true,
      message: "Logged Out Sucessfully ",
    });
});

const getAdminData = TryCatch(async (req, res, next) => {
  
  return res.status(200).json({
    admin: true,
  });
});

const allUsers = TryCatch(async (req, res) => { 

    const users = await User.find({});

    const transformedUsers = await Promise.all(
      users.map(async ({ name, username, avatar, _id }) => {
        const [groups, friends] = await Promise.all([
          Chat.countDocuments({ groupChat: true, members: _id }),
          Chat.countDocuments({ groupChat: false, members: _id }),
        ]);

        return {
          name,
          username,
          avatar: avatar.url,
          _id,
          groups,
          friends,
        };
      })
    );
    return res.status(200).json({
        status: "success",
        users: transformedUsers,
    });


});

const allChats = TryCatch(async (req, res) => {
  const chats = await Chat.find({})
    .populate("members", "name avatar")
    .populate("creator", "name avatar");

  const transformedChats = await Promise.all(
    chats.map(async ({ _id, name, groupChat, members, creator }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });

      return {
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map((member ) => member.avatar.url),
        members: members.map((member) => {
            return {
                _id: member._id,
                name: member.name,
                avatar: member.avatar.url,
            };
        }),

        creator: {
          name: creator?.name || "None",
          avatar: creator?.avatar.url || "",
        },
        totalMembers: members.length,
      }; 
    })
  );

  return res.status(200).json({
    status: "success",
    chats: transformedChats,
  });
});

const allMessages = TryCatch(async (req, res) => { 

    const messages = await Message.find({})
        .populate("sender", "name avatar")
        .populate("chat", " groupChat");

    const transformedMessages = messages.map((message) => {
  const { sender, chat, content, createdAt, _id, attachments } = message;

  return {
    _id,
    attachments,
    content,
    createdAt,
    chat: chat ? chat.id : null,
    groupChat: chat ? chat.groupChat : null,
    sender: sender
      ? {
          _id: sender?._id, 
          name: sender?.name, 
          avatar: sender?.avatar ? sender.avatar.url : null,
        }
      : null,
  };
});
    
    

    return res.status(200).json({
        status: "success",
        messages: transformedMessages,
    });
});

const getDashboardStats = TryCatch(async (req, res) => {
  
  const [groupsCount, userCount, messageCount, totalChatscount] =
    await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments(),
      Message.countDocuments(),
      Chat.countDocuments(),
    ]);
  
  const today = new Date();

  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  
  const last7DaysMessages = await Message.find({
    createdAt: {
      $gte: last7Days,
      $lte: today,
    },
  }).select("createdAt")

  const messages = new Array(7).fill(0);
  const dayInMilliseconds = 24 * 60 * 60 * 1000;


  
  last7DaysMessages.forEach(message => {
const indexApprox =
  (today.getTime() - message.createdAt.getTime()) / dayInMilliseconds
    const index = Math.floor(indexApprox);

    messages[6 - index]++;
  })
  
  const stats = {
    groupsCount,
    userCount,
    messageCount,
    totalChatscount,
    messagesChart: messages,
  };
 
    
  return res.status(200).json({
    status: "success",
    stats,
  });
});
  

export {
  allUsers,
  allChats,
  allMessages,
  getDashboardStats,
  adminLogin,
  adminLogout,
  getAdminData,
};