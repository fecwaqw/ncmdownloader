/**
 * 替换文件名中的非法字符
 * @param {string} filename - 原始文件名
 * @returns {string} - 替换非法字符后的文件名
 */
function sanitizeFilename(filename) {
    const illegalChars = ["/", ":", "*", "?", '"', "<", ">", "|", "\\"];
    let sanitized = filename;
    illegalChars.forEach((char) => {
        sanitized = sanitized.split(char).join("");
    });
    return sanitized;
}

/**
 * 截断文件名，保留首尾，中间用省略号代替
 * @param {string} filename - 原始文件名（不含路径）
 * @param {number} maxLength - 最大字符长度，默认200
 * @returns {string} - 截断后的文件名
 */
function truncateFilename(filename, maxLength = 200) {
    // 先替换非法字符
    filename = sanitizeFilename(filename);

    // 如果长度在允许范围内，直接返回
    if (filename.length <= maxLength) {
        return filename;
    }

    // 计算需要截断的部分
    const ellipsis = "...";
    const ellipsisLength = ellipsis.length;
    const availableLength = maxLength - ellipsisLength;

    if (availableLength <= 0) {
        return ellipsis;
    }

    // 保留头部和尾部
    const headLength = Math.floor(availableLength / 2);
    const tailLength = availableLength - headLength;

    const head = filename.slice(0, headLength);
    const tail = filename.slice(-tailLength);

    return head + ellipsis + tail;
}

module.exports = { sanitizeFilename, truncateFilename };
