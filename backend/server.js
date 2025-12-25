require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

/* ROUTES */
const authRoutes = require("./routes/auth");
const formRoutes = require("./routes/forms");
const responseRoutes = require("./routes/responses");
const paymentRoutes = require("./routes/payments");

/* MIDDLEWARE */
app.use(cors());
app.use(express.json());

/* STATIC FRONTEND */
const FRONTEND_PATH = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND_PATH));

/* API ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/responses", responseRoutes);
app.use("/api/payments", paymentRoutes);

/* FALLBACK */
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }

  res.sendFile(path.join(FRONTEND_PATH, "login.html"));
});

/* START SERVER */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
