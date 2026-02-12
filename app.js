const token = localStorage.getItem("token");

const socket = io("http://localhost:5000", {
    auth: {
        token: token
    }
});

let currentProjectId = null;
let typingTimeout;

socket.on("connect", () => {
    console.log("Connected to server");
});

socket.on("receiveMessage", (data) => {
    const messagesDiv = document.getElementById("messages");

    const msg = document.createElement("div");
    msg.textContent = `User ${data.userId}: ${data.message}`;

    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on("onlineUsers", (users) => {
    const list = document.getElementById("onlineUsers");
    list.innerHTML = "";

    users.forEach(user => {
        const li = document.createElement("li");
        li.textContent = "User " + user;
        list.appendChild(li);
    });
});

socket.on("userTyping", (userId) => {
    document.getElementById("typingStatus").textContent =
        `User ${userId} is typing...`;
});

socket.on("userStoppedTyping", () => {
    document.getElementById("typingStatus").textContent = "";
});

function joinProject() {
    currentProjectId = document.getElementById("projectId").value;
    socket.emit("joinProject", currentProjectId);
}

function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value;

    socket.emit("sendMessage", {
        projectId: currentProjectId,
        message: message
    });

    input.value = "";
    socket.emit("stopTyping");
}

function handleTyping() {
    socket.emit("typing");

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
        socket.emit("stopTyping");
    }, 1000);
}
function toggleChat() {
    const popup = document.getElementById("chatPopup");
    popup.classList.toggle("active");
}
let completed = 0;

tasks.forEach(task => {
    if (task.status === "completed") completed++;
});

document.getElementById("totalTasks").innerText = tasks.length;
document.getElementById("completedTasks").innerText = completed;
document.getElementById("pendingTasks").innerText = tasks.length - completed;

const percent = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;

document.getElementById("progressPercent").innerText = percent + "%";
