Mathoid server
==============

Mathoid server is a service that uses MathJax and PhantomJS to create SVGs and
MathML on server side. Mathoid-server is a based on svgtex_.


Installation
------------

1. Install needed dependencies
   - nodejs_
   - npm_
   - phantomjs_
   - sinatra_

2. Checkout the repository::

   $ git checkout git@github.com:citrusbyte/mathoid.git

3. Install npm packages::

   $ cd mathoid && npm install

4. Run it with node::

   $ node mathoid.js

5. Query the service (check API details below).


API Description
---------------

The service listens on port ``10042`` by default, the port can be changed by
running it like::

    $ MATHOID_PORT=4000 node mathoid.js

Once running, hit the service using the different API endpoints.

* Get a json response with the original input, the MathML value and the SVG result::

    $ curl "http://localhost:10042/equation.json?math=x^2
    {"input":"x^2","mml":"<math xmlns=\"http://www.w3.org/1998/Math/MathML\">\n  <semantics>\n    <msup>\n      <mi>x</mi>\n      <mn>2</mn>\n    </msup>\n    <annotation encoding=\"application/x-tex\">x^2</annotation>\n  </semantics>\n</math>","svg":"<svg xmlns:xlink=\"http://www.w3.org/1999/xlink\" style=\"width: 2.375ex; height: 2.188ex; vertical-align: -0.313ex; margin-top: 1px; margin-right: 0px; margin-bottom: 1px; margin-left: 0px; position: static; \" viewBox=\"0 -878.0576086653176 1034.0889244992065 936.219033248529\" xmlns=\"http://www.w3.org/2000/svg\"><defs id=\"MathJax_SVG_glyphs\"><path id=\"MJMATHI-78\" stroke-width=\"10\" d=\"M52 289Q59 331 106 386T222 442Q257 442 286 424T329 379Q371 442 430 442Q467 442 494 420T522 361Q522 332 508 314T481 292T458 288Q439 288 427 299T415 328Q415 374 465 391Q454 404 425 404Q412 404 406 402Q368 386 350 336Q290 115 290 78Q290 50 306 38T341 26Q378 26 414 59T463 140Q466 150 469 151T485 153H489Q504 153 504 145Q504 144 502 134Q486 77 440 33T333 -11Q263 -11 227 52Q186 -10 133 -10H127Q78 -10 57 16T35 71Q35 103 54 123T99 143Q142 143 142 101Q142 81 130 66T107 46T94 41L91 40Q91 39 97 36T113 29T132 26Q168 26 194 71Q203 87 217 139T245 247T261 313Q266 340 266 352Q266 380 251 392T217 404Q177 404 142 372T93 290Q91 281 88 280T72 278H58Q52 284 52 289Z\"></path><path id=\"MJMAIN-32\" stroke-width=\"10\" d=\"M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z\"></path></defs><g stroke=\"black\" fill=\"black\" stroke-width=\"0\" transform=\"matrix(1 0 0 -1 0 0)\"><use href=\"#MJMATHI-78\" xlink:href=\"#MJMATHI-78\"></use><use transform=\"scale(0.7071067811865476)\" href=\"#MJMAIN-32\" x=\"816\" y=\"513\" xlink:href=\"#MJMAIN-32\"></use></g></svg>"}

* The same, but input MML (parameter type=mml is mandatory)::

    $ curl "http://math-local.flatworldknowledge.com:9393/equation.json?math=<math><msup><mi>x</mi><mn>2</mn></msup></math>&type=mml"
    {"input":"<math><msup><mi>x</mi><mn>2</mn></msup></math>","mml":"<math><msup><mi>x</mi><mn>2</mn></msup></math>","svg":"<svg xmlns:xlink=\"http://www.w3.org/1999/xlink\" style=\"width: 2.375ex; height: 2.188ex; vertical-align: -0.313ex; margin-top: 1px; margin-right: 0px; margin-bottom: 1px; margin-left: 0px; position: static; \" viewBox=\"0 -878.0576086653176 1034.0889244992065 936.219033248529\" xmlns=\"http://www.w3.org/2000/svg\"><defs id=\"MathJax_SVG_glyphs\"><path id=\"MJMATHI-78\" stroke-width=\"10\" d=\"M52 289Q59 331 106 386T222 442Q257 442 286 424T329 379Q371 442 430 442Q467 442 494 420T522 361Q522 332 508 314T481 292T458 288Q439 288 427 299T415 328Q415 374 465 391Q454 404 425 404Q412 404 406 402Q368 386 350 336Q290 115 290 78Q290 50 306 38T341 26Q378 26 414 59T463 140Q466 150 469 151T485 153H489Q504 153 504 145Q504 144 502 134Q486 77 440 33T333 -11Q263 -11 227 52Q186 -10 133 -10H127Q78 -10 57 16T35 71Q35 103 54 123T99 143Q142 143 142 101Q142 81 130 66T107 46T94 41L91 40Q91 39 97 36T113 29T132 26Q168 26 194 71Q203 87 217 139T245 247T261 313Q266 340 266 352Q266 380 251 392T217 404Q177 404 142 372T93 290Q91 281 88 280T72 278H58Q52 284 52 289Z\"></path><path id=\"MJMAIN-32\" stroke-width=\"10\" d=\"M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z\"></path></defs><g stroke=\"black\" fill=\"black\" stroke-width=\"0\" transform=\"matrix(1 0 0 -1 0 0)\"><use href=\"#MJMATHI-78\" xlink:href=\"#MJMATHI-78\"></use><use transform=\"scale(0.7071067811865476)\" href=\"#MJMAIN-32\" x=\"816\" y=\"513\" xlink:href=\"#MJMAIN-32\"></use></g></svg>"}

* Get just the SVG (ready to include in a <img> tag)::

    $ curl "http://localhost:10042/equation.svg?math=x^2
    <svg xmlns:xlink="http://www.w3.org/1999/xlink" style="width: 2.375ex; height: 2.188ex; vertical-align: -0.313ex; margin-top: 1px; margin-right: 0px; margin-bottom: 1px; margin-left: 0px; position: static; " viewBox="0 -878.0576086653176 1034.0889244992065 936.219033248529" xmlns="http://www.w3.org/2000/svg"><defs id="MathJax_SVG_glyphs"><path id="MJMATHI-78" stroke-width="10" d="M52 289Q59 331 106 386T222 442Q257 442 286 424T329 379Q371 442 430 442Q467 442 494 420T522 361Q522 332 508 314T481 292T458 288Q439 288 427 299T415 328Q415 374 465 391Q454 404 425 404Q412 404 406 402Q368 386 350 336Q290 115 290 78Q290 50 306 38T341 26Q378 26 414 59T463 140Q466 150 469 151T485 153H489Q504 153 504 145Q504 144 502 134Q486 77 440 33T333 -11Q263 -11 227 52Q186 -10 133 -10H127Q78 -10 57 16T35 71Q35 103 54 123T99 143Q142 143 142 101Q142 81 130 66T107 46T94 41L91 40Q91 39 97 36T113 29T132 26Q168 26 194 71Q203 87 217 139T245 247T261 313Q266 340 266 352Q266 380 251 392T217 404Q177 404 142 372T93 290Q91 281 88 280T72 278H58Q52 284 52 289Z"></path><path id="MJMAIN-32" stroke-width="10" d="M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z"></path></defs><g stroke="black" fill="black" stroke-width="0" transform="matrix(1 0 0 -1 0 0)"><use href="#MJMATHI-78" xlink:href="#MJMATHI-78"></use><use transform="scale(0.7071067811865476)" href="#MJMAIN-32" x="816" y="513" xlink:href="#MJMAIN-32"></use></g></svg>

* Get just the MathML::

    $ curl "http://localhost:10042/equation.mml?math=x^2
    <math xmlns="http://www.w3.org/1998/Math/MathML">
      <semantics>
        <msup>
          <mi>x</mi>
          <mn>2</mn>
        </msup>
        <annotation encoding="application/x-tex">x^2</annotation>
      </semantics>
    </math>

.. _svgtex: https://github.com/agrbin/svgtex
.. _nodejs: http://nodejs.org/
.. _phantomjs:  http://www.phantomjs.org/
.. _npm: https://www.npmjs.org/
.. _sinatra: http://sinatrarb.com/
