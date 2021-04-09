const normalizeRegexp = /\[[0-9]+\]/g;

class Stats {
    constructor(logger) {
        this._logger = logger;
        this._totalProcessed = 0;
        this._successCount = 0;
        this._failureCount = 0;
        this._failureRows = [];
        this._failuresTypes = {};
        this._rowsProcessed = {};
    }

    failure(row, type, before, after) {
        const rowIndex = row.index;
        if (!this._rowsProcessed[rowIndex]) {
            this._totalProcessed++;
            this._failureCount++
            this._failureRows.push(rowIndex);
            this._rowsProcessed[rowIndex] = true;
            this._logger.log({
                level: 'info',
                message: `row - ${rowIndex} : failed comparison`,
            });
        }
        const normalizedType = this._normalizeType(type)
        if (!this._failuresTypes[normalizedType]) {
            this._failuresTypes[normalizedType] = [];
        }
        if (this._failuresTypes[normalizedType].indexOf(rowIndex) === -1) {
            this._failuresTypes[normalizedType].push(rowIndex);
        }
        this._logger.log({
            level: 'debug',
            message: `row - ${rowIndex} : ${type} : ${before} => ${after}`,
        });
    }

    success(row) {
        const rowIndex = row.index;
        if (!this._rowsProcessed[rowIndex]) {
            this._successCount++;
            this._totalProcessed++;
        }
        this._logger.log({
            level: 'info',
            message: `row - ${rowIndex} : success`,
        });
    }

    printStats() {
        let statsStr = "\n\n\n==========~  STATS  ~==========\n\n";
        statsStr += `Total Processed: ${this._totalProcessed}\n`;
        statsStr += `Total Processed: ${this._totalProcessed}\n`;
        statsStr += `Success: ${this._successCount}\n`
        statsStr += `Failures: ${this._failureCount}\n`
        statsStr += `Rows failed: ${this._failureRows.join(',')}\n`
        const failureKeys = Object.keys(this._failuresTypes);
        if (failureKeys.length) {
            failureKeys.forEach((k) => {
                statsStr += `failures "${k}": ${this._failuresTypes[k].join(',')}\n`;
            });
        }
        statsStr += "\n===============================\n\n\n";
        this._logger.log({
            level: 'info',
            message: statsStr,
        });
    }

    _normalizeType(type) {
        return type.replace(normalizeRegexp, "[n]");
    }
}

module.exports = {
    Stats
};