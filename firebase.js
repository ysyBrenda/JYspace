// firebase.js
(() => {
  'use strict';

  const firebaseConfig = {
    apiKey: "AIzaSyCSRTNZpvbyKNSNqyYH90cIL8dEFaYiX00",
    authDomain: "love-space-4c3a9.firebaseapp.com",
    projectId: "love-space-4c3a9",
    storageBucket: "love-space-4c3a9.appspot.com",
    messagingSenderId: "780826442742",
    appId: "1:780826442742:web:f8e051d51a4d3729be65d7"
  };

  if (!window.firebase) {
    console.error('Firebase SDK not loaded');
    return;
  }

  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }

  window.db = firebase.firestore();
})();