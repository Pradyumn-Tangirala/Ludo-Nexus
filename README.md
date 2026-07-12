# Ludo Nexus 🎲

A privacy-first, real-time web-based Ludo game built with React (Vite) and Node.js + Socket.IO.

## Features
- **Authoritative Game Engine**: Full Ludo rules enforced strictly on the server.
- **Privacy First**: No database, no tracking, and rooms automatically delete after 10 minutes of inactivity.
- **Resilient Sessions**: Built-in grace periods for dropped connections. You can refresh the page and instantly reconnect.
- **Modern UI**: Smooth token animations via CSS Grid, glowing highlights for legal moves, and live emoji reactions.

## Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

## How to Run

You will need to start both the backend server and the frontend development server simultaneously.

### 1. Start the Backend Server
Open a terminal and run the following commands:
```bash
cd backend
npm install
node server.js
```
The backend will start running on `http://localhost:3001`.

### 2. Start the Frontend
Open a **new** terminal window and run:
```bash
cd frontend
npm install
npm run dev
```
The frontend will start running on `http://localhost:5173`. 

### 3. Play!
Open your browser and navigate to [http://localhost:5173](http://localhost:5173). Create a room, copy the invite link, and share it with friends to start playing!
