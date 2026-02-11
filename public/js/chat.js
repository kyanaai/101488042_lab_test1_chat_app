// 1) Check login session
const userStr = localStorage.getItem("user");
if (!userStr) window.location.href = "/login.html";
const user = JSON.parse(userStr);

// 2) UI refs
document.getElementById("welcome").textContent =
  `Welcome, ${user.firstname} ${user.lastname} (@${user.username})`;

const box = document.getElementById("box");
const form = document.getElementById("msgForm");
const input = document.getElementById("msgInput");

const roomSelect = document.getElementById("roomSelect");
const joinBtn = document.getElementById("joinBtn");
const leaveBtn = document.getElementById("leaveBtn");
const currentRoomSpan = document.getElementById("currentRoom");

// Private UI refs
const toUserInput = document.getElementById("toUserInput");
const openPrivateBtn = document.getElementById("openPrivateBtn");
const currentPrivateSpan = document.getElementById("currentPrivate");
const typingText = document.getElementById("typingText");

let currentRoom = null;
let currentPrivateUser = null;
let typingTimeout = null;

// 3) Helper: print message
function addMessage(text) {
  const div = document.createElement("div");
  div.className = "msg";
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// 4) Socket
const socket = io();

socket.on("connect", () => {
  console.log("connected:", socket.id);

  // register this user so server can route private msgs
  socket.emit("registerUser", { username: user.username });
});

// GROUP EVENTS

// GROUP: history
socket.on("roomHistory", (messages) => {
  box.innerHTML = "";
  messages.forEach((msg) => {
    addMessage(
      `[${msg.date_sent}] [ROOM:${msg.room}] ${msg.from_user}: ${msg.message}`
    );
  });
});

// GROUP: receive
socket.on("groupMessage", (data) => {
  addMessage(
    `[${data.date_sent}] [ROOM:${data.room}] ${data.from_user}: ${data.message}`
  );
});


// PRIVATE EVENTS

// PRIVATE: history
socket.on("privateHistory", ({ withUser, messages }) => {
  box.innerHTML = "";
  messages.forEach((msg) => {
    const tag = msg.from_user === user.username ? "ME" : msg.from_user;
    addMessage(
      `[${msg.date_sent}] [PRIVATE:${tag} -> ${msg.to_user}] ${msg.message}`
    );
  });
});

// PRIVATE: receive
socket.on("privateMessage", (msg) => {
  const belongs =
    (msg.from_user === user.username && msg.to_user === currentPrivateUser) ||
    (msg.to_user === user.username && msg.from_user === currentPrivateUser);

  if (currentPrivateUser && belongs) {
    const tag = msg.from_user === user.username ? "ME" : msg.from_user;
    addMessage(`[${msg.date_sent}] [PRIVATE:${tag}] ${msg.message}`);
  } else {
    // Notify if you're not currently in that private chat
    if (msg.to_user === user.username) {
      addMessage(
        `[${msg.date_sent}] Private message from ${msg.from_user}: ${msg.message}`
      );
    }
  }
});

// PRIVATE: typing indicator
socket.on("typing", ({ from_user, isTyping }) => {
  if (!currentPrivateUser || from_user !== currentPrivateUser) return;
  typingText.textContent = isTyping ? `${from_user} is typing...` : "";
});

// UI ACTIONS

// 5) Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("user");
  window.location.href = "/login.html";
});

// 6) Join room
joinBtn.addEventListener("click", () => {
  const room = roomSelect.value;

  // switch mode to room
  currentPrivateUser = null;
  currentPrivateSpan.textContent = "None";
  typingText.textContent = "";

  // leave old room if switching
  if (currentRoom && currentRoom !== room) {
    socket.emit("leaveRoom", { room: currentRoom, username: user.username });
  }

  currentRoom = room;
  currentRoomSpan.textContent = currentRoom;

  socket.emit("joinRoom", { room, username: user.username });
  addMessage(`You joined room: ${room}`);
});

// 7) Leave room
leaveBtn.addEventListener("click", () => {
  if (!currentRoom) {
    addMessage("You are not in any room.");
    return;
  }

  socket.emit("leaveRoom", { room: currentRoom, username: user.username });
  addMessage(`You left room: ${currentRoom}`);

  currentRoom = null;
  currentRoomSpan.textContent = "None";
  box.innerHTML = "";
  typingText.textContent = "";
});

// 8) Open private chat (load history)
openPrivateBtn.addEventListener("click", () => {
  const toUser = (toUserInput.value || "").trim();

  if (!toUser) {
    addMessage("Enter a username for private chat.");
    return;
  }
  if (toUser === user.username) {
    addMessage("You can't private chat with yourself.");
    return;
  }

  // leave current room when switching to private
  if (currentRoom) {
    socket.emit("leaveRoom", { room: currentRoom, username: user.username });
  }

  // switch mode to private
  currentRoom = null;
  currentRoomSpan.textContent = "None";

  currentPrivateUser = toUser;
  currentPrivateSpan.textContent = toUser;
  typingText.textContent = "";

  socket.emit("getPrivateHistory", {
    from_user: user.username,
    to_user: toUser
  });

  addMessage(`Private chat opened with: ${toUser}`);
});

// 9) Send message (room OR private)
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  // Private mode
  if (currentPrivateUser) {
    socket.emit("privateMessage", {
      from_user: user.username,
      to_user: currentPrivateUser,
      message: text
    });
    input.value = "";
    return;
  }

  // Room mode
  if (!currentRoom) {
    addMessage("Join a room OR open a private chat first.");
    return;
  }

  socket.emit("groupMessage", {
    from_user: user.username,
    room: currentRoom,
    message: text
  });

  input.value = "";
});

// 10) Typing event (private only)
input.addEventListener("input", () => {
  if (!currentPrivateUser) return;

  socket.emit("typing", {
    from_user: user.username,
    to_user: currentPrivateUser,
    isTyping: true
  });

  if (typingTimeout) clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {
    socket.emit("typing", {
      from_user: user.username,
      to_user: currentPrivateUser,
      isTyping: false
    });
  }, 800);
});