var VERSION = '0.1-dev';

var fs = require('fs'),
    system = require('system'),
    opts = require('minimist')(system.args.slice(1)),
    server = require('webserver').create(),
    page = require('webpage').create();

var port = 16000;
var requestsToServe = -1;
var benchPage = 'index.html';
var debug = false;

// activeRequests holds information about any active MathJax requests.  It is
// a hash, with a sequential number as the key.  requestNum gets incremented
// for *every* HTTP request, but only requests that get passed to MathJax have an
// entry in activeRequests.  Each element of activeRequests
// is an array of [<response object>, <start time>].
var requestNum = 0;
var activeRequests = {};
var service = null;

var usage = [
    'Usage: phantomjs main.js [options]',
    'Options:',
    '  -h,--help            Print this usage message and exit',
    '  -v,--version         Print the version number and exit',
    '  -p,--port <port>     IP port on which to start the server',
    '  -r,--requests <num>  Process this many requests and then exit.  -1 means ',
    '                       never stop.',
    '  -b,--bench <page>    Use alternate bench page (default is index.html)',
    '  -d,--debug           Enable verbose debug messages'
].join('\n');

if (opts.help || opts.h) {
    console.log(usage);
    phantom.exit(0);
}

if (opts.version) {
    console.log('svgtex version ' + VERSION);
    phantom.exit(0);
}

if (opts.port || opts.p) {
    port = parseInt(opts.port || opts.p, 10);
}

if (opts.requests || opts.r) {
    requestsToServe = parseInt(opts.requests || opts.r, 10);
}

if (opts.bench || opts.b) {
    benchPage = opts.bench || opts.b;
}

if (opts.debug || opts.d) {
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
        svg = data[1],
        mml = data[2],
        num = query.num,
        src = query.math,
        record = activeRequests[num],
        resp = record[0],
        header;

    if (typeof svg === 'string') {
        if (query.type == 'mml'){
            mml = src;
        }

        out = JSON.stringify({input: src, mml: mml, svg: svg});
        resp.statusCode = 200;
        resp.setHeader('Content-Type', 'application/json');
        resp.setHeader('Content-Length', utf8Strlen(out).toString());
        resp.write(out);
    } else {
        // svg is not an string, it's an error list instead
        out = JSON.stringify({input: src, mml: mml, error: svg[0]});
        resp.statusCode = 400;
        resp.setHeader('Content-Type', 'application/json');
        resp.setHeader('Content-Length', utf8Strlen(out).toString());
        resp.write(out);
        phantom.exit(1);
    }

    delete activeRequests[num];

    if (--requestsToServe == 0) {
        phantom.exit();
    }
}


var parseRequest = function (req) {
    var query = {
        math: null,
        num: requestNum++,
        type: 'tex',
        width: null,
        format: 'json' // or svg
    };

    if (req.method != 'POST') {
        query.statusCode = 405;
        query.error = 'Method not allowed';
        return query;
    }

    if (typeof req.postRaw !== 'string') {
        query.statusCode = 400;
        query.error = 'Missing post content';
        return query;
    }

    qs = JSON.parse(req.postRaw);
    query.math = qs.math || query.math;
    query.type = qs.type || query.type;
    query.format = qs.format || query.format;

    if (!query.math) {
        query.statusCode = 400;
        query.error = 'Missing source math';
        return query;
    }

    return query;
}

var listenLoop = function () {
    // Set up the listener that will respond to every new request
    service = server.listen('0.0.0.0:' + port, function (req, resp) {
        var query = parseRequest(req);
        var requestNum = query.num;

        if (query.error) {
            resp.statusCode = query.statusCode;
            resp.write(query.error);
            resp.close();
        } else {
            // The following evaluates the function argument in the page's context,
            // with query -> _query. That, in turn, calls the process() function in
            // engine.js, which causes MathJax to render the math.  The callback is
            // PhantomJS's callPhantom() function, which in turn calls page.onCallback(),
            // above. This just queues up the call, and will return at once.
            activeRequests[requestNum] = [resp, (new Date()).getTime()];
            page.evaluate(function (_query) {
                window.engine.process(_query, window.callPhantom);
            }, query);
        }
    });

    if (!service) {
        phantom.exit(1);
    }
}

page.open(benchPage, listenLoop);
