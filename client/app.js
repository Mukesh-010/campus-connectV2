const state = {
  token: localStorage.getItem("cc_token"),
  user: JSON.parse(localStorage.getItem("cc_user") || "null"),
  socket: null,
  users: [],
  groups: [],
  activeType: null,
  activeId: null
};

const $ = (id) => document.getElementById(id);

function toast(text) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  $("toast").appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

async function api(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function setAuthMode(register) {
  $("loginTab").classList.toggle("active", !register);
  $("registerTab").classList.toggle("active", register);
  document.querySelectorAll(".register-only").forEach(el => el.classList.toggle("hidden", !register));
  $("authButton").textContent = register ? "Create account" : "Login";
  $("authMessage").textContent = "";
  $("authForm").dataset.mode = register ? "register" : "login";
}

$("loginTab").onclick = () => setAuthMode(false);
$("registerTab").onclick = () => setAuthMode(true);

$("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const register = $("authForm").dataset.mode === "register";
  const body = {
    email: $("email").value,
    password: $("password").value
  };
  if (register) {
    body.name = $("name").value;
    body.department = $("department").value || "General";
    body.role = $("role").value;
  }
  try {
    const data = await api(register ? "/api/auth/register" : "/api/auth/login", {
      method: "POST", body: JSON.stringify(body)
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("cc_token", state.token);
    localStorage.setItem("cc_user", JSON.stringify(state.user));
    showApp();
  } catch (err) {
    $("authMessage").textContent = err.message;
  }
});

$("logoutButton").onclick = () => {
  localStorage.removeItem("cc_token");
  localStorage.removeItem("cc_user");
  location.reload();
};

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();
}

function listItem(title, meta, id, type) {
  const button = document.createElement("button");
  button.className = "list-item";
  button.dataset.id = id;
  button.dataset.type = type;
  button.innerHTML = `
    <div class="avatar">${type === "group" ? "#" : initials(title)}</div>
    <div>
      <div class="item-name">${escapeHtml(title)}</div>
      <div class="item-meta">${escapeHtml(meta)}</div>
    </div>`;
  button.onclick = () => openChat(type, id);
  return button;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

async function loadLists() {
  state.users = await api("/api/users");
  state.groups = await api("/api/groups");

  $("usersList").innerHTML = "";
  state.users.forEach(u => $("usersList").appendChild(
    listItem(u.name, `${u.department} · ${u.role}`, u._id, "user")
  ));

  $("groupsList").innerHTML = "";
  state.groups.forEach(g => $("groupsList").appendChild(
    listItem(g.name, `${g.type} · ${g.members.length} member${g.members.length === 1 ? "" : "s"}`, g._id, "group")
  ));
}

async function openChat(type, id) {
  state.activeType = type;
  state.activeId = id;

  document.querySelectorAll(".list-item").forEach(x =>
    x.classList.toggle("active", x.dataset.id === id && x.dataset.type === type)
  );

  let title, subtitle, messages;
  if (type === "user") {
    const user = state.users.find(u => u._id === id);
    title = user?.name || "User";
    subtitle = `${user?.department || "General"} · ${user?.role || "student"}`;
    messages = await api(`/api/messages/${id}`);
  } else {
    const group = state.groups.find(g => g._id === id);
    title = group?.name || "Group";
    subtitle = `${group?.type || "group"} · ${group?.members.length || 0} members`;
    messages = await api(`/api/groups/${id}/messages`);
  }

  $("chatTitle").textContent = title;
  $("chatSubtitle").textContent = subtitle;
  $("messageForm").classList.remove("hidden");
  renderMessages(messages);
}

function renderMessages(messages) {
  const box = $("messages");
  box.innerHTML = "";
  if (!messages.length) {
    box.innerHTML = `<div class="empty-state"><div class="empty-icon">+</div><h3>No messages yet</h3><p>Send the first message in this conversation.</p></div>`;
    return;
  }
  messages.forEach(addMessage);
  box.scrollTop = box.scrollHeight;
}

function addMessage(msg) {
  if (state.activeType === "user") {
    const belongs = (
      (String(msg.sender?._id) === String(state.user.id) && String(msg.receiver) === String(state.activeId)) ||
      (String(msg.sender?._id) === String(state.activeId) && String(msg.receiver) === String(state.user.id))
    );
    if (!belongs) return;
  } else if (String(msg.group) !== String(state.activeId)) {
    return;
  }

  const mine = String(msg.sender?._id || msg.sender) === String(state.user.id);
  const row = document.createElement("div");
  row.className = `message-row ${mine ? "mine" : ""}`;
  row.innerHTML = `<div class="message">
    ${state.activeType === "group" && !mine ? `<div class="message-author">${escapeHtml(msg.sender?.name || "Member")}</div>` : ""}
    <div class="message-text">${escapeHtml(msg.text)}</div>
    <div class="message-time">${new Date(msg.createdAt).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</div>
  </div>`;
  $("messages").appendChild(row);
  $("messages").scrollTop = $("messages").scrollHeight;
}

$("messageForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = $("messageInput").value.trim();
  if (!text || !state.activeId) return;

  try {
    if (state.activeType === "user") {
      await api("/api/messages", {
        method: "POST",
        body: JSON.stringify({ receiverId: state.activeId, text })
      });
    } else {
      await api(`/api/groups/${state.activeId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text })
      });
    }
    $("messageInput").value = "";
  } catch (err) {
    toast(err.message);
  }
});

$("newGroupButton").onclick = () => $("groupModal").classList.remove("hidden");
$("cancelGroup").onclick = () => $("groupModal").classList.add("hidden");

$("groupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/api/groups", {
      method: "POST",
      body: JSON.stringify({
        name: $("groupName").value,
        type: $("groupType").value
      })
    });
    $("groupForm").reset();
    $("groupModal").classList.add("hidden");
    await loadLists();
    toast("Group created");
  } catch (err) {
    toast(err.message);
  }
});

function connectSocket() {
  if (state.socket) state.socket.disconnect();
  state.socket = io({ auth: { token: state.token } });

  state.socket.on("connect_error", (err) => toast(err.message));
  state.socket.on("private-message", (msg) => {
    if (state.activeType === "user" && String(state.activeId) === String(msg.sender?._id)) {
      addMessage(msg);
    } else {
      toast(`New message from ${msg.sender?.name || "someone"}`);
    }
  });
  state.socket.on("message-sent", (msg) => {
    if (state.activeType === "user" && String(state.activeId) === String(msg.receiver)) addMessage(msg);
  });
  state.socket.on("group-message", (msg) => {
    if (state.activeType === "group" && String(state.activeId) === String(msg.group)) {
      addMessage(msg);
    }
  });
}

async function showApp() {
  $("authView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("currentUser").textContent = `${state.user.name} · ${state.user.department || "General"}`;
  try {
    await loadLists();
    connectSocket();
  } catch (err) {
    toast(err.message);
  }
}

if (state.token && state.user) {
  showApp();
} else {
  setAuthMode(false);
}
