# Campus Connect — Public Deployment

## Architecture

Browser -> Public HTTPS URL -> Node.js + Express + Socket.IO -> MongoDB Atlas

## 1. MongoDB Atlas

Create a MongoDB Atlas cluster and database user. Copy the connection string and use it as `MONGO_URI`.

Do not put real credentials in the source code or commit them to GitHub.

## 2. Deploy the server

This project contains `render.yaml` for Render-style deployment.

Set these environment variables in the hosting dashboard:

- `MONGO_URI` = your MongoDB Atlas connection string
- `JWT_SECRET` = a long random secret

The app serves the frontend from the same Node.js server, so no separate frontend deployment is required.

## 3. Public URL

After deployment, open the HTTPS URL provided by the hosting service from your PC, mobile phone, or another laptop.

Socket.IO uses the same origin automatically.

## 4. Demo

1. Open the public URL.
2. Register User A.
3. Open the same URL in another browser/device.
4. Register User B.
5. Select User B under People.
6. Send a text message.
7. Confirm that it arrives in real time.
8. Create a group and test group messaging.

## Local development

From `server/`:

    npm install
    npm start

Then open `http://localhost:5000`.

This remains a minimal prototype. Production use would require stronger validation, rate limiting, authorization, secure token handling, upload controls, audit logging and other security hardening.
