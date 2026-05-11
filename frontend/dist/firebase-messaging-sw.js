importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
firebase.initializeApp({
  apiKey: "AIzaSyDQx1jQik7Loh9uRA2PBRcGZEehJB_rpGY",
  authDomain: "smart-study-desk-43251.firebaseapp.com",
  projectId: "smart-study-desk-43251",
  messagingSenderId: "589765603622",
  appId: "1:589765603622:web:f1c5dfbcc46847fbe091e7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'SmartDesk Alert', {
    body: body || 'Check your study metrics.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'smartdesk-notification',
    renotify: true,
  });
});