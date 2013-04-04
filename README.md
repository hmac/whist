Whist
=====

Whist is a popular trick-taking card game with many variants. This application attempts to implement a version of contract whist that I learned to play through friends. We're not exactly sure if it matches to a specfic named variant, but the closest might be [Oh, Hell](http://en.wikipedia.org/wiki/Oh_Hell).

The basis of this implementation is a node.js server, with communication to clients through WebSockets. The application is designed to host only one game - once the game is finished the app must be restarted to play again and all state is lost.