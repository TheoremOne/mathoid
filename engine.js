window.engine = (function () {
    MathJax.Hub.Register.StartupHook('TeX Jax Ready', function () {
      MathJax.Hub.Insert(MathJax.InputJax.TeX.Definitions.macros, {
        cancel:   ['Extension', 'cancel'],
        bcancel:  ['Extension', 'cancel'],
        xcancel:  ['Extension', 'cancel'],
        cancelto: ['Extension', 'cancel']
      })
    });

    MathJax.Hub.Queue(function () {
        if (typeof window.callPhantom == 'function') {
            window.callPhantom({loaded: true});
        }
    });

    this.getSvg = function (input) {
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

    this.compileEquation = function (equation, id) {
        var input;

        console.log("Got equation (" + id + "):", equation);

        input = document.createElement('div');
        input.setAttribute('id', 'input-' + id);
        input.innerHTML = equation;
        document.getElementsByTagName('body')[0].appendChild(input);

        console.log("Created node (" + id + ")");

        MathJax.Hub.Typeset(input, function () {
            var mml, ret, output, error;

            try {
                mml = MathJax.Hub.getAllJax(input)[0].root.toMathML('');
                mml = mml.split().join(' ');
                error = mml.indexOf('<mtext mathcolor="red">') >= 0;
            } catch (err) {
                error = true;
                console.log("Error (" + id + "):", err.toString());
            }

            if (error) {
                ret = {success: false, input: equation};
            } else {
                try {
                    ret = {success: true, input: equation, mml: mml, svg: getSvg(input)};
                } catch (err) {
                    ret = {success: false, input: equation};
                }
            }

            output = document.createElement('textarea');
            output.setAttribute('id', 'output-' + id);
            output.value = JSON.stringify(ret);
            document.getElementsByTagName('body')[0].appendChild(output);
        });
    };

    return this;
}());
