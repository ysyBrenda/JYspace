// index.js
(() => {
  'use strict';

  const auth = window.auth;
  if (!auth) {
    console.error('Firebase Auth not initialized. Check firebase-auth-compat.js and assets/js/firebase.js.');
    return;
  }

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('loginError');

  function setError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg || '';
    errorEl.style.color = msg ? '#b91c1c' : '';
  }

  auth.onAuthStateChanged((user) => {
    if (user) window.location.href = 'app.html';
  });

  function login() {
    setError('');
    const email = (emailInput?.value || '').trim();
    const password = passwordInput?.value || '';
    if (!email || !password) {
      setError('请输入 email 和 password');
      return;
    }

    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        window.location.href = 'app.html';
      })
      .catch((err) => {
        console.error(err);
        setError('登录失败，请检查账号密码');
      });
  }

  loginBtn?.addEventListener('click', login);
  passwordInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') login();
  });
})();
