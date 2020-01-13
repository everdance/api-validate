#!/usr/bin/env node

const fs = require('fs');
const assert = require('chai').assert;
const request = require('request');
const Ajv = require('ajv');
const async = require('async');
const chalk = require('chalk');
const protagonist = require('protagonist');
const _ = require('lodash');
const { retrieve, getHost } = require('./specs.js');

const argv = require('optimist').
      usage('Usage: $0 -s [schema_file] [-d [data_file]]').
      demand(['s']).argv;

// read blueprint api spec
const specFile = fs.readFileSync(argv.s, {encoding: 'utf8'});
const specJson = protagonist.parseSync(specFile);


// retrieve http specs
const host = getHost(specJson.content);
const specs = retrieve(specJson.content);

// only generate http specs
if (!argv.d) {
  console.log(specs);
  return
}

// parse data
const dataFile = fs.readFileSync(argv.d, {encoding: 'utf8'});
const reqData = JSON.parse(dataFile);

const ajv = new Ajv();
// test requests
async.eachSeries(reqData, (r, cb) => {
  const spec = _.find(specs, s => s.url === r.url &&
                      s.method === r.method);
  if (!spec) {
    console.log(chalk.yellow(`[SKIP] ${r.title} ==> SPEC NOT FOUND`));
    cb();
    return;
  }

  // interpolate path param
  var path = _.reduce(r.params, (p, v, k) => p.replace(`{${k}}`, v),
                      spec.url).replace(/{|}/g, '');
  var query = '';
  // interpolate query params
  var paths = path.split('?');
  if (paths.length > 1) {
    path = paths[0];
    query = _.chain(paths[1]).split(',').
      map(q => [q, _.get(r.params, q)]).
      filter(x => !!x[1]).
      map(x => `${x[0]}=${encodeURIComponent(x[1])}`).
      join('&').
      value();
  }

  var url = `https://${host}${path}${query?'?'+query:''}`;

  request({
    method: spec.method,
    url: url,
    headers: r.headers,
    body: r.body ? JSON.stringify(r.body): undefined
  }, (err, res, body) => {
    console.log(chalk.gray(`${spec.method} ${url}`));
    // check status code
    assert.equal(res.statusCode, 200, 'get 200 status code');

    if (spec.schema) {
      assert.equal(ajv.validate(spec.schema, JSON.parse(body)),
        true, 'body schema validation');
    }

    console.log(chalk.green(' ===> OK'));
    cb();
  });
});
