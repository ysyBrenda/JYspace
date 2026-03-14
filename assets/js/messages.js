// messages.js
(() => {
  'use strict';

  const auth = window.auth;
  if (!auth) {
    console.error('Firebase Auth not initialized. Check firebase-auth-compat.js and assets/js/firebase.js.');
    return;
  }

  const db = window.db;
  if (!db || typeof db.collection !== 'function') {
    console.error('Firestore not initialized. Check assets/js/firebase.js and Firebase SDK <script> tags.');
    return;
  }

  let authUser = null;
  let realtimeStarted = false;

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    authUser = user;
    if (!realtimeStarted) {
      realtimeStarted = true;
      startRealtime();
    }
    render();
  });

  let currentTheme = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', currentTheme === 'light' ? 'light' : '');
  updateThemeUI();

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

  let currentUser = localStorage.getItem('loverUser') || '';
  if (currentUser) document.getElementById('author').value = currentUser;

  function setCurrentUser() {
    const user = document.getElementById('author').value;
    if (!user) return;
    currentUser = user;
    localStorage.setItem('loverUser', user);
    render();
  }

  const state = {
    page: 1,
    pageSize: 20,
    data: []
  };

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

  function clampPage() {
    const totalPages = Math.max(1, Math.ceil(state.data.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
  }

  function updatePagination() {
    const totalPages = Math.ceil(state.data.length / state.pageSize);
    const pagination = document.getElementById('msgPagination');
    const prevBtn = document.getElementById('msgPrev');
    const nextBtn = document.getElementById('msgNext');
    const pageInfo = document.getElementById('msgPageInfo');

    if (totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }
    pagination.style.display = 'flex';
    pageInfo.textContent = `${state.page} / ${totalPages}`;
    prevBtn.disabled = state.page === 1;
    nextBtn.disabled = state.page === totalPages;
  }

  function render() {
    clampPage();

    const list = document.getElementById('messages');
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageData = state.data.slice(start, end);

    document.getElementById('msgStats').textContent = `${state.data.length}条`;

    if (state.data.length === 0) {
      const emptyIcon = currentTheme === 'light' ? '💭' : '📡';
      const emptyText = currentTheme === 'light' ? '还没有留言，来说点什么吧～' : '等待信号...';
      list.innerHTML = `
        <li class="empty-state">
          <div class="empty-state-icon">${emptyIcon}</div>
          <span>${emptyText}</span>
        </li>
      `;
      updatePagination();
      return;
    }

    list.innerHTML = '';
    pageData.forEach((m) => {
      const li = document.createElement('li');
      li.className = 'message-item';

      const isOwner = authUser && m.uid && m.uid === authUser.uid;
      const deleteBtn = isOwner ? `<button class="btn-delete" onclick="deleteMessage('${m.id}')">删除</button>` : '';

      li.innerHTML = `
        <div class="message-header">
          <span class="message-author">${m.author || ''}</span>
          <span class="message-time">${formatTime(m.time)}</span>
        </div>
        <div class="message-text">${escapeHtml(m.text)}</div>
        ${deleteBtn ? `<div class="message-actions">${deleteBtn}</div>` : ''}
      `;
      list.appendChild(li);
    });

    updatePagination();
  }

  function addMessage() {
    const author = document.getElementById('author').value;
    const text = document.getElementById('messageText').value.trim();

    if (!authUser) {
      window.location.href = 'index.html';
      return;
    }
    if (!author) {
      alert(currentTheme === 'light' ? '请先选择身份哦～' : '请先选择身份');
      document.getElementById('author').focus();
      return;
    }
    if (!text) return;

    db.collection('messages').add({ uid: authUser.uid, author, text, time: new Date() })
      .then(() => {
        document.getElementById('messageText').value = '';
        state.page = 1;
      })
      .catch((err) => {
        console.error(err);
        alert('发送失败，请稍后再试');
      });
  }

  function deleteMessage(id) {
    if (!authUser) return;
    if (confirm('确定要删除吗？')) {
      db.collection('messages').doc(id).delete().catch((err) => console.error(err));
    }
  }

  function changePage(direction) {
    state.page += direction;
    clampPage();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startRealtime() {
    db.collection('messages')
      .orderBy('time', 'desc')
      .onSnapshot((snap) => {
        const data = [];
        snap.forEach((doc) => data.push({ ...doc.data(), id: doc.id }));
        state.data = data;
        render();
      }, (err) => console.error(err));
  }

  const messageInput = document.getElementById('messageText');
  messageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addMessage();
    }
  });

  // Expose handlers used by HTML onclick/onchange
  window.toggleTheme = toggleTheme;
  window.setCurrentUser = setCurrentUser;
  window.addMessage = addMessage;
  window.deleteMessage = deleteMessage;
  window.changePage = changePage;
})();
