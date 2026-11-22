
const jwt = require("jsonwebtoken");

// Verify user authentication using JWT
const authMiddleware = (req, res, next) => {
    try {
        // Get authorization header
        const authHeader = req.headers.authorization;

        // Check if token exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Please login first"
            });
        }

        // Extract token from header
        const token = authHeader.split(" ")[1];

        // Verify JWT token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Store authenticated user ID
        req.userId = decoded.userId;

        // Continue to the next middleware or controller
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

module.exports = authMiddleware;
