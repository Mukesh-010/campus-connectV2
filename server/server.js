require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "client")));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "development-secret";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  department: { type: String, default: "General" },
  role: { type: String, enum: ["student", "faculty"], default: "student" }
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  text: { type: String, required: true, trim: true }
}, { timestamps: true });

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ["department", "club"], default: "department" },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);
const Group = mongoose.model("Group", groupSchema);

function signToken(user) {
  return jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "7d" });
}

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Authentication required" });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, department, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must contain at least 6 characters" });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, password: hash,
      department: department || "General",
      role: role || "student"
    });

    res.status(201).json({
      token: signToken(user),
      user: { id: user._id, name: user.name, email: user.email, department: user.department, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    res.json({
      token: signToken(user),
      user: { id: user._id, name: user.name, email: user.email, department: user.department, role: user.role }
    });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
});

app.get("/api/me", auth, (req, res) => res.json(req.user));

app.get("/api/users", auth, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } })
    .select("name email department role")
    .sort({ name: 1 });
  res.json(users);
});

app.get("/api/messages/:userId", auth, async (req, res) => {
  const messages = await Message.find({
    $or: [
      { sender: req.user._id, receiver: req.params.userId },
      { sender: req.params.userId, receiver: req.user._id }
    ]
  }).populate("sender", "name").sort({ createdAt: 1 });
  res.json(messages);
});

app.post("/api/messages", auth, async (req, res) => {
  const { receiverId, text } = req.body;
  if (!receiverId || !text?.trim()) return res.status(400).json({ message: "Receiver and message are required" });

  const message = await Message.create({
    sender: req.user._id,
    receiver: receiverId,
    text: text.trim()
  });
  const populated = await message.populate("sender", "name");
  io.to(`user:${receiverId}`).emit("private-message", populated);
  io.to(`user:${req.user._id}`).emit("message-sent", populated);
  res.status(201).json(populated);
});

app.get("/api/groups", auth, async (req, res) => {
  const groups = await Group.find({ members: req.user._id })
    .populate("members", "name email department")
    .sort({ name: 1 });
  res.json(groups);
});

app.post("/api/groups", auth, async (req, res) => {
  const { name, type } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Group name is required" });

  const group = await Group.create({
    name: name.trim(),
    type: type === "club" ? "club" : "department",
    members: [req.user._id]
  });
  const populated = await group.populate("members", "name email department");
  res.status(201).json(populated);
});

app.post("/api/groups/:groupId/join", auth, async (req, res) => {
  const group = await Group.findByIdAndUpdate(
    req.params.groupId,
    { $addToSet: { members: req.user._id } },
    { new: true }
  ).populate("members", "name email department");
  if (!group) return res.status(404).json({ message: "Group not found" });
  res.json(group);
});

app.get("/api/groups/:groupId/messages", auth, async (req, res) => {
  const group = await Group.findOne({ _id: req.params.groupId, members: req.user._id });
  if (!group) return res.status(403).json({ message: "You are not a member of this group" });

  const messages = await Message.find({ group: group._id })
    .populate("sender", "name")
    .sort({ createdAt: 1 });
  res.json(messages);
});

app.post("/api/groups/:groupId/messages", auth, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ message: "Message is required" });

  const group = await Group.findOne({ _id: req.params.groupId, members: req.user._id });
  if (!group) return res.status(403).json({ message: "You are not a member of this group" });

  const message = await Message.create({
    sender: req.user._id,
    group: group._id,
    text: text.trim()
  });
  const populated = await message.populate("sender", "name");

  for (const memberId of group.members) {
    io.to(`user:${memberId}`).emit("group-message", populated);
  }
  res.status(201).json(populated);
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.user.id}`);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/campus_connect")
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => console.log(`Campus Connect running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
