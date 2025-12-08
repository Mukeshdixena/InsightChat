# InsightChat

InsightChat is a real-time chat application built with the MERN stack (MongoDB, Express, React/Angular, Node.js) and powered by Google Gemini AI. It features real-time messaging, AI-assisted writing, and user authentication.

## Project Structure

The project is divided into two main parts:

-   `chat-server`: The backend Node.js/Express server.
-   `chat-client`: The frontend Angular application.

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/) (v14 or higher recommended)
-   [Angular CLI](https://angular.io/cli) (`npm install -g @angular/cli`)
-   [MongoDB](https://www.mongodb.com/) (Local installation or Atlas URI)

## Installation

### 1. Server Setup

Navigate to the `chat-server` directory and install dependencies:

```bash
cd chat-server
npm install
```

### 2. Client Setup

Navigate to the `chat-client` directory and install dependencies:

```bash
cd chat-client
npm install
```

## Configuration

You need to configure the environment variables for the server.

1.  Create a `.env` file in the `chat-server` directory.
2.  Add the following variables:

```env
MONGO_URL=your_mongodb_connection_string
PORT=3000
GEMINI_API_KEY=your_google_gemini_api_key
JWT_SECRET=your_jwt_secret_key
```

| Variable | Description |
| :--- | :--- |
| `MONGO_URL` | Connection string for your MongoDB database. |
| `PORT` | Port for the server to run on (default: `3000`). |
| `GEMINI_API_KEY` | API key for Google Gemini (required for AI features). |
| `JWT_SECRET` | Secret key used for signing JSON Web Tokens. |

## Running the Application

### Start the Server

In the `chat-server` directory, run:

```bash
# Production start
npm start

# Or directly with node
node index.js
```

The server will start at `http://localhost:3000` (or your configured port).
Socket.io will also listen on this port.

### Start the Client

In the `chat-client` directory, run:

```bash
ng serve
```

Navigate to `http://localhost:4200/` in your browser. The application will automatically reload if you change any of the source files.

## Features

-   **Real-time Messaging**: ID-based socket rooms for private chatting.
-   **AI Integration**:
    -   Chat with "AI Bot" for queries.
    -   AI-powered message rewriting (Formal, Casual, Grammar fixes).
-   **Authentication**: Secure signup and login with JWT.
-   **Message Status**: Real-time delivered and read receipts.

## Troubleshooting

-   **CORS Issues**: If you experience connection issues between client and server, ensure `cors` is configured correctly in `chat-server/index.js` to allow `http://localhost:4200`.
-   **MongoDB Connection**: Ensure your IP is whitelisted if using MongoDB Atlas, or that your local MongoDB service is running.
-   **Gemini API**: If AI features fail, verify your `GEMINI_API_KEY` is valid and has quota.
