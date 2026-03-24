// app.js (home)
(() => {
  'use strict';

  // Auth gate: require login + allowlist
  const auth = window.auth;
  const allowedEmails = (window.ALLOWED_EMAILS || []).map((e) => String(e || '').trim().toLowerCase());
  function normEmail(v) { return String(v || '').trim().toLowerCase(); }
  function redirectToLogin() { window.location.href = 'index.html'; }

  // Hide until auth is confirmed to avoid flashing protected content
  try { document.documentElement.style.visibility = 'hidden'; } catch (e) { /* ignore */ }

  if (!auth || typeof auth.onAuthStateChanged !== 'function') {
    redirectToLogin();
    return;
  }

  auth.onAuthStateChanged((user) => {
    if (!user) {
      redirectToLogin();
      return;
    }
    const email = normEmail(user.email);
    if (allowedEmails.length && allowedEmails.indexOf(email) === -1) {
      alert('??????');
      auth.signOut().finally(redirectToLogin);
      return;
    }
    try { document.documentElement.style.visibility = ''; } catch (e) { /* ignore */ }
  });


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
    renderMessagesPreview(latestMessages);
    renderTimelinePreview(latestTimeline);
  }

  function updateThemeUI() {
    const isLight = currentTheme === 'light';
    const $ = (id) => document.getElementById(id);

    $('themeIcon').textContent = isLight ? '☀️' : '🌙';
    $('subtitle').textContent = isLight ? 'SY & JY ' : 'SY & JY // COSMIC CONNECTION';

    $('daysTitle').innerHTML = isLight ? '<span>📅</span> 我们的时间' : '<span>◈</span> Timeline';
    $('loveLabel').textContent = isLight ? '相知' : 'Connect';
    $('meetLabel').textContent = isLight ? '相识' : 'Meet';
    $('countdownLabel').textContent = isLight ? '💖纪念日' : '◆ ANNIVERSARY ◆';
    $('msgTitle').innerHTML = isLight ? '<span>💌</span> 留言' : '<span>◉</span> Transmission';
    $('timelineTitle').innerHTML = isLight ? '<span>🕰</span> 大事记' : '<span>◎</span> Star Map';

    $('messageText').placeholder = isLight ? '想对TA说的悄悄话...' : '输入消息...';
    $('eventText').placeholder = isLight ? '比如：第一次牵手 💕' : '记录事件...';

    const secondaryBtn = document.querySelector('.btn-secondary');
    if (secondaryBtn) secondaryBtn.textContent = isLight ? '添加' : '记录';

    const msgStats = document.getElementById('msgStats');
    if (msgStats) msgStats.textContent = '';
    const tlStats = document.getElementById('timelineStats');
    if (tlStats) tlStats.textContent = '';
  }

  updateThemeUI();

  let currentUser = localStorage.getItem('loverUser') || '';
  if (currentUser) {
    const authorSel = document.getElementById('author');
    if (authorSel) authorSel.value = currentUser;
  }

  function setCurrentUser() {
    const user = document.getElementById('author').value;
    if (!user) return;
    currentUser = user;
    localStorage.setItem('loverUser', user);
    renderMessagesPreview(latestMessages);
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

  function localDate(y, m, d) { return new Date(y, m - 1, d); }
  const knowDate = localDate(2025, 12, 31);
  const loveDate = localDate(2026, 1, 25);
  const futureDate = localDate(2026, 3, 3);

  function daysBetween(a, b) {
    const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((bb - aa) / (1000 * 60 * 60 * 24));
  }

  function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseInt(el.textContent, 10) || 0;
    const duration = 800;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (target - start) * easeOut);
      el.textContent = String(current);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function updateDays() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    animateNumber('knowDays', daysBetween(knowDate, today));
    animateNumber('loveDays', daysBetween(loveDate, today));
    animateNumber('countdown', daysBetween(futureDate, today) + 1);
  }

  updateDays();
  setInterval(updateDays, 60000);

  let latestMessages = [];
  let latestTimeline = [];

  function renderMessagesPreview(data) {
    const stats = document.getElementById('msgStats');
    if (stats) stats.textContent = '\u6700\u65b0' + (data ? data.length : 0) + '\u6761';
    const list = document.getElementById('messages');
    if (!list) return;

    if (!data || data.length === 0) {
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
    data.forEach((m) => {
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

  function renderTimelinePreview(data) {
    const stats = document.getElementById('timelineStats');
    if (stats) stats.textContent = '\u5171' + (data ? data.length : 0) + '\u6761';
    const list = document.getElementById('timeline');
    if (!list) return;

    if (!data || data.length === 0) {
      const emptyIcon = currentTheme === 'light' ? '📝' : '🌌';
      const emptyText = currentTheme === 'light' ? '还没有记录，添加你们的第一个回忆吧' : '星图空白...';
      list.innerHTML = `
        <li class="empty-state">
          <div class="empty-state-icon">${emptyIcon}</div>
          <span>${emptyText}</span>
        </li>
      `;
      return;
    }

    list.innerHTML = '';
    data.forEach((e) => {
      const li = document.createElement('li');
      li.className = 'timeline-item';
      li.innerHTML = `
        <div class="timeline-content">
          <div class="timeline-text">${escapeHtml(e.text)}</div>
          <div class="timeline-date">${escapeHtml(e.date)}</div>
          <button class="btn-delete timeline-delete" onclick="deleteEvent('${e.id}')">删除</button>
        </div>
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

  function addEvent() {
    const text = document.getElementById('eventText').value.trim();
    const date = document.getElementById('eventDate').value;
    if (!text || !date) return;

    db.collection('timeline').add({ text, date, createdAt: new Date() })
      .then(() => {
        document.getElementById('eventText').value = '';
        document.getElementById('eventDate').value = '';
      })
      .catch((err) => { console.error(err); alert('添加失败，请稍后再试'); });
  }

  function deleteEvent(id) {
    if (confirm('确定要删除吗？')) {
      db.collection('timeline').doc(id).delete().catch((err) => console.error(err));
    }
  }

  db.collection('messages').orderBy('time', 'desc').limit(5).onSnapshot((snap) => {
    const data = [];
    snap.forEach((doc) => data.push({ ...doc.data(), id: doc.id }));
    latestMessages = data;
    renderMessagesPreview(latestMessages);
  });

  db.collection('timeline').orderBy('date', 'desc').onSnapshot((snap) => {
    const data = [];
    snap.forEach((doc) => data.push({ ...doc.data(), id: doc.id }));
    latestTimeline = data;
    renderTimelinePreview(latestTimeline);
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
  window.addEvent = addEvent;
  window.deleteEvent = deleteEvent;
})();