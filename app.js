// app.js

// 🔐 解锁校验
if (localStorage.getItem("loverUnlocked") !== "true") {
  window.location.href = "index.html";
}

// 💕 开始日
const startDate = new Date("2025-12-31");
const today = new Date();
const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
document.getElementById("days").innerText = diffDays;

// 💬 添加留言
function addMessage() {
  const author = document.getElementById("author").value;
  const text = document.getElementById("message").value.trim();
  if (!text) return;

  db.collection("messages").add({
    author,
    text,
    time: new Date()
  });

  document.getElementById("message").value = "";
}

// 🔄 实时加载留言
db.collection("messages")
  .orderBy("time")
  .onSnapshot(snapshot => {
    const ul = document.getElementById("messages");
    ul.innerHTML = "";

    snapshot.forEach(doc => {
      const m = doc.data();
      const li = document.createElement("li");
      li.innerText = `${m.author}: ${m.text}`;
      ul.appendChild(li);
    });
  });
