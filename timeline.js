// timeline.js
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
    render();
  }

  function updateThemeUI() {
    const isLight = currentTheme === 'light';
    document.getElementById('themeIcon').textContent = isLight ? '☀️' : '🌙';
    document.getElementById('subtitle').textContent = isLight ? 'SY & JY ' : 'SY & JY // STAR MAP';
    document.getElementById('timelineTitle').innerHTML = isLight ? '<span>🕰</span> 大事记' : '<span>◎</span> Star Map';
    document.getElementById('eventText').placeholder = isLight ? '比如：第一次牵手 💕' : '记录事件...';
    const secondaryBtn = document.querySelector('.btn-secondary');
    if (secondaryBtn) secondaryBtn.textContent = isLight ? '添加' : '记录';
  }

  updateThemeUI();

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
  }

  let dataAll = [];

  function render() {
    const list = document.getElementById('timeline');
    const stats = document.getElementById('timelineStats');
    if (stats) stats.textContent = `${dataAll.length}条`;

    if (!dataAll.length) {
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
    dataAll.forEach((e) => {
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

  db.collection('timeline').orderBy('date', 'desc').onSnapshot((snap) => {
    const data = [];
    snap.forEach((doc) => data.push({ ...doc.data(), id: doc.id }));
    dataAll = data;
    render();
  });

  window.toggleTheme = toggleTheme;
  window.addEvent = addEvent;
  window.deleteEvent = deleteEvent;
})();