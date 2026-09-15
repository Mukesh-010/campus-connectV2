# Campus Connect — Minimal Prototype

A compact prototype based on the submitted abstract for **Campus Connect: A Real-Time Communication Platform**.

The source abstract describes a centralized web platform for students/faculty with registration/login, one-to-one messaging, department/club group chats, instant notifications, a client-server architecture, Socket.IO WebSockets, MongoDB storage, JWT authentication and password hashing.

## Included in this prototype

- User registration and login
- JWT authentication
- Password hashing with bcrypt
- One-to-one real-time messaging
- Department/club group creation
- Group messaging with Socket.IO
- Instant incoming-message notifications
- MongoDB persistence
- Responsive, minimal professional UI

## Intentionally kept minimal

This is a demonstration prototype, not a production-ready college communication system. The abstract mentions file sharing, announcements, HTTPS, advanced security and future voice/video/mobile features; those are not fully implemented here.

## Requirements

- Node.js 18+
- MongoDB running locally OR a MongoDB connection string

## Run

1. Open a terminal in `server/`.
2. Install packages:

   `npm install`

3. Copy `.env.example` to `.env`.
4. Set `MONGO_URI` if required.
5. Start:

   `npm start`

6. Open:

   `http://localhost:5000`

## Quick demo

1. Register two users in two browser windows (or one normal window + incognito).
2. Use different names/emails.
3. Select one user from the People list.
4. Send messages. They appear in real time in the other window.
5. Create a group and send group messages.

## Architecture

Browser UI
   |
   | HTTP REST + JWT
   | WebSocket / Socket.IO
   v
Node.js + Express + Socket.IO
   |
   v
MongoDB

## Main files

- `server/server.js` — API, authentication, MongoDB models and Socket.IO
- `client/index.html` — UI
- `client/style.css` — UI styling
- `client/app.js` — frontend logic
- `server/.env.example` — configuration template

## Project mapping

| Abstract requirement | Prototype implementation |
|---|---|
| HTML/CSS/JavaScript | `client/` |
| Node.js / Express.js | `server/server.js` |
| Socket.IO / WebSocket | Socket.IO server + browser client |
| MongoDB | User, Message and Group collections |
| JWT authentication | Login/register token flow |
| Password hashing | bcrypt |
| One-to-one messaging | People list + private messages |
| Department/club groups | Group creation + group messaging |
| Instant notifications | Socket.IO events/toasts |
| Client-server architecture | REST API + WebSocket connection |

## Important

For a college/hackathon demonstration, this prototype is deliberately small so it can be understood, run and presented easily. Production deployment should add HTTPS, stricter CORS, validation, rate limiting, file-storage controls, stronger authorization, audit logging and more comprehensive security.

## Public deployment

For public access, use MongoDB Atlas for the database and deploy the Node.js server to a public Node.js host. `render.yaml` and `DEPLOYMENT.md` are included to simplify this process. The frontend and Socket.IO endpoint use the same server origin.
