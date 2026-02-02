// 解锁检查
if (localStorage.getItem("loverUnlocked") !== "true") {
  window.location.href = "index.html";
}

// 恋爱开始日（改成你们的）
const startDate = new Date("2025-12-31");
const today = new Date();
const diff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
document.getElementById("days").innerText = diff;

// 留言功能
function addMessage() {
  const author = document.getElementById("author").value;
  const text = document.getElementById("message").value;
  if (!text) return;

  db.collection("messages").add({
    author,
    text,
    time: new Date()
  });

  document.getElementById("message").value = "";
}

// 实时加载留言
db.collection("messages")
  .orderBy("time")
  .onSnapshot(snapshot => {
    const ul = document.getElementById("messages");
    ul.innerHTML = "";
    snapshot.forEach(doc => {
      const li = document.createElement("li");
      const d = doc.data();
      li.innerText = `${d.author}: ${d.text}`;
      ul.appendChild(li);
    });
  });
