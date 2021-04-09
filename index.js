
const winston = require("winston");

const { readCSV } = require('./csv');
const { Requestor, ABORT_ERR } = require('./requestor');
const { Stats } = require('./stats');
const { Comparer, Diff } = require('./comparer');

const program = require('./program');

program.parse(process.argv);
const options = program.opts();

(async function () {
  const logger = winston.createLogger({
    level: options.loglevel,
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.simple()
    ),
    transports: [
      new winston.transports.Console(),
    ],
  });
  const stats = new Stats(logger);
  const isSuperset = options.match === "superset";
  const diffFactory = () => new Diff({
    superset: isSuperset,
  })
  const comparer = new Comparer(logger, stats, diffFactory);
  const onResponse = function (row, before, after) {
    comparer.compare(row, before, after);
  };
  let error = true;
  try {
    const rows = await readCSV(options.file, options.rows)
    const requestorOptions = Object.assign({}, options, { logger: logger, onResponse: onResponse });
    const requestor = new Requestor(requestorOptions);
    process.on('SIGINT', function () {
      logger.log({
        level: 'info',
        message: "==========  Interrupt signal received  ==========",
      })
      requestor.interrupt();
    });
    await requestor.request(rows);
  } catch (err) {
    error = true;
    if (err !== ABORT_ERR) {
      logger.log({
        level: 'error',
        message: `error executing apicmp-node: ${err}\n${err.stack}`,
      });
    }
  } finally {
    stats.printStats();
  }
  const exitCode = error ? 1 : 0;
  process.exit(exitCode);
})();

