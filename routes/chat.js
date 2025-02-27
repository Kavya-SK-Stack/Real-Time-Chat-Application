import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { getMyChats, newGroupChat, getMyGroups, addMembers, leaveGroup, removeMember, sendAttachments, getChatDetails, renameGroup, deleteChat, getMessages } from "../controllers/chat.js";
import {uploadAttachments} from "../middlewares/multer.js";
import { addMemberValidator, chatIdValidator, newGroupValidator, removeMemberValidator, renameValidator, sendAttachmentsValidator, validateHandler } from "../lib/validators.js";

const app = express.Router();


// After here user must be logged in to access the routes
app.use(isAuthenticated);

app.post("/new", newGroupValidator(), validateHandler, newGroupChat)

app.get("/my", getMyChats);

app.get("/my/groups", getMyGroups);

app.put("/addmembers",addMemberValidator(), validateHandler, addMembers);

app.put("/removemember", removeMemberValidator(), validateHandler, removeMember);

app.delete("/leave/:id", chatIdValidator(), validateHandler, leaveGroup);

app.post("/message", uploadAttachments,sendAttachmentsValidator(), validateHandler, sendAttachments);

// Get messages
app.get("/message/:id", chatIdValidator(), validateHandler, getMessages);

// Get chat details,rename,delete
app
  .route("/:id")
  .get(chatIdValidator(), validateHandler, getChatDetails)
  .put(renameValidator(), validateHandler, renameGroup)
  .delete(chatIdValidator(), validateHandler, deleteChat);


export default app;