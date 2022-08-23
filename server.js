const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const ChatMessage = require("./models/chat_message");
const Chat = require("./models/chat");
const User = require("./models/user");
const admin = require("./firebase/config");

io.on("connection", (socket) => {
  socket.on("message", async (message) => {
    io.emit("message", message);
    const newChatMessage = new ChatMessage({
      chatId: message.chatId,
      senderIsAdmin: message.senderIsAdmin,
      message: message.message,
      isImage: message.isImage,
    });

    await newChatMessage.save();

    const notification_options = {
      priority: "high",
      timeToLive: 60 * 60 * 24,
      collapseKey: "customer_support",
    };
    
    const chat = await Chat.findById(message.chatId);
    const client = await User.findById(chat.clientId);
    const registrationToken = client.firebaseToken;
    const msg = {data: {type: "chat"}, notification: {title: "New message from Customer support", body: message.message, tag: "chat"}};
    const options = notification_options;

    admin.messaging().sendToDevice(registrationToken, msg).then((md)=>{
      console.log(md);
    });
  });

  socket.on("deliver", async (message) => {
    io.emit("deliver", message);
  });
});

const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");

mongoose.connect(process.env.DATABASE_URL, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("DB Connected!");
  }
});

const loginRouter = require("./routes/login");
const loginFingerprintRouter = require("./routes/loginFingerprint");
const registerRouter = require("./routes/register");
const userRouter = require("./routes/user");
const categoriesRouter = require("./routes/categories");
const productsRouter = require("./routes/products");
const bundleRouter = require("./routes/bundles");
const cartRouter = require("./routes/cart");
const ordersRouter = require("./routes/orders");
const couponsRouter = require("./routes/coupons");
const cardsRouter = require("./routes/cards");
const paymentRouter = require("./routes/payment");
const adminDashboardRouter = require("./routes/admin_dashboard");
const chatsRouter = require("./routes/chats");
const noticesRouter = require("./routes/notices");

const port = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

app.use("/login", loginRouter);
app.use("/login_fingerprint", loginFingerprintRouter);
app.use("/register", registerRouter);
app.use("/users", userRouter);
app.use("/products", productsRouter);
app.use("/categories", categoriesRouter);
app.use("/bundles", bundleRouter);
app.use("/cart", cartRouter);
app.use("/orders", ordersRouter);
app.use("/coupons", couponsRouter);
app.use("/cards", cardsRouter);
app.use("/payment", paymentRouter);
app.use("/admin-dashboard", adminDashboardRouter);
app.use("/chats", chatsRouter);
app.use("/notices", noticesRouter);

app.get("/", (req, res) => {
  res.send("Welcome to Food Agro Backend!");
});

http.listen(port, () => {
  console.log(`Server Started on PORT ${port}`);
});
