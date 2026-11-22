
require("dotenv").config();

// ==========================================
// ANEMRIA HUB - BACKEND SERVER
// ==========================================

// Import required packages
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// Import route files
const authRoutes = require("./community/routes/authRoutes");
const friendRoutes = require("./community/routes/friendRoutes");
const profileRoutes = require("./community/routes/profileRoutes");
const messageRoutes = require("./community/routes/messageRoutes");
const postRoutes = require("./community/routes/postRoutes");
const pollRoutes = require("./community/routes/pollRoutes");

// Initialize application
const app = express();
const server = http.createServer(app);

// Server port
const PORT = process.env.PORT || 5000;

// Allowed frontend origins
const allowedOrigins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
];

// ==========================================
// CHECK ROUTE IMPORTS
// ==========================================

const routes = {
    authRoutes,
    friendRoutes,
    profileRoutes,
    messageRoutes,
    postRoutes,
    pollRoutes
};

// Verify every imported route is an Express router
for (const [name, route] of Object.entries(routes)) {
    if (typeof route !== "function") {
        throw new Error(
            `${name} is not a valid Express router. Check its module.exports.`
        );
    }

    console.log(`${name} loaded successfully`);
}

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/polls", pollRoutes);

// ==========================================
// HOME ROUTE
// ==========================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Welcome to Anemria Backend API!"
    });
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Anemria server is running!",
        database: mongoose.connection.readyState === 1
            ? "Connected"
            : "Disconnected"
    });
});

// ==========================================
// SOCKET.IO
// ==========================================

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// ==========================================
// MONGODB CONNECTION
// ==========================================

const startServer = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing from .env");
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing from .env");
        }

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected successfully!");

        server.listen(PORT, () => {
            console.log(`Anemria server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server startup error:", error.message);
        process.exit(1);
    }
};

startServer();
