const router = require("express").Router();
const { validateAdmin, validateClient } = require("../middlewares/validate");
const Chat = require("../models/chat");
const joi = require("joi");
const User = require("../models/user");
const ChatMessage = require("../models/chat_message");

router.post("/new-chat", validateAdmin, async (req, res) => {
  const schema = joi.object({
    clientId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const chatExist = await Chat.find({ clientId: data.clientId });
    if (chatExist[0] !== undefined) return res.status(500).send("Chat already exist");
    const newChat = new Chat({
      clientId: data.clientId,
    });
    res.send(await newChat.save());
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.get("/get-chats", validateAdmin, async (req, res) => {
  const chats = await Chat.find().sort({_id: -1});
  let chatList = [];
  for (const chat of chats) {
    const user = await User.findById(chat.clientId);
    chatList.push({
      _id: chat._id,
      clientId: user._id,
      clientName: user.name,
      clientProfilePic: user.profilePic,
    });
  }
  res.send(chatList);
});

router.get("/get-messages", validateClient, async (req, res) => {
  const chatExist = await Chat.findOne({ clientId: req.user._id });
  if (chatExist) {
    res.send(
      await ChatMessage.find({ chatId: chatExist._id }).sort({ _id: -1 })
    );
  } else {
    const newChat = new Chat({ clientId: req.user._id });
    const savedChat = await newChat.save();

    res.send(
      await ChatMessage.find({ chatId: savedChat._id }).sort({ _id: -1 })
    );
  }
});

router.get("/get-messages/:chatId", validateAdmin, async (req, res) => {
  res.send(await ChatMessage.find({ chatId: req.params.chatId }));
});

router.get("/get-chat-id", validateClient, async (req, res) => {
  const chatExist = await Chat.findOne({ clientId: req.user._id });
  if (chatExist) {
    res.send(chatExist._id);
  } else {
    const newChat = new Chat({ clientId: req.user._id });
    const savedChat = await newChat.save();

    res.send(savedChat._id);
  }
});

module.exports = router;
