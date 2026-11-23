// npm run explain to explain results
// npm run explain -- --full ( prints every EXPLAIN column + EXPLAIN ANALYZE for the most complex query)
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
    { sortBy: "price", sortOrder: "asc" },
    { sortBy: "price", sortOrder: "desc" },
    { sortBy: "listDate", sortOrder: "desc" },
    { sortBy: "sqft", sortOrder: "desc" },
    { sortBy: "sqft", sortOrder: "asc" },
    { city: "Los Angeles", sortBy: "listDate", sortOrder: "desc" },
    { city: "Los Angeles", sortBy: "price", sortOrder: "desc" },
    { sortBy: "price", sortOrder: "asc", offset: "2000" },
];

const MOST_COMPLEX = {
    city: "Los Angeles",
    minPrice: "500000",
    maxPrice: "2000000",
    beds: "3",
    baths: "2",
    sortBy: "listDate",
    sortOrder: "desc",
};

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

function buildQueries(query) {
    const parsed = parsePropertyQuery({ ...query });
    if (parsed.errors) throw new Error(`Invalid scenario ${JSON.stringify(query)}: ${parsed.errors.join("; ")}`);
    return buildPropertyQueries(parsed);
}

async function printFullExplain() {
    const { count, results } = buildQueries(MOST_COMPLEX);
    console.log(`\nMost complex query: ?${new URLSearchParams(MOST_COMPLEX)}`);

    for (const [label, { sql, values }] of [["count", count], ["results", results]]) {
        console.log(`\n--- ${label} ---\n${sql.replace(/\s+/g, " ").trim()}\nvalues: ${JSON.stringify(values)}`);
        const [plan] = await pool.execute(`EXPLAIN ${sql}`, values);
        console.table(plan);
        const [analyze] = await pool.execute(`EXPLAIN ANALYZE ${sql}`, values);
        console.log(analyze[0]["EXPLAIN"]);
    }
}

async function main() {
    const [indexes] = await pool.query("SHOW INDEXES FROM rets_property");
    const names = [...new Set(indexes.map((index) => index.Key_name))];
    console.log(`Indexes on rets_property: ${names.join(", ")}\n`);

    const rows = [];
    for (const query of SCENARIOS) {
        const { count, results } = buildQueries(query);
        const label = new URLSearchParams(query).toString() || "(no filters)";

        rows.push(await explain(`${label} [count]`, count));
        rows.push(await explain(`${label} [results]`, results));
    }
    console.table(rows);

    if (process.argv.includes("--full")) await printFullExplain();
    await pool.end();
}

main().catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
});
