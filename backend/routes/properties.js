const express = require("express");
const pool = require("../db/pool");
const { parsePropertyQuery, buildPropertyQueries } = require("../utils/propertyQuery");
const router = express.Router();

router.get("/", async (req, res) => {
    const parsed = parsePropertyQuery(req.query);
    if (parsed.errors) {
        return res.status(400).json({ error: "Invalid query parameters", details: parsed.errors });
    }

    const { count, results } = buildPropertyQueries(parsed);
    try {
        const [[countRows], [resultRows]] = await Promise.all([
            pool.execute(count.sql, count.values),
            pool.execute(results.sql, results.values),
        ]);

        res.json({
            total: countRows[0].total,
            limit: parsed.limit,
            offset: parsed.offset,
            results: resultRows,
        });
    } catch (err) {
        console.error("GET /api/properties failed:", err);
        res.status(500).json({ error: "Failed to fetch properties" });
    }
});

module.exports = router;
