var system = require('system'),
    page = require('webpage').create(),
    server = require('webserver').create(),
    service;

var wait = function (checkFunction, readyFunction) {
    if (checkFunction()) {
        readyFunction();
    } else {
        setTimeout(function () {
            wait(checkFunction, readyFunction);
        }, 250)
    }
};

page.onConsoleMessage = function (msg) {
    console.log('PhantomJS Message:', msg);
};

page.onError = function (msg) {
    console.log('PhantomJS Message [Error]:', msg);
};

page.onCallback = function (data) {
    console.log('MathJax Loaded');
};

page.open('index.html');

service = server.listen(system.env.PORT || 6000, function (req, res) {
    var randId = parseInt(Math.random() * 1000000, 10),
        equation = req.post.math;

    console.log('Server Request (' + randId + '):', equation);

    page.evaluate(function (opts) {
        window.engine.compileEquation(opts.equation, opts.id);
    }, {equation: equation, id: randId});

    wait(function () {
        return page.evaluate(function (id) {
            return document.getElementById('output-' + id) != null;
        }, randId);
    }, function () {
        var out = page.evaluate(function (id) {
            return document.getElementById('output-' + id).value;
        }, randId);

        res.statusCode = 200;
        res.headers = {'Content-Type': 'application/json'};
        res.write(out);
        res.close()
    });
});
