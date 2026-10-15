function requestLogger(req, res, next) {
    const timestamp = new Date().toISOString();
    const start = process.hrtime.bigint();
    let logged = false;

    const log = () => {
        if (logged) return;
        logged = true;

        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        const status = res.writableFinished ? res.statusCode : "aborted";
        console.log(`[${timestamp}] ${req.method} ${req.originalUrl} ${status} ${ms.toFixed(2)}ms`);
    };

    res.on("finish", log);
    res.on("close", log);
    next();
}

module.exports = requestLogger;
