const Promise = require('bluebird');
const axios = require("axios");

const knownHeaders = ["X-Api-Key", "X-User-Dma"];

const ABORT_ERR = new Error('requestor aborted');

const ABORT_MSG = 'aborted by user';

class Requestor {
    constructor(options) {
        this._before = options.before;
        this._after = options.after;
        this._threads = options.threads;
        this._retryStatusCodes = options.retryStatusCodes;
        this._headers = options.headers;
        this._queryString = options.queryString;
        this._ignoreQuerystring = options._ignoreQuerystring;
        this._logger = options.logger;
        this._onResponse = options.onResponse;
        this._httpClient = axios;
        this._cancelTokenSource = axios.CancelToken.source();
        this._aborted = false;
    }

    async request(rows) {
        const chunks = this._calculateChunks(rows.length);
        await this._requestWithChunks(rows, chunks, 0);
    }

    interrupt() {
        this._aborted = true;
        this._cancelTokenSource.cancel(ABORT_MSG);
    }

    _requestWithChunks(rows, chunks, index) {
        const _self = this;
        return new Promise((resolve, reject) => {
            if (this._aborted) {
                reject(ABORT_ERR);
                return
            } else if (chunks.length <= index) {
                resolve();
                return
            }
            const currentChunk = chunks[index];
            const currentRows = rows.slice(currentChunk[0], currentChunk[1]);
            return Promise.map(currentRows, (row) => _self._requestAndCompareRow(row)).then(() => {
                return _self._requestWithChunks(rows, chunks, index + 1);
            }).then(resolve).catch(reject);
        });
    }

    async _requestAndCompareRow(row) {
        const path = row.data.path;
        const options = this._optionsFromRow(row)
        const responses = await Promise.map([this._before, this._after], (host) => {
            // get method is the default
            const opt = Object.assign({ method: 'GET', cancelToken: this._cancelTokenSource.token }, options);
            opt.url = host + path;
            return this._makeRequest(opt).then((response) => {
                return {
                    response,
                    options: opt,
                };
            });
        });
        if (responses[0].response === null || responses[1].response === null) {
            // avoid processing aborted responses
            return;
        }
        this._onResponse(row, responses[0], responses[1]);
    }

    async _makeRequest(opt) {
        let response;
        let done = false;
        let retryCount = 0;
        do {
            try {
                const curlCommand = this._curlCommand(opt);
                this._logger.log({
                    level: 'debug',
                    message: curlCommand,
                });
                response = await this._httpClient(opt);
            } catch (err) {
                if (err.isAxiosError) {
                    response = err.response;
                } else if (err.message === ABORT_MSG) {
                    done = true;
                    return null;
                } else {
                    throw err;
                }
            }
            if (!response) {
                throw new Error(`could not connect to server: ${opt.url}`)
            }
            if (response.status < 200 && response.status >= 300 && this._retryStatusCodes.indexOf(response.status) !== -1) {
                retryCount++;
                this._logger.log({
                    level: 'debug',
                    message: `request failed with status: ${response.status}, retrying`,
                });
                // wait 3 seconds
                await Promise.delay(3000);
            } else {
                done = true;
            }
        } while (!done && retryCount < 3);
        return response;
    }

    _curlCommand(opt) {
        let curlCommand = `curl --location --request ${opt.method} ${opt.url} \\\n`;
        Object.keys(opt.headers).forEach((k) => {
            curlCommand += `--header '${k}: ${opt.headers[k]}' \\\n`
        })
        // FIXME: Add query params
        // FIXME: Add body
        return curlCommand;
    }

    _optionsFromRow(row) {
        const options = {
            method: 'GET',
            headers: {},
        }
        if (row.data.method) {
            options.method = row.data.method;
        }
        if (row.data.body) {
            options.body = row.data.body;
        }
        knownHeaders.forEach((knownHeader) => {
            if (row.data[knownHeader]) {
                options.headers[knownHeader] = row.data[knownHeader];
            }
        });
        return options;
    }

    _calculateChunks(len) {
        let chunkSize = len / this._threads
        let nonIntegerDivision = false;
        if (chunkSize % 1 > 0) {
            chunkSize = chunkSize + 1;
            nonIntegerDivision = true;
        }
        chunkSize = Math.floor(chunkSize);
        let chunks = [];
        for (let i = 0; i < chunkSize; i++) {
            const startIndex = i * this._threads;
            let endIndex = ((i + 1) * this._threads);
            if (nonIntegerDivision && (i + 1) === chunkSize) {
                endIndex = len;
            }
            chunks.push([startIndex, endIndex]);
        }
        return chunks;
    }


}

module.exports = {
    Requestor,
    ABORT_ERR,
}