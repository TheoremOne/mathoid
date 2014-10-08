var cluster       = require('cluster'),
    child_process = require('child_process'),
    express       = require('express'),
    request       = require('request'),
    querystring   = require('querystring');

var instanceName = cluster.isWorker ? 'worker(' + process.pid + ')' : 'master';

var restarts = 10,
    backendStarting = false,
    requestQueue = [],
    backend,
    backendPort,
    backendURL,
    app;

var startBackend = function (cb) {
    if (backend) {
        backend.removeAllListeners();
        backend.kill('SIGKILL');
    }

    backendPort = Math.floor(9000 + Math.random() * 50000);
    backendURL = 'http://localhost:' + backendPort.toString() + '/';
    console.error(instanceName + ': Starting backend on port ' + backendPort);
    backend = child_process.spawn('phantomjs', ['main.js', '-p', backendPort]);
    backend.stdout.pipe(process.stderr);
    backend.stderr.pipe(process.stderr);
    backend.on('close', startBackend);
    backendStarting = true;

    // Give backend 1 seconds to start up
    setTimeout(function () {
        backendStarting = false;
        handleRequests();
    }, 1000);
};

var handleRequest = function (req, res, q, type, opts) {
    var reqBody;

    opts = opts || {}
    reqBody = new Buffer(JSON.stringify({
        q: q,
        type: type,
        format: opts.format || 'json'
    }));

    options = {
        method: 'POST',
        uri: backendURL,
        body: reqBody,
        headers: {
            'Content-Length': reqBody.length,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 2000
    };

    request(options, function (err, response, body) {
        var errBuf;

        try {
            body = new Buffer(body);
        } catch (e) {
            body = new Buffer(e.message.toString());
        }

        if (err || response.statusCode !== 200) {
            if (err) {
                errBuf = new Buffer(JSON.stringify({
                    tex: q,
                    log: err.toString(),
                    success: false
                }));
            } else {
                errBuf = body;
            }

            res.writeHead(500, {
                'Content-Type': 'application/json',
                'Content-Length': errBuf.length
            });
            res.end(errBuf);

            // don't retry the request
            requestQueue.shift();
            startBackend();
            return handleRequests();
        }
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-length': body.length
        });
        res.end(body);
        requestQueue.shift();
        handleRequests();
    });
}

var handleRequests = function () {
    // Call the next request on the queue
    if (!backendStarting && requestQueue.length) {
        requestQueue[0]();
    }
};

startBackend();

/* -------------------- Web service --------------------- */

app = express.createServer();

// Increase the form field size limit from the 2M default.
app.use(express.bodyParser({maxFieldsSize: 25 * 1024 * 1024}));
app.use(express.limit('25mb'));

var handleClientRequest = function (req, res, opts) {
    var q = req.param('q'),
        type = req.param('type') || 'tex';

    // First some rudimentary input validation
    if (!q) {
        res.writeHead(400);
        return res.end(JSON.stringify({error: 'q (query) parameter is missing!'}));
    }

    requestQueue.push(handleRequest.bind(null, req, res, q, type, opts));

    // phantomjs only handles one request at a time. Enforce this.
    if (requestQueue.length === 1) {
        // Start this process
        handleRequests();
    }
};

app.all('/', function(req, res) {
    return handleClientRequest(req, res);
});

app.all('/svg', function(req, res) {
    return handleClientRequest(req, res, {svg: true});
});


module.exports = app;
