const fs = require("fs");

const fileExists = function (path) {
    return new Promise((resolve, reject) => {
        fs.stat(path, function (err) {
            if (!err) {
                resolve(true);
            } else if (err.code === 'ENOENT') {
                resolve(false);
            } else {
                reject(err);
            }
        });
    });
}

module.exports = {
    fileExists,
};