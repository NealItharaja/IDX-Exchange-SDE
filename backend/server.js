require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db/pool");
const propertiesRouter = require("./routes/properties");
const requestLogger = require("./middleware/requestLogger");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(requestLogger);
app.use(cors());
app.use(express.json());
app.get("/api/health", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1");
        res.json({ status: "ok", database: "connected" });
    } catch (err) {
        res.status(500).json({ status: "error", database: "disconnected", error: err.message });
    }
});

app.use("/api/properties", propertiesRouter);

app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) {
        console.error(`${req.method} ${req.originalUrl} failed:`, err);
    }
    res.status(status).json({ error: status >= 500 ? "Internal server error" : err.message });
});
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
