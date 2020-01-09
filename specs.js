const _ = require('lodash');

// simplified blueprint api json structure 
/*
 {
   element: "parseResult"
   content: [
     {
       element: "category"
       content: [
           .
            ..
             ...
              ....
                content: [
                   {
                      element: "resource",
                      content: [
                        {
                          element: "transition",
                          content: [
                            {
                               element: "httpTransaction",
                               content: [
                                 {
                                   element: "httpRequest",
                                   attributes: {...},
                                   headers: {...}
                                 },
                                 {
                                   element: "httpResponse",
                                   attributes: {...},
                                   content: [
                                     { element: "asset"... }
                                     ...
                                   ]
                                 }
                               ]
                            }
                            ...
                          ]
                        }
                        ...
                      ]
                   },
                   ...
                ]
            ....
          ...
         ..
        . 
       ]
     }
     ...
   ]
 }
*/


// recursively aggregate all resource elements by traversing the spec tree
// `content` param is the top level `content` node of parsed apib tree
const getResources = content => {
  if (!content) return [];

  const rs = _.filter(content, el => el.element === 'resource');
  if (rs.length > 0) {
    return rs;
  }
  return _.flatMap(content, el => getResources(el.content));
}

// parse individual resource element to get api http spec
// parsed spec example: 
// {
//    title: 'get book by id',
//    url: '/api/book/{id}',
//    params: [],
//    method: 'GET',
//    schema: {
//      type: 'object',
//      properties: [Object],
//      required: [Array]
//    }
//  }
const getSpec = resource => _.chain(resource.content).
      filter(e => e.element === 'transition').
      map(getTrans).
      map(s => _.merge(s, {
        url: _.get(resource, 'attributes.href.content')
      })).
      value();

// map a transaction to a spec by its 2xx http transaction
const getTrans = ts => {
  const title = _.get(ts, 'meta.title.content');
  const params = _.chain(ts).
        get('attributes.hrefVariables.content', []).
        map(m => _.get(m, 'content.key.content')).
        value();

  const statusPath = 'attributes.statusCode.content';
  return _.chain(ts.content).
    filter(tx => tx.element === 'httpTransaction').
    filter(tx => _.some(tx.content,
                        h => h.element === "httpResponse" &&
                        _.get(h, statusPath) === "200")).
    head().
    get('content').
    reduce(getHttp, {}).
    merge({title: title, params: params}).
    value();
}

// get http request params and response schema from http transactions 
const getHttp = (r, v) => {
  if (v.element === 'httpRequest') {
    r['headers'] = _.chain(v).
      get('attributes.headers.content',[]).
      map(c => _.get(c, 'content.key.content')).
      value();
    r['method'] = _.get(v, 'attributes.method.content');
  }

  if (v.element === 'httpResponse') {
    const spath = 'meta.classes.content[0].content';
    const schema = _.chain(v.content).
          filter(c => c.element === 'asset').
          filter(c => _.get(c, spath) === 'messageBodySchema').
          head().
          get('content', 'null').
          value();
    // `$schema` meta field causes schema validation fails on ajv
    // remove it, use ajv default schema meta
    r['schema'] = _.omit(JSON.parse(schema), ['$schema']);
  }

  return r;
}

exports.retrieve = content => _.chain(getResources(content)).
    flatMap(getSpec).
    compact().
    value();

// get http request hosts
exports.getHost = c => _.chain(c).
  find(x => x.element === 'category').
  get('attributes.metadata.content').
  filter(m => _.get(m, 'content.key.content') === 'HOST').
  head().
  get('content.value.content').
  value();
