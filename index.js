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
      usage('Usage: $0 -s [schema_file] -d [data_file]').
      demand(['s','d']).argv;

// read blueprint api spec
const specFile = fs.readFileSync(argv.s, {encoding: 'utf8'});
const specJson = protagonist.parseSync(specFile);


// retrieve http specs
const host = getHost(specJson.content);
const specs = retrieve(specJson.content);

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

  //  interpolate path param
  const path = _.reduce(r.params, (p, v, k) => p.replace(`{${k}}`, v),
                        spec.url);
  // TODO: interpolate query params
  console.log(chalk.gray(`${spec.method} ${spec.url}`));

  request({
    method: spec.method,
    url: `https://${host}${path}`,
    headers: r.headers
    // TODO: add body
  }, (err, res, body) => {
    assert.equal(res.statusCode, 200, 'get 200 status code');

    if (spec.schema) {
      assert.equal(ajv.validate(spec.schema, JSON.parse(body)),
        true, 'body schema validation');
    }

    console.log(chalk.green(' ===> OK'));
    cb();
  });
});
