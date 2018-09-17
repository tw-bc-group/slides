<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Shower Presentation Engine</title>

    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="node_modules/shower-ribbon/styles/styles.css">

    <style>
      .shower {
        --slide-ratio: calc(16 / 9);
      }
    </style>
  </head>

  <body class="shower list">
    <header class="caption">
      <h1>Shower Presentation Engine</h1>
      <p>Yours Truly, Famous Inc.</p>
    </header>

    <%= slides %>

    <footer class="badge">
      <a href="https://github.com/shower/shower">Fork me on GitHub</a>
    </footer>

    <div class="progress"></div>

    <script src="node_modules/shower-core/shower.min.js"></script>
    <!-- Copyright © 2018 Yours Truly, Famous Inc. -->
  </body>
</html>