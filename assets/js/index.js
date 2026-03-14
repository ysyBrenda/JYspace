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
        const code = err?.code || '';
        let msg = '登录失败';
        if (code === 'auth/user-not-found') msg = '账号不存在（请确认在 Firebase Authentication -> Users 里能看到这个邮箱）';
        else if (code === 'auth/wrong-password') msg = '密码不对';
        else if (code === 'auth/invalid-email') msg = '邮箱格式不正确';
        else if (code === 'auth/too-many-requests') msg = '尝试次数过多，请稍后再试';
        else if (code === 'auth/network-request-failed') msg = '网络请求失败（检查网络/代理）';
        else if (code === 'auth/unauthorized-domain') msg = `域名未授权：请在 Firebase Authentication -> Settings -> Authorized domains 添加 ${window.location.hostname}`;
        else if (code) msg = `登录失败（${code}）`;
        setError(msg);
      });
  }

  loginBtn?.addEventListener('click', login);
  passwordInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') login();
  });
})();
