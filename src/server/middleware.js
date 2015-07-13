import fs from 'fs';
import fsPath from 'path';
import _ from 'lodash';
import Promise from 'bluebird';
import state from './state';
import pageJS from './page-js';
import { BASE_MODULE_PATH } from '../const';


const getMethods = (basePath) => {
  return state.methods.map((method) => {
      let result = {};
      ['get', 'put', 'post', 'delete'].map((verb) => {
          let item = method[verb];
          if (item) {
            if (item.route.path) { result.url = item.route.path; }
            let verbDefiniton = result[verb] = {}
            if (item.params.length > 0) { verbDefiniton.params = item.params; }
          }
      });
      return result;
  });
};


const jsCache = {};
const sendJs = (res, fileName) => {
  let js = jsCache[fileName];
  if (!js) {
    // NB: Loaded from file only once.
    js = fs.readFileSync(fsPath.join(__dirname, `../../dist/${ fileName }`)).toString();
    jsCache[fileName] = js;
  }
  res.setHeader('Content-Type', 'application/javascript');
  res.end(js);
};


const sendJson = (res, obj) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
};


const matchMethodUrl = (url, verb) => {
    verb = verb.toLowerCase();
    let context = new pageJS.Context(url);
    let result = state.methods.find((method) => {
        let methodVerb = method[verb];
        return (methodVerb && methodVerb.route.match(context.path, context.params))
    });
    return result ? result[verb] : undefined;
};



/**
* The connect middleware for managing API calls to the server.
* @return the connect middleware function.
*/
export default () => {
  // Middleware.
  return (req, res, next) => {
      switch (req.url) {
        // GET: The manifest of methods.
        case `/${ BASE_MODULE_PATH }/manifest`:
            if (req.method === 'GET') {
              sendJson(res, {
                methods: getMethods(state.basePath)
              });
              break;
            }

        // GET: Serve the client JS.
        //      NB: Only required if not using WebPack.
        case `/${ BASE_MODULE_PATH }.client.js`:
            if (req.method === 'GET') {
              sendJs(res, 'client.js');
              break;
            }

        case `/${ BASE_MODULE_PATH }.client.min.js`:
            if (req.method === 'GET') {
              sendJs(res, 'client.min.js');
              break;
            }

        default:
            // Attempt to match the URL of a method.
            let methodVerb = matchMethodUrl(req.url, req.method);
            if (methodVerb) {

              // Invoke the method.
              methodVerb.invoke(req.body.args)
                .then((result) => { sendJson(res, result); })
                .catch((err) => { res.status(500).send(err.message); });

            } else {
              // No match - next middleware method.
              next();
            }
      }
    };
};
