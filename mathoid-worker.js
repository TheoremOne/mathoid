var cluster       = require('cluster'),
    child_process = require('child_process'),
    express       = require('express'),
    cors          = require('cors'),
    request       = require('request'),
    querystring   = require('querystring');

var instanceName = cluster.isWorker ? 'worker(' + process.pid + ')' : 'master';

var backendStarting = false,
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
    backend = child_process.spawn('phantomjs', ['main.js', '-p', backendPort, '-r', 10]);
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

var handleRequest = function (opts) {
    var reqBody = new Buffer(JSON.stringify({math: opts.math, type: opts.type, format: 'json'}));

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

    request(options, function (error, response, body) {
        var errBuf;

        // Remove request from queue
        requestQueue.shift();
        if (error || response.statusCode !== 200) {
            error = error ? {error: error.toString()} : JSON.parse(body);
            opts.callback(error, true)
        } else {
            opts.callback(JSON.parse(body), false)
        }

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
app.use(cors());

var handleClientRequest = function (req, res, responseCallback) {
    var math = req.param('math'),
        type = req.param('type') || 'tex';

    // First some rudimentary input validation
    if (!math) {
        res.writeHead(400);
        return res.end(JSON.stringify({error: 'math parameter is missing!'}));
    }

    requestQueue.push(handleRequest.bind(null, {
        math: math,
        type: type,
        callback: responseCallback
    }));

    // phantomjs only handles one request at a time. Enforce this.
    if (requestQueue.length === 1) {
        // Start this process
        handleRequests();
    }
};

app.all('/equation.json', function(req, res) {
    return handleClientRequest(req, res, function (body, isError) {
        var buffer = new Buffer(JSON.stringify(body)),
            statusCode = isError ? 500 : 200;

        res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'Content-Length': buffer.length
        });
        res.end(buffer);
    });
});

app.all('/equation.svg', function(req, res) {
    return handleClientRequest(req, res, function (body, isError) {
        var buffer = new Buffer(isError ? body.error : body.svg),
            statusCode = isError ? 500 : 200,
            contentType = isError ? 'text/html; charset=utf-8' :
                                    'image/svg+xml; charset=utf-8';

        res.writeHead(statusCode, {
            'Content-Type': contentType,
            'Content-Length': buffer.length
        });
        res.end(buffer);
    });
});

app.all('/equation.mml', function(req, res) {
    return handleClientRequest(req, res, function (body, isError) {
        var buffer = new Buffer(isError ? body.error : body.mml),
            statusCode = isError ? 500 : 200,
            contentType = isError ? 'text/html; charset=utf-8' :
                                    'text/mml; charset=utf-8';

        res.writeHead(statusCode, {
            'Content-Type': contentType,
            'Content-Length': buffer.length
        });
        res.end(buffer);
    });
});

app.all('/equation.html', function(req, res) {
    return handleClientRequest(req, res, function (body, isError) {
        var buffer, statusCode, html, wrapper, attrs;

        if (isError) {
            statusCode = 500;
            buffer = new Buffer(body.error);
        } else {
            statusCode = 200;
            wrapper = req.param('wrapper') || 'span';
            attrs = [];

            if (req.param('type') != 'mml') {
                attrs.push('data-condition="' + body.input + '"');
            }
            if (body.mml) {
                attrs.push('data-mml="' + body.mml + '"');
            }

            attrs = attrs.join(' ');
            html = '<' + wrapper + ' ' + attrs + '>' + body.svg + '</' + wrapper + '>';
            buffer = new Buffer(html);
        }

        res.writeHead(statusCode, {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': buffer.length
        });
        res.end(buffer);
    });
});

module.exports = app;
