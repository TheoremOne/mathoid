#!/usr/bin/env node

var cluster = require('cluster'),
    os      = require('os');
    port    = process.env.MATHOID_PORT || 10042;

if (cluster.isMaster) {
    var numCPUs = os.cpus().length;

    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', function (worker) {
        var exitCode;

        if (!worker.suicide) {
            exitCode = worker.process.exitCode;
            console.log('worker', worker.process.pid, 'died ('+exitCode+'), restarting.');
            cluster.fork();
        }
    });

    process.on('SIGTERM', function () {
        var workers = cluster.workers;

        console.log('master shutting down, killing workers');

        Object.keys(workers).forEach(function (id) {
            console.log('Killing worker ' + id);
            workers[id].destroy();
        });

        console.log('Done killing workers, bye');
        process.exit(1);
    });

    console.log('Starting Mathoid on port ' + port);
} else {
    var mathoidWorker = require('./mathoid-worker.js');

    process.on('SIGTERM', function() {
        console.log('Worker shutting down');
        process.exit(1);
    });

    mathoidWorker.listen(port);
}
