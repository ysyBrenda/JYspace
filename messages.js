// messages.js
(() => {
  'use strict';

  const db = window.db;
  if (!db || typeof db.collection !== 'function') {
    console.error('Firestore not initialized. Check firebase.js and Firebase SDK tags.');
    return;
  }

  let currentTheme = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', currentTheme === 'light' ? 'light' : '');

  function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', currentTheme === 'light' ? 'light' : '');
    localStorage.setItem('theme', currentTheme);
    updateThemeUI();
    render();
  }

  function updateThemeUI() {
    const isLight = currentTheme === 'light';
    document.getElementById('themeIcon').textContent = isLight ? '☀️' : '🌙';
    document.getElementById('subtitle').textContent = isLight ? 'SY & JY ' : 'SY & JY // ALL TRANSMISSIONS';
    document.getElementById('msgTitle').innerHTML = isLight ? '<span>💌</span> 留言' : '<span>◉</span> Transmission';
    document.getElementById('messageText').placeholder = isLight ? '想对TA说的悄悄话...' : '输入消息...';
  }

  updateThemeUI();

  let currentUser = localStorage.getItem('loverUser') || '';
  if (currentUser) document.getElementById('author').value = currentUser;

  function setCurrentUser() {
    const user = document.getElementById('author').value;
    if (!user) return;
    currentUser = user;
    localStorage.setItem('loverUser', user);
    render();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
  }

  function formatTime(t) {
    if (!t) return '';
    const dateObj = (typeof t.toDate === 'function') ? t.toDate() : new Date(t);
    if (Number.isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  let dataAll = [];

  function render() {
    const list = document.getElementById('messages');
    const stats = document.getElementById('msgStats');
    if (stats) stats.textContent = `${dataAll.length}条`;

    if (!dataAll.length) {
      const emptyIcon = currentTheme === 'light' ? '💭' : '📡';
      const emptyText = currentTheme === 'light' ? '还没有留言，来说点什么吧～' : '等待信号...';
      list.innerHTML = `
        <li class="empty-state">
          <div class="empty-state-icon">${emptyIcon}</div>
          <span>${emptyText}</span>
        </li>
      `;
      return;
    }

    list.innerHTML = '';
    dataAll.forEach((m) => {
      const li = document.createElement('li');
      li.className = 'message-item';

      const isOwner = m.author === currentUser;
      const deleteBtn = isOwner ? `<button class="btn-delete" onclick="deleteMessage('${m.id}')">删除</button>` : '';

      li.innerHTML = `
        <div class="message-header">
          <span class="message-author">${escapeHtml(m.author || '')}</span>
          <span class="message-time">${formatTime(m.time)}</span>
        </div>
        <div class="message-text">${escapeHtml(m.text)}</div>
        ${deleteBtn ? `<div class="message-actions">${deleteBtn}</div>` : ''}
      `;
      list.appendChild(li);
    });
  }

  function addMessage() {
    const author = document.getElementById('author').value;
    const text = document.getElementById('messageText').value.trim();
    if (!author) {
      alert(currentTheme === 'light' ? '请先选择身份哦～' : '请先选择身份');
      document.getElementById('author').focus();
      return;
    }
    if (!text) return;

    db.collection('messages').add({ author, text, time: new Date() })
      .then(() => { document.getElementById('messageText').value = ''; })
      .catch((err) => { console.error(err); alert('发送失败，请稍后再试'); });
  }

  function deleteMessage(id) {
    if (confirm('确定要删除吗？')) {
      db.collection('messages').doc(id).delete().catch((err) => console.error(err));
    }
  }

  db.collection('messages').orderBy('time', 'desc').onSnapshot((snap) => {
    const data = [];
    snap.forEach((doc) => data.push({ ...doc.data(), id: doc.id }));
    dataAll = data;
    render();
  });

  const messageInput = document.getElementById('messageText');
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addMessage();
      }
    });
  }

  window.toggleTheme = toggleTheme;
  window.setCurrentUser = setCurrentUser;
  window.addMessage = addMessage;
  window.deleteMessage = deleteMessage;
})();