// Runs EXPLAIN + timing on the exact SQL the /api/properties route generates.
// Usage: npm run explain   (run before and after db/indexes.sql to compare)
require("dotenv").config();

const pool = require("../db/pool");
const { parsePropertyQuery, buildPropertyQueries } = require("../utils/propertyQuery");

const RUNS = 5;

const SCENARIOS = [
    {},
    { city: "Irvine" },
    { city: "Irvine", minPrice: "300000", beds: "3" },
    { city: "Los Angeles", minPrice: "500000", maxPrice: "900000" },
    { zipcode: "92618" },
    { zipcode: "92618", maxPrice: "1500000" },
    { minPrice: "5000000" },
    { minPrice: "300000", beds: "3" },
    { beds: "6", baths: "5" },
];

async function timeQuery(sql, values) {
    await pool.execute(sql, values);
    const start = process.hrtime.bigint();
    for (let i = 0; i < RUNS; i++) {
        await pool.execute(sql, values);
    }
    return Number(process.hrtime.bigint() - start) / 1e6 / RUNS;
}

async function explain(label, { sql, values }) {
    const [plan] = await pool.execute(`EXPLAIN ${sql}`, values);
    const ms = await timeQuery(sql, values);
    const { type, key, rows, Extra } = plan[0];
    return { label, type, key: key ?? "NULL", rows, avgMs: ms.toFixed(2), extra: Extra ?? "" };
}

async function main() {
    const [indexes] = await pool.query("SHOW INDEXES FROM rets_property");
    const names = [...new Set(indexes.map((index) => index.Key_name))];
    console.log(`Indexes on rets_property: ${names.join(", ")}\n`);

    const rows = [];
    for (const query of SCENARIOS) {
        const parsed = parsePropertyQuery({ ...query });
        const { count, results } = buildPropertyQueries(parsed);
        const label = new URLSearchParams(query).toString() || "(no filters)";

        rows.push(await explain(`${label} [count]`, count));
        rows.push(await explain(`${label} [results]`, results));
    }

    console.table(rows);
    await pool.end();
}

main().catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
});
