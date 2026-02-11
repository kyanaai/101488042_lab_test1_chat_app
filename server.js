require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const GroupMessage = require("./models/GroupMessage");
const PrivateMessage = require("./models/PrivateMessage");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.static("view"));

app.use("/api/auth", authRoutes);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Test Route
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// Socket.io
const onlineUsers = {}; // username -> socket.id

io.on("connection", (socket) => {
  console.log("New socket connected:", socket.id);

  // Register username => socket.id
  socket.on("registerUser", ({ username }) => {
    if (!username) return;
    onlineUsers[username] = socket.id;
    socket.username = username;
    console.log(`Registered: ${username} -> ${socket.id}`);
  });

  // GROUP CHAT (rooms)
  socket.on("joinRoom", async ({ room, username }) => {
    if (!room) return;

    socket.join(room);
    console.log(`${username} joined ${room}`);

    // Send room history
    try {
      const messages = await GroupMessage.find({ room }).sort({ _id: 1 });
      socket.emit("roomHistory", messages);
    } catch (err) {
      console.error("Error fetching room history:", err);
    }
  });

  socket.on("leaveRoom", ({ room, username }) => {
    if (!room) return;
    socket.leave(room);
    console.log(`${username} left ${room}`);
  });

  socket.on("groupMessage", async (data) => {
    if (!data?.room || !data?.from_user || !data?.message) return;

    try {
      const newMessage = new GroupMessage({
        from_user: data.from_user,
        room: data.room,
        message: data.message
        // date_sent auto default in schema
      });

      await newMessage.save();

      // Broadcast to everyone in the room
      io.to(data.room).emit("groupMessage", newMessage);
    } catch (err) {
      console.error("Error saving group message:", err);
    }
  });

  // PRIVATE CHAT (1-to-1)

  // Private history between two users
  socket.on("getPrivateHistory", async ({ from_user, to_user }) => {
    if (!from_user || !to_user) return;

    try {
      const msgs = await PrivateMessage.find({
        $or: [
          { from_user, to_user },
          { from_user: to_user, to_user: from_user }
        ]
      }).sort({ _id: 1 });

      socket.emit("privateHistory", { withUser: to_user, messages: msgs });
    } catch (err) {
      console.error("Error fetching private history:", err);
    }
  });

  // Private message send
  socket.on("privateMessage", async (data) => {
    if (!data?.from_user || !data?.to_user || !data?.message) return;

    try {
      const saved = new PrivateMessage({
        from_user: data.from_user,
        to_user: data.to_user,
        message: data.message
        // date_sent auto default in schema
      });

      await saved.save();

      // Send to sender
      socket.emit("privateMessage", saved);

      // Send to receiver if online
      const receiverSocketId = onlineUsers[data.to_user];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("privateMessage", saved);
      }
    } catch (err) {
      console.error("Error saving private message:", err);
    }
  });

  // Typing indicator (private only)
  socket.on("typing", ({ from_user, to_user, isTyping }) => {
    if (!from_user || !to_user) return;

    const receiverSocketId = onlineUsers[to_user];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", {
        from_user,
        isTyping: !!isTyping
      });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (socket.username && onlineUsers[socket.username]) {
      delete onlineUsers[socket.username];
      console.log(`Unregistered: ${socket.username}`);
    }
    console.log("Socket disconnected:", socket.id);
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});