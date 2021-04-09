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
        this._isSuperset = options.superset;
        this._comparePathFunc = options.comparePathFunc;
        if (!this._comparePathFunc) {
            this._compareFunc = function (beforeVal, afterVal) {
                return beforeVal === afterVal;
            };
        }
    }

    diff(before, after) {
        this._comparePath(before, after, "")
        return this._diffs;
    }

    _comparePath(before, after, currentPath) {
        const _self = this;
        const beforeKeys = Object.keys(before);
        beforeKeys.forEach((k) => {
            _self._compareKey(before, after, k, currentPath);
        });
        if (!this._isSuperset && after) {
            const afterKeys = Object.keys(after);
            afterKeys.forEach((k) => {
                _self._compareKey(before, after, k, currentPath);
            });
        }
    }

    _compareKey(before, after, k, currentPath) {
        if ((before && !after) || (!before && after)) {
            this._diffs.push({ path: currentPath, before: before, after: after });
        } else {
            const beforeVal = before[k];
            const afterVal = after[k];
            if (typeof beforeVal === 'object') {
                const nextPath = currentPath === "" ? k : `${currentPath}.${k}`;
                if (Array.isArray(beforeVal)) {
                    this._compareArray(beforeVal, afterVal, nextPath);
                } else {
                    this._comparePath(beforeVal, afterVal, nextPath);
                }
            } else {
                // if it is not an object, then compare with the after value
                if (!this._compareFunc(beforeVal, afterVal, currentPath)) {
                    this._diffs.push({ path: currentPath, before: beforeVal, after: afterVal });
                }
            }
        }
    }

    _compareArray(before, after, currentPath) {
        if ((before && !after) || (!before && after)) {
            this._diffs.push({ path: currentPath, before: before, after: after });
        } else if (before.length !== after.length) {
            this._diffs.push({ path: `${currentPath}.length`, before: before, after: after });
        } else {
            const _self = this;
            before.forEach((beforeVal, index) => {
                const afterVal = after[index];
                _self._comparePath(beforeVal, afterVal, `${currentPath}[${index}]`);
            });
        }
    }
}

module.exports = {
    Comparer,
    Diff,
}