const packageJSON = require("./package.json");
const { Command } = require("commander");

/**
 * parseNumberArray parses a number array from a string
 * @param {string} v the string provided in the command line
 * @returns {number[]} the parsed valye
 */
const parseNumberArray = function (v) {
    if (v && typeof v === "string") {
        return v.split(",").map(v => parseInt(v, 10))
    }
    return [];
};

const parseNumberFactory = function (defaultVal) {
    return function (v) {
        if (v && typeof v === 'string') {
            return parseInt(v, 10);
        }
        return defaultVal;
    };
};

const program = new Command();

program
    .version(packageJSON.version)
    .requiredOption("-B, --before <before>", "https://api.example.com")
    .requiredOption("-A, --after <after>", "https://qa-api.example.com")
    .requiredOption("-F, --file <file>", "~/Downloads/fixtures.csv")
    .option("-H, --header <headers...>", "'Cache-Control: no-cache'", ["Cache-Control: no-cache"])
    .option("-R, --rows <rows>", "1,7,12 (Rerun failed or specific tests from file)", parseNumberArray)
    .option("--retry <retryStatusCodes...>", "424,500 (HTTP status codes)", parseNumberArray)
    .option("--match <matchType>", "exact|superset (default is exact)", "exact")
    .option("--threads <threads>", "the amounts of threds to use (default is 4)", parseNumberFactory(4), 4)
    .option("--loglevel <logLevel>", "log level to use info|debug", "info")
    .option("--plugin <plugin>", "the file path to a .js that exports a cmp function and a ignore function")

module.exports = program