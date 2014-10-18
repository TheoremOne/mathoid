var system = require('system'),
    opts = require('minimist')(system.args.slice(1)),
    page = require('webpage').create(),
    system = require('system'),
    equation, usage;

usage = [
    'Usage: phantomjs mathjax.js [options]',
    'Options:',
    '  -h,--help                        Print this usage message and exit',
    '  -e,--equation=LATEXT/MathMML     LaTeX or MathMML equation to render',
].join('\n');

equation = opts.equation || opts.e;

if (opts.help || opts.h || !equation) {
    console.log(usage);
    phantom.exit(0);
}

var wait = function (checkFunction, readyFunction) {
    if (checkFunction()) {
        readyFunction();
    } else {
        setTimeout(function () {
            wait(checkFunction, readyFunction);
        }, 250)
    }
};

page.open('index.html', function () {
    wait(function () {
        return page.evaluate(function () {
            return document.getElementById('mathjax-loaded') != null;
        });
    }, function () {
        var out = page.evaluate(function (equation) {
            return window.engine.compileEquation(equation);
        }, equation);

        console.log(JSON.stringify(out));
        phantom.exit(0);
    });
});
