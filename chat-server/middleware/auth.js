const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  let token = null;

  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    token = parts.length === 2 ? parts[1] : parts[0];
  } else if (req.headers["x-auth-token"]) {
    token = req.headers["x-auth-token"];
  }

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = auth;
