# apicmd-node

Compare two json api responses.

```sh
Usage: index [options]

Options:
  -V, --version                  output the version number
  -B, --before <before>          https://api.example.com
  -A, --after <after>            https://qa-api.example.com
  -F, --file <file>              ~/Downloads/fixtures.csv
  -H, --header <headers...>      'Cache-Control: no-cache' (default: ["Cache-Control: no-cache"])
  -R, --rows <rows>              1,7,12 (Rerun failed or specific tests from file)
  --retry <retryStatusCodes...>  424,500 (HTTP status codes)
  --match <matchType>            exact|superset (default is exact) (default: "exact")
  --threads <threads>            the amounts of threds to use (default is 4) (default: 4)
  --loglevel <logLevel>          log level to use info|debug (default: "info")
  --plugin <plugin>              the file path to a .js that exports a cmp function and a ignore function
  -h, --help                     display help for command
```

## Plugins

You can define a plugin to make comparisons where an exact match is not required, for example

```javascript
const innerPropertyToIgnore =
  /root\.property\.array\[[0-9]+\]\.anotherProperty\..*/;

const imageCmpPath = /root\.image/;

// ignore returns true if we want to ignore an object's property to be ignored when compared.
const ignore = function (path) {
  if (innerPropertyToIgnore.test(path)) {
    return true;
  }
  return false;
};

// cmp overrides the comparison function between actual values.
const cmp = function (beforeVal, afterVal, path) {
  if (imageCmpPath.test(path)) {
    // images have this format: http://<host>/images/<image-name>
    // comparing images by exact match may not be what we want
    // but maybe we want to see if the image-name matches
    const beforeLastIndexOfSlash = beforeVal.lastIndexOf("/");
    const beforeImg = beforeVal.substring(beforeLastIndexOfSlash + 1);
    const afterLastIndexOfSlash = afterVal.lastIndexOf("/");
    const afterImg = afterVal.substring(afterLastIndexOfSlash + 1);
    return beforeImg === afterImg;
  }
  // fallback to simple comparison if we have no special comparison rule
  return beforeVal === afterVal;
};

module.exports = {
  ignore,
  cmp,
};
```
