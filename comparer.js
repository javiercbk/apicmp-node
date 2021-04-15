const { fileExists } = require('./file-utils');

const CMP_FILE_NOT_EXISTS = new Error('compare function file does not exist');
const CMP_FILE_PARSE_ERR = new Error('unable to parse compare function file');

class Comparer {
    constructor(logger, stats, diffFactory) {
        this._logger = logger;
        this._stats = stats;
        this._diffFactory = diffFactory;
    }

    compare(row, before, after) {
        const _self = this;
        if (before.response.status !== after.response.status) {
            this._stats.failure(row, 'http.statusCode', before.response.status, after.response.status);
            return;
        }
        const diff = this._diffFactory();
        const diffs = diff.diff(before.response.data, after.response.data);
        if (diffs.length) {
            diffs.forEach((diff) => {
                _self._stats.failure(row, diff.path, diff.before, diff.after);
            });
        } else {
            this._stats.success(row);
        }
    }
}

class Diff {
    constructor(options = {}) {
        this._diffs = [];
        this._logger = options.logger;
        this._isSuperset = options.superset;
        this._compareFunc = function (beforeVal, afterVal) {
            return beforeVal === afterVal;
        };
        if (options.ignore) {
            this._ignorePathFunc = options.ignore;
        } else {
            this._ignorePathFunc = () => false;
        }
        if (options.cmp) {
            this._compareFunc = options.cmp;
        }
    }

    diff(before, after) {
        this._comparePath(before, after, "")
        return this._diffs;
    }

    _comparePath(beforeVal, afterVal, path) {
        if (this._ignorePathFunc(path)) {
            this._logger.log({
                level: 'debug',
                message: `ignoring path: ${path}`
            })
            return;
        }
        if ((beforeVal && !afterVal) || (!beforeVal && afterVal)) {
            this._diffs.push({ path: path, before: beforeVal, after: afterVal });
        } else {
            if (typeof beforeVal === 'object') {
                if (Array.isArray(beforeVal)) {
                    this._compareArray(beforeVal, afterVal, path);
                } else {
                    this._compareObject(beforeVal, afterVal, path);
                }
            } else {
                // if it is not an object, then compare with the after value
                if (!this._compareFunc(beforeVal, afterVal, path)) {
                    this._diffs.push({ path: path, before: beforeVal, after: afterVal });
                }
            }
        }
    }

    _compareObject(before, after, path) {
        const _self = this;
        if (this._ignorePathFunc(path)) {
            this._logger.log({
                level: 'debug',
                message: `ignoring path: ${path}`
            })
            return;
        }
        if ((before && !after) || (this._isSuperset && !before && after)) {
            this._diffs.push({ path: path, before: before, after: after });
        } else if (before && after) {
            const beforeKeys = Object.keys(before);
            beforeKeys.forEach((k) => {
                _self._compareKey(before, after, k, path);
            });
            if (!this._isSuperset && after) {
                const afterKeys = Object.keys(after);
                afterKeys.forEach((k) => {
                    _self._compareKey(before, after, k, path);
                });
            }
        }
    }

    _compareKey(before, after, k, path) {
        if (this._ignorePathFunc(path)) {
            this._logger.log({
                level: 'debug',
                message: `ignoring path: ${path}`
            })
            return;
        }
        if ((before && !after) || (this._isSuperset && !before && after)) {
            this._diffs.push({ path: path, before: before, after: after });
        } else if (before && after) {
            const beforeVal = before[k];
            const afterVal = after[k];
            const nextPath = path === "" ? k : `${path}.${k}`;
            this._comparePath(beforeVal, afterVal, nextPath)
        }
    }

    _compareArray(before, after, path) {
        if (this._ignorePathFunc(path)) {
            this._logger.log({
                level: 'debug',
                message: `ignoring path: ${path}`
            })
            return;
        }
        if ((before && !after) || (!this._isSuperset && !before && after)) {
            this._diffs.push({ path: path, before: before, after: after });
        } else if (before.length !== after.length) {
            this._diffs.push({ path: `${path}.length`, before: before, after: after });
        } else {
            const _self = this;
            before.forEach((beforeVal, index) => {
                const afterVal = after[index];
                _self._comparePath(beforeVal, afterVal, `${path}[${index}]`);
            });
        }
    }
}

const readPlugin = async function (path) {
    const exists = await fileExists(path);
    if (!exists) {
        throw CMP_FILE_NOT_EXISTS;
    }
    // WARNING:this can easily be exploited
    const plugin = require(path);
    if (plugin.cmp && typeof plugin.cmp !== "function") {
        throw CMP_FILE_PARSE_ERR;
    }
    if (plugin.ignore && typeof plugin.ignore !== "function") {
        throw CMP_FILE_PARSE_ERR;
    }
    return plugin;
}

module.exports = {
    Comparer,
    Diff,
    readPlugin,
    CMP_FILE_NOT_EXISTS,
    CMP_FILE_PARSE_ERR,
}