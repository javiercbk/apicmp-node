const { Requestor } = require('../requestor');

describe('Requestor', () => {
    const testRows = [];
    for (let i = 0; i < 100; i++) {
        testRows.push({
            index: i,
            data: {
                path: `entity/${i}`,
            }
        })
    }
    const beforeUrl = 'http://before/';
    const afterUrl = 'http://after/';
    test('should process every row ONLY ONCE', async () => {
        const requestedRows = {}
        const evaluatedRows = {}
        const requestor = new Requestor({
            before: beforeUrl,
            after: afterUrl,
            threads: 7,
            logger: {
                log: () => { },
            },
            onResponse: function (row) {
                if (evaluatedRows[`${row.index}`]) {
                    evaluatedRows[`${row.index}`]++
                } else {
                    evaluatedRows[`${row.index}`] = 1
                }
            }
        });
        requestor._httpClient = async function (opts) {
            let id;
            if (opts.url.indexOf(beforeUrl) !== -1) {
                id = opts.url.substring(21);
            } else {
                id = opts.url.substring(20);
            }
            requestedRows[id] = true;
            return {
                status: 200,
                data: {
                    id: id
                },
            };
        }
        await requestor.request(testRows);
        expect(Object.keys(requestedRows).length).toEqual(testRows.length);
        const evalRowsKeys = Object.keys(evaluatedRows)
        expect(evalRowsKeys.length).toEqual(testRows.length);
        const badCountDetected = evalRowsKeys.findIndex((k) => evaluatedRows[k] !== 1) === -1
        expect(badCountDetected).toEqual(true);
    });
})