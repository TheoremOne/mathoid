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
    app;

var startBackend = function (cb) {
    if (backend) {
        backend.removeAllListeners();
        backend.kill('SIGKILL');
    }

    backendPort = Math.floor(9000 + Math.random() * 50000);
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

var handleRequest = function (req, res, q, type) {
    // Do the backend request
    var reqBody = new Buffer(querystring.stringify({q: q, type: type, format: 'json'}));

    options = {
        method: 'POST',
        uri: 'http://localhost:' + backendPort.toString() + '/',
        body: reqBody,
        // Work around https://github.com/ariya/phantomjs/issues/11421 by setting
        // explicit upper-case headers (request sends them lowercase by default)
        // and manually encoding the body.
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

app.get('/', function(req, res){
    if (!q) {
        res.writeHead(405);
        return res.end(JSON.stringify({error: 'Use POST method'}));
    }
});

app.post(/^\/$/, function (req, res) {
    var q = req.body.q,
        type = req.body.type || 'tex';

    // First some rudimentary input validation
    if (!q) {
        res.writeHead(400);
        return res.end(JSON.stringify({error: 'q (query) post parameter is missing!'}));
    }

    requestQueue.push(handleRequest.bind(null, req, res, q, type));

    // phantomjs only handles one request at a time. Enforce this.
    if (requestQueue.length === 1) {
        // Start this process
        handleRequests();
    }
});

module.exports = app;
