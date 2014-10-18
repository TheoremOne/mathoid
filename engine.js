window.engine = (function () {
    MathJax.Hub.Queue(function () {
        var loaded = document.createElement('span');
        loaded.setAttribute('id', 'mathjax-loaded');
        loaded.innerHTML = 'MathJax Ready';
        document.getElementsByTagName('body')[0].appendChild(loaded);
    });

    this.getSvg = function () {
        var origDefs, defs, uses, i, id, tmpDiv;

        origDefs = document.getElementById('MathJax_SVG_Hidden').nextSibling.childNodes[0];
        defs = origDefs.cloneNode(false);

        svg = input.querySelector('svg');
        svg.insertBefore(defs, svg.childNodes[0]);
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        uses = svg.getElementsByTagName('use');

        havePaths = {};
        for (i = 0; i < uses.length; ++i) {
            id = uses[i].getAttribute('href');
            if (!havePaths[id]) {
                defs.appendChild(document.getElementById(id.substr(1)).cloneNode(true));
                havePaths[id] = true;
            }
            uses[i].setAttribute('xlink:href', id);
        }

        svg.style.position = 'static';

        tmpDiv = document.createElement('div');
        tmpDiv.appendChild(svg);
        return tmpDiv.innerHTML;
    };

    this.compileEquation = function (equation) {
        var input = document.getElementById('input'),
            output = null;

        input.innerHTML = equation;

        MathJax.Hub.Typeset(input, function () {
            var mml;

            mml = MathJax.Hub.getAllJax(input)[0].root.toMathML('');

            if (mml.indexOf('<mtext mathcolor="red">') == -1) {
                output = {
                    success: true,
                    input: equation,
                    mml: mml,
                    svg: getSvg()
                };
            } else {
                output = {success: false, input: equation};
            }
        });

        return output;
    };

    return this;
}());
