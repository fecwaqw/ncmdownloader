const fs = require("fs");
var followRedirects = require("follow-redirects");
const ncmApi = require("NeteaseCloudMusicApi");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadGo = (res, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        file.on("error", (err) => {
            reject(err);
        });
        file.on("finish", async () => {
            resolve(dest);
        });
        res.pipe(file);
    });
};

const get = (url, maxRedirects = 5, timeout = 30000) => {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith("https")
            ? followRedirects.https
            : followRedirects.http;
        const options = {
            maxRedirects: maxRedirects,
            timeout: timeout,
        };

        const req = protocol.get(url, options, (res) => {
            if (!res || res.statusCode !== 200)
                return reject(
                    new Error(
                        `response status code is not 200: ${res.statusCode}`,
                    ),
                );
            resolve(res);
        });
        req.on("error", (err) => {
            reject(err);
        });
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timed out"));
        });
    });
};

const downloadWithRetry = async (url, dest, maxRetries = 3, retryDelay = 1000, timeout = 30000) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await get(url, 5, timeout);
            return await downloadGo(res, dest);
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                await sleep(retryDelay);
            }
        }
    }
    throw lastError;
};

const downloadBufferWithRetry = async (url, maxRetries = 3, retryDelay = 1000, timeout = 30000) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await get(url, 5, timeout);
            return await new Promise((resolve, reject) => {
                const chunks = [];
                res.on("data", (chunk) => chunks.push(chunk));
                res.on("end", () => resolve(Buffer.concat(chunks)));
                res.on("error", reject);
            });
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                await sleep(retryDelay);
            }
        }
    }
    throw lastError;
};

const download = async (url, dest, retries = 3, retryDelay = 1000, timeout = 30000) => {
    return downloadWithRetry(url, dest, retries, retryDelay, timeout);
};

const downloadBuffer = async (url, retries = 3, retryDelay = 1000, timeout = 30000) => {
    return downloadBufferWithRetry(url, retries, retryDelay, timeout);
};

const downloadLyricWithRetry = async (songId, cookie, maxRetries = 3, retryDelay = 1000) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const data = await ncmApi.lyric({
                id: songId,
                cookie: cookie,
            });
            return data.body;
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                await sleep(retryDelay);
            }
        }
    }
    throw lastError;
};

const downloadLyric = async (songId, cookie, retries = 3, retryDelay = 1000) => {
    return downloadLyricWithRetry(songId, cookie, retries, retryDelay);
};

module.exports = { download, downloadBuffer, downloadLyric };
