// app.js
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

    // Refresh owner-only actions (delete buttons) after auth resolves.
    renderList('messages');
    renderList('timeline');
  });

  // 主题管理
  let currentTheme = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', currentTheme === 'light' ? 'light' : '');
  updateThemeUI();

  function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', currentTheme === 'light' ? 'light' : '');
    localStorage.setItem('theme', currentTheme);
    updateThemeUI();
  }

  function updateThemeUI() {
    const isLight = currentTheme === 'light';
    document.getElementById('themeIcon').textContent = isLight ? '☀️' : '🌙';
    document.getElementById('subtitle').textContent = isLight ? 'SY & JY ' : 'SY & JY // COSMIC CONNECTION';

    // 更新文案
    document.getElementById('daysTitle').innerHTML = isLight ? '<span>📅</span> 我们的时间' : '<span>◈</span> Timeline';
    document.getElementById('loveLabel').textContent = isLight ? '相知' : 'Connect';
    document.getElementById('meetLabel').textContent = isLight ? '相识' : 'Meet';
    document.getElementById('countdownLabel').textContent = isLight ? '💖纪念日' : '◆ ANNIVERSARY ◆';
    document.getElementById('msgTitle').innerHTML = isLight ? '<span>💌</span> 留言' : '<span>◉</span> Transmission';
    document.getElementById('timelineTitle').innerHTML = isLight ? '<span>🕰</span> 大事记' : '<span>◎</span> Star Map';

    // 更新输入框 placeholder
    document.getElementById('author').options[0].text = '选择身份';
    document.getElementById('messageText').placeholder = isLight ? '想对TA说的悄悄话...' : '输入消息...';
    document.getElementById('eventText').placeholder = isLight ? '比如：第一次牵手 💕' : '记录事件...';

    // 更新按钮文字
    const secondaryBtn = document.querySelector('.btn-secondary');
    if (secondaryBtn) secondaryBtn.textContent = isLight ? '添加' : '记录';
  }

  let currentUser = localStorage.getItem('loverUser') || '';
  if (currentUser) {
    document.getElementById('author').value = currentUser;
  }

  // 避免 `new Date('YYYY-MM-DD')` 的 UTC 解析导致时区下天数偏差
  function localDate(y, m, d) {
    return new Date(y, m - 1, d);
  }

  const knowDate = localDate(2025, 12, 31);
  const loveDate = localDate(2026, 1, 25);
  const futureDate = localDate(2026, 3, 3); // 在这里修改你们的纪念日

  function daysBetween(a, b) {
    const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((bb - aa) / (1000 * 60 * 60 * 24));
  }

  function updateDays() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const knowDays = daysBetween(knowDate, today);
    const loveDays = daysBetween(loveDate, today);
    const cd = daysBetween(futureDate, today) + 1;

    animateNumber('knowDays', knowDays);
    animateNumber('loveDays', loveDays);
    animateNumber('countdown', cd);

    // countdownDays 在部分布局里可能被注释掉，避免空引用导致脚本中断
    const countdownDaysEl = document.getElementById('countdownDays');
    if (countdownDaysEl) countdownDaysEl.textContent = cd;
  }

  function animateNumber(id, target) {
    const el = document.getElementById(id);
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

  updateDays();
  setInterval(updateDays, 60000);

  function setCurrentUser() {
    const user = document.getElementById('author').value;
    if (!user) return;
    currentUser = user;
    localStorage.setItem('loverUser', user);
  }

  // 分页和折叠管理
  const paginationState = {
    // 首页只预览最新几条
    messages: { page: 1, pageSize: 5, total: 0, data: [] },
    timeline: { page: 1, pageSize: 6, total: 0, data: [] }
  };

  function changePage(section, direction) {
    const state = paginationState[section];
    const newPage = state.page + direction;
    if (newPage < 1 || newPage > Math.ceil(state.total / state.pageSize)) return;
    state.page = newPage;
    renderList(section);

    const containerId = section === 'messages' ? 'messages' : 'timelineContainer';
    const container = document.getElementById(containerId);
    if (container) container.scrollTop = 0;
  }

  function renderList(section) {
    const state = paginationState[section];
    const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageData = state.data.slice(start, end);

    const listId = section === 'messages' ? 'messages' : 'timeline';
    const list = document.getElementById(listId);
    if (!list) return;

    if (state.data.length === 0) {
      const emptyIcon = section === 'messages'
        ? (currentTheme === 'light' ? '💭' : '📡')
        : (currentTheme === 'light' ? '📝' : '🌌');
      const emptyText = section === 'messages'
        ? (currentTheme === 'light' ? '还没有留言，来说点什么吧～' : '等待信号...')
        : (currentTheme === 'light' ? '还没有记录，添加你们的第一个回忆吧' : '星图空白...');

      list.innerHTML = `
        <li class="empty-state">
          <div class="empty-state-icon">${emptyIcon}</div>
          <span>${emptyText}</span>
        </li>
      `;

      updatePagination(section);
      const statsId = section === 'messages' ? 'msgStats' : 'timelineStats';
      document.getElementById(statsId).textContent = '0条';
      return;
    }

    list.innerHTML = '';

    if (section === 'messages') {
      pageData.forEach((m) => {
        let time = '';
        if (m.time) {
          const dateObj = (typeof m.time.toDate === 'function') ? m.time.toDate() : new Date(m.time);
          if (!Number.isNaN(dateObj.getTime())) {
            time = dateObj.toLocaleString('zh-CN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        }

        const li = document.createElement('li');
        li.className = 'message-item';

        const isOwner = authUser && m.uid && m.uid === authUser.uid;
        const deleteBtn = isOwner ? `<button class="btn-delete" onclick="deleteMessage('${m.id}')">删除</button>` : '';

        li.innerHTML = `
          <div class="message-header">
            <span class="message-author">${m.author}</span>
            <span class="message-time">${time}</span>
          </div>
          <div class="message-text">${escapeHtml(m.text)}</div>
          ${deleteBtn ? `<div class="message-actions">${deleteBtn}</div>` : ''}
        `;
        list.appendChild(li);
      });
    } else {
      pageData.forEach((e) => {
        const li = document.createElement('li');
        li.className = 'timeline-item';
        const canDelete = authUser && e.uid && e.uid === authUser.uid;
        li.innerHTML = `
          <div class="timeline-content">
            <div class="timeline-text">${escapeHtml(e.text)}</div>
            <div class="timeline-date">${e.date}</div>
            ${canDelete ? `<button class="btn-delete timeline-delete" onclick="deleteEvent('${e.id}')">删除</button>` : ''}
          </div>
        `;
        list.appendChild(li);
      });
    }

    updatePagination(section);
    const statsId = section === 'messages' ? 'msgStats' : 'timelineStats';
    document.getElementById(statsId).textContent = `${state.total}条`;
  }

  function updatePagination(section) {
    const state = paginationState[section];
    const totalPages = Math.ceil(state.total / state.pageSize);

    const paginationId = section === 'messages' ? 'msgPagination' : 'timelinePagination';
    const prevId = section === 'messages' ? 'msgPrev' : 'timelinePrev';
    const nextId = section === 'messages' ? 'msgNext' : 'timelineNext';
    const pageInfoId = section === 'messages' ? 'msgPageInfo' : 'timelinePageInfo';

    const pagination = document.getElementById(paginationId);
    const prevBtn = document.getElementById(prevId);
    const nextBtn = document.getElementById(nextId);
    const pageInfo = document.getElementById(pageInfoId);
    if (!pagination || !prevBtn || !nextBtn || !pageInfo) return;

    // 首页留言区：不显示分页，交给 MORE 全屏页看全部
    if (section === 'messages' && document.body?.dataset?.page === 'home') {
      pagination.style.display = 'none';
      return;
    }

    if (totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }

    pagination.style.display = 'flex';
    pageInfo.textContent = `${state.page} / ${totalPages}`;
    prevBtn.disabled = state.page === 1;
    nextBtn.disabled = state.page === totalPages;
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

    db.collection('messages').add({
      uid: authUser.uid,
      author,
      text,
      time: new Date()
    }).then(() => {
      document.getElementById('messageText').value = '';
      paginationState.messages.page = 1;
    }).catch((err) => {
      console.error(err);
      alert('发送失败，请稍后再试');
    });
  }

  function startRealtime() {
    db.collection('messages')
      .orderBy('time', 'desc')
      .onSnapshot((snap) => {
        const data = [];
        snap.forEach((doc) => {
          data.push({ ...doc.data(), id: doc.id });
        });

        paginationState.messages.data = data;
        paginationState.messages.total = data.length;
        renderList('messages');
      }, (err) => {
        console.error(err);
      });

    db.collection('timeline')
      .orderBy('date', 'desc')
      .onSnapshot((snap) => {
        const data = [];
        snap.forEach((doc) => {
          data.push({ ...doc.data(), id: doc.id });
        });

        paginationState.timeline.data = data;
        paginationState.timeline.total = data.length;
        renderList('timeline');
      }, (err) => {
        console.error(err);
      });
  }

  function deleteMessage(id) {
    if (!authUser) return;
    if (confirm('确定要删除吗？')) {
      db.collection('messages').doc(id).delete().catch((err) => console.error(err));
    }
  }

  function addEvent() {
    const text = document.getElementById('eventText').value.trim();
    const date = document.getElementById('eventDate').value;
    if (!text || !date) return;

    if (!authUser) {
      window.location.href = 'index.html';
      return;
    }

    db.collection('timeline').add({
      uid: authUser.uid,
      text,
      date,
      createdAt: new Date()
    }).then(() => {
      document.getElementById('eventText').value = '';
      document.getElementById('eventDate').value = '';
    }).catch((err) => {
      console.error(err);
      alert('添加失败，请稍后再试');
    });
  }

  function deleteEvent(id) {
    if (!authUser) return;
    if (confirm('确定要删除吗？')) {
      db.collection('timeline').doc(id).delete().catch((err) => console.error(err));
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
  }

  const messageInput = document.getElementById('messageText');
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addMessage();
      }
    });
  }

  // Expose functions for inline onclick handlers in app.html
  window.toggleTheme = toggleTheme;
  window.setCurrentUser = setCurrentUser;
  window.changePage = changePage;
  window.addMessage = addMessage;
  window.deleteMessage = deleteMessage;
  window.addEvent = addEvent;
  window.deleteEvent = deleteEvent;
})();
