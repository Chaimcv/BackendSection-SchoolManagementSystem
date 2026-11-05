const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const rawHeader = req.header("Authorization");
  const token = rawHeader ? rawHeader.replace(/^Bearer\s+/i, "").trim() : null;

  if (!token) {
    return res.status(401).json({ message: "No authentication token provided. Please log in as a student." });
  }

  try {
    const secret = process.env.JWT_SECRET || "myschoolsecretkey";
    const decoded = jwt.verify(token, secret);
    req.Student = decoded; // Contains student id
    next();
  } catch (err) {
    res.status(401).json({ message: "Session expired or invalid token. Please log in again." });
  }
};

module.exports = auth;
