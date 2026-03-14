// firebase.js
(() => {
  'use strict';

  if (!window.firebase) {
    console.error('Firebase SDK not loaded. Check the <script src=...firebase-*-compat.js> tags.');
    return;
  }

  const firebaseConfig = {
    apiKey: 'AIzaSyCSRTNZpvbyKNSNqyYH90cIL8dEFaYiX00',
    authDomain: 'love-space-4c3a9.firebaseapp.com',
    projectId: 'love-space-4c3a9',
    storageBucket: 'love-space-4c3a9.appspot.com',
    messagingSenderId: '780826442742',
    appId: '1:780826442742:web:f8e051d51a4d3729be65d7'
  };

  // Avoid "Firebase App named '[DEFAULT]' already exists" if the script is included twice.
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }

  if (typeof firebase.auth === 'function') {
    window.auth = firebase.auth();
  }
  window.db = firebase.firestore();
})();
