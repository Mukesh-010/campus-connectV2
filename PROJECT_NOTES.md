# Presentation Notes

## 30-second explanation

Campus Connect is a centralized real-time communication platform for educational institutions. Instead of using separate applications for messaging and group discussions, the prototype provides authentication, private messaging and department/club group chats in one web application.

## Computer Networks concepts demonstrated

1. Client-server architecture — browser communicates with the Node.js/Express server.
2. HTTP — REST endpoints handle registration, login and data retrieval.
3. WebSocket — Socket.IO maintains a real-time channel for messages.
4. TCP-based real-time communication — Socket.IO uses the underlying network transport to deliver events.
5. Secure access — JWT is used for authenticated API and Socket.IO access.
6. Data persistence — MongoDB stores users, messages and groups.

## Demo sequence

1. Register User A.
2. Register User B in a second browser/incognito window.
3. Log in as both users.
4. Send a private message.
5. Show that the message appears immediately in the other browser.
6. Create a department or club group.
7. Send a group message.
8. Explain the REST + WebSocket + MongoDB architecture.

## Scope statement

Do not present this prototype as a production deployment. It is a minimal functional proof-of-concept covering the core real-time communication flow from the submitted abstract.
