require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db/pool");
const propertiesRouter = require("./routes/properties");
const app = express();
const PORT = process.env.PORT || 3000;

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
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
