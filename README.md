# apicmd-node

Compare two json api responses.

```sh
Usage: index [options]

Options:
  -V, --version                  output the version number
  -B, --before <before>          https://api.example.com
  -A, --after <after>            https://qa-api.example.com
  -F, --file <file>              ~/Downloads/fixtures.csv
  -H, --header <headers...>      'Cache-Control: no-cache'
  -R, --rows <rows>              1,7,12 (Rerun failed or specific tests from file)
  --retry <retryStatusCodes...>  424,500 (HTTP status codes)
  --match <matchType>            exact|superset (default is exact) (default: "exact")
  --threads <threads>            the amounts of threds to use (default is 4) (default: 4)
  --loglevel <logLevel>          log level to use info|debug (default: "info")
  -h, --help                     display help for command
```
