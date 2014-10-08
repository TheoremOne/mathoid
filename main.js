var VERSION = '0.1-dev';

var fs = require('fs'),
    system = require('system'),
    Getopt = require('node-getopt'),
    server = require('webserver').create(),
    page = require('webpage').create();

var args = system.args;

var port = 16000;
var requestsToServe = -1;
var benchPage = 'index.html';
var debug = false;

// Parse command-line options.  This keeps track of which one we are on
var argNum = 1;
var arg;

// activeRequests holds information about any active MathJax requests.  It is
// a hash, with a sequential number as the key.  requestNum gets incremented
// for *every* HTTP request, but only requests that get passed to MathJax have an
// entry in activeRequests.  Each element of activeRequests
// is an array of [<response object>, <start time>].
var requestNum = 0;
var activeRequests = {};

// This will hold the test HTML form, which is read once, the first time it is
// requested, from test.html.
var testFormFilename = 'test.html';
var testForm = null;

var service = null;

var usage = [
    'Usage: phantomjs main.js [options]',
    'Options:',
    '  -r,--requests <num>  Process this many requests and then exit. -1 means ',
    '                       never stop.',
    '  -b,--bench <page>    Use alternate bench page (default is index.html)',
    '  -d,--debug           Enable verbose debug messages'
].join("\n");

var opts = new Getopt([
    ['v', 'version',      'Print version number and exit'],
    ['p', 'port=ARG',     'Port to listen'],
    ['r', 'requests=ARG', 'Process this many requests and then exit. -1 means never stop.'],
    ['b', 'bench=ARG',    'Use alternate bench page (default index.html)'],
    ['d', 'debug',        'Enable verbose debug messages']
]).bindHelp().parseSystem();


if (opts.options.version) {
    console.log('svgtex version ' + VERSION);
    phantom.exit(0);
}

if (opts.options.port) {
    port = parseInt(opts.options.port, 10);
}

if (opts.options.port || opts.options.p) {
    port = parseInt(opts.options.port || opts.options.p, 10);
}

if (opts.options.requests || opts.options.r) {
    requestsToServe = parseInt(opts.options.requests || opts.options.r, 10);
}

if (opts.options.bench || opts.options.b) {
    benchPage = opts.options.bench || opts.options.b;
}

if (opts.options.debug || opts.options.d) {
    debug = true;
}

// Thanks to: stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript
var utf8Strlen = function (str) {
    var m = encodeURIComponent(str).match(/%[89ABab]/g);
    return str.length + (m ? m.length : 0);
}

// This is the callback that gets invoked after the math has been converted.
// The argument, data, is an array that holds the three arguments from the
// process() function in engine.js:  the request number, the original
// text, and either the converted svg, or an array of one element
// that holds an error message.
page.onCallback = function (data) {
    var query = data[0],
        num = query.num,
        src = query.q,
        svgOrError = data[1],
        mml = data[2],
        success = data[3],
        record = activeRequests[num],
        resp = record[0],
        startTime = record[1],
        duration = (new Date()).getTime() - startTime,
        durationMsg = ', took ' + duration + 'ms.',
        validRequest = false,
        log;

    if( (typeof svgOrError) === 'string'){
        validRequest = true;
        log = num + ': ' + src.substr(0, 30) + '.. ' +
            src.length + 'B query, OK ' + svgOrError.length + 'B result' +
            durationMsg;
    } else {
        log = src.substr(0, 30) + '.. ' +
            src.length + 'B query, error: ' + svgOrError[0] + durationMsg;
    }
    if(query.format == 'json'){
        if ( validRequest ) {
            resp.statusCode = 200;

            // Temporary fix for BUG 62921
            if (query.type == 'mml'){
                mml = '';
                src = 'mathml';
            }
            // End of fix

            out = JSON.stringify({
                input: src,
                svg: svgOrError,
                mml: mml,
                log: log,
                success: success
            });
            resp.setHeader('Content-Type', 'application/json');
            resp.setHeader('Content-Length', utf8Strlen(out).toString() );
            resp.write(out);
        } else {
            resp.statusCode = 400;
            out = JSON.stringify({
                input: src,
                err: svgOrError[0],
                mml: mml,
                log: log,
                success: success
            });
            resp.write(out);
            console.log(log);
            phantom.exit(1);
        }
    } else {
        if ((typeof svgOrError) === 'string') {
            resp.statusCode = 200;
            resp.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
            resp.setHeader("Content-Length", utf8Strlen(svgOrError));
            resp.write(svgOrError);
            console.log(log);
        } else {
            resp.statusCode = 400;    // bad request
            resp.write(svgOrError[0]);
            console.log(num, log);
        }
        resp.close();
    }
    delete(activeRequests[num]);

    if (!(--requestsToServe)) {
        phantom.exit();
    }
}


// Parse the request and return an object with the parsed values.
// It will either have an error indication, e.g.
//   { num: 5, statusCode: 400, error: "message" }
// Or indicate that the test form should be returned, e.g.
//   { num: 5, testForm: 1 }
// or a valid request, e.g.
//   { num: 5, type: 'tex', q: 'n^2', width: '500' }
var parseRequest = function (req) {
    // Set any defaults here:
    var query = {
        num: requestNum++,
        type: 'tex',
        width: null,
        format: 'svg' //possible svg or json
    };

    // qs will store the content of the (tex or mml) math
    var qs, url, iq, paramStrings, numParamStrings, ps, ie, key, val;

    if (debug) {
        if (req.method == 'POST') {
            console.log("  req.postRaw = '" + req.postRaw + "'");
        } else {
            console.log("  req.url = '" + req.url + "'");
        }
    }

    if (req.method == 'GET') {
        url = req.url;

        if (url == '' || url == '/') {
            // User has requested the test form
            if (testForm == null && fs.isReadable(testFormFilename)) {
                testForm = fs.read(testFormFilename);  // set the global variable
            }
            if (testForm != null) {
                query.testForm = 1;
            } else {
                query.statusCode = 500;  // Internal server error
                query.error = "Can't find test form";
            }
            return query;
        }

        iq = url.indexOf("?");
        if (iq == -1) {  // no query string
            query.statusCode = 400;  // bad request
            query.error = "Missing query string";
            return query;
        }

        qs = url.substr(iq+1);
    } else if (req.method == 'POST') {
        if (typeof req.postRaw !== 'string') {   // which can happen
            query.statusCode = 400;  // bad request
            query.error = "Missing post content";
            return query;
        }
        qs = req.postRaw;
    } else {  // method is not GET or POST
        query.statusCode = 400;  // bad request
        query.error = "Method " + req.method + " not supported";
        return query;
    }

    paramStrings = qs.split(/&/);
    numParamStrings = paramStrings.length;

    for (var i = 0; i < numParamStrings; ++i) {
        ps = paramStrings[i];
        ie = ps.indexOf('=');
        if (ie == -1) {
            query.statusCode = 400;  // bad request
            query.error = "Can't decipher request parameter";
            return query;
        }
        key = ps.substr(0, ie);
        val = decodeURIComponent(ps.substr(ie+1).replace(/\+/g, ' '));
        if (key == 'type') {
            query.type = val;
        } else if (key == 'q') {
            query.q = val;
        } else if (key == 'width') {
            query.width = parseInt(val) || null;
        } else if (key == 'format') {
            query.format = val;
        } else {
            query.statusCode = 400;  // bad request
            query.error = "Unrecognized parameter name: " + key;
            return query;
        }
    }

    if (!query.q) {   // no source math
        query.statusCode = 400;  // bad request
        query.error = "No source math detected in input";
        return query;
    }

    return query;
}

var listenLoop = function () {
    // Set up the listener that will respond to every new request
    service = server.listen('0.0.0.0:' + port, function (req, resp) {
        var query = parseRequest(req);
        var requestNum = query.num;
        console.log(requestNum + ': ' + "received: " + req.method + " " +
                req.url.substr(0, 30) + " ..");

        if (query.testForm) {
            console.log(requestNum + ": returning test form");
            resp.write(testForm);
            resp.close();
        } else {
            if (query.error) {
                console.log(requestNum + ": error: " + query.error);
                resp.statusCode = query.statusCode;
                resp.write(query.error);
                resp.close();
            } else {
                // The following evaluates the function argument in the page's context,
                // with query -> _query. That, in turn, calls the process() function in
                // engine.js, which causes MathJax to render the math.  The callback is
                // PhantomJS's callPhantom() function, which in turn calls page.onCallback(),
                // above.  This just queues up the call, and will return at once.
                activeRequests[requestNum] = [resp, (new Date()).getTime()];
                page.evaluate(function (_query) {
                    window.engine.process(_query, window.callPhantom);
                }, query);
            }
        }
    });

    if (!service) {
        console.log("server failed to start on port " + port);
        phantom.exit(1);
    } else {
        console.log("PhantomJS started on port " + port);
    }
}

console.log("Loading bench page " + benchPage);
page.open(benchPage, listenLoop);
