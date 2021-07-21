const Promise = require('bluebird');
const csv = require("csv-parser");
const fs = require("fs");

const { fileExists } = require('./file-utils');

const rowFilterFactory = function (filters) {
    return function (row, index) {
        return filters.findIndex(filterFunc => !filterFunc(row, index)) === -1;
    }
}

const filterRowsWithNoPath = row => !!row.path;

const filterRowsWithInvalidMethod = (row) => {
    if (!row.method) {
        // GET method will be assumed
        return true;
    }
    const methodUpper = row.method.toUpperCase();
    return methodUpper === 'GET' ||
        methodUpper === 'POST' ||
        methodUpper === 'PUT' ||
        methodUpper === 'DELETE' ||
        methodUpper === 'PATCH' ||
        methodUpper === 'HEAD' ||
        methodUpper === 'TRACE' ||
        methodUpper === 'OPTIONS';
};

const filterRowsByIndexFactory = function (indexes) {
    return function (row, index) {
        return indexes.indexOf(index) !== -1;
    };
}

/**
 * readCSV reads a csv file into an array of rows 
 * @param {string} path the file path to the csv file
 * @param {string} rowsToFilter the rows to filter
 * @return {Promise.<Object[]>}
 */
const readCSV = async function (path, rowsToFilter) {
    let filters = [
        filterRowsWithNoPath,
        filterRowsWithInvalidMethod,
    ];
    if (rowsToFilter && rowsToFilter.length > 0) {
        filters.push(filterRowsByIndexFactory(rowsToFilter));
    }
    const rowFilters = rowFilterFactory(filters);
    const rows = [];
    let resolved = false;
    const csvFileExists = await fileExists(path);
    if (!csvFileExists) {
        throw new Error(`file ${path} does not exist`);
    }
    await new Promise((resolve, reject) => {
        let index = 0;
        fs.createReadStream(path)
            .pipe(csv())
            .on("data", (row) => {
                if (rowFilters(row, index)) {
                    rows.push({ index, data: row });
                }
                index++
            })
            .on("error", (err) => {
                if (!resolved) {
                    reject(err);
                    resolved = true;
                }
            })
            .on("end", () => {
                if (!resolved) {
                    resolve();
                    resolved = true;
                }
            });
    });
    return rows;
};

module.exports = { readCSV };