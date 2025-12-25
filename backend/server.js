require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const formRoutes = require("./routes/forms");
const responseRoutes = require("./routes/responses");

const app = express();

app.use(cors());
app.use(express.json());

const FRONTEND_PATH = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND_PATH));

app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/responses", responseRoutes);

app.get("*", (req, res) => {
    // If request starts with /api, do NOT serve frontend
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API route not found" });
    }
  
    res.sendFile(path.join(FRONTEND_PATH, "login.html"));
  });
  

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const paymentRoutes = require("./routes/payments");
app.use("/api/payments", paymentRoutes);
