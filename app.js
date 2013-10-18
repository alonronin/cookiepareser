
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 80);
app.set('secret', 'magical secret cookiepareser');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());

var cookieParser = express.cookieParser(app.get('secret'));
app.use(cookieParser);

app.use(express.cookieSession({ cookie: { maxAge: 20 * 60 * 1000 }, key: 'connect.sess' }));

app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// starting server
var server = http.Server(app);

// initiating sockets
var io = require('socket.io').listen(server);

io.configure(function (){
    io.set('browser client minification', true);

    io.set('authorization', function (handshakeData, callback) {

        // inspired by https://github.com/wcamarao/session.socket.io
        function findCookie(handshake, key) {
            if (handshake) return (handshake.secureCookies && handshake.secureCookies[key])
                || (handshake.signedCookies && handshake.signedCookies[key])
                || (handshake.cookies && handshake.cookies[key]);
        }

        var handshake = {};
        handshake.headers = {};
        handshake.headers.cookie = handshakeData.headers.cookie;

        cookieParser(handshake, {}, function(err){
            // connect.sess is the default key for session cookie by express/connect middlware
            // can be changed using { key: 'your.key' } in the cookieSession options
            // see http://expressjs.com/api.html#cookieSession for more
            handshakeData.session = findCookie(handshake, 'connect.sess');
            callback(err, !err);
        });

    });
});

io.configure('development', function(){
    io.set('log level', 0);
});

io.configure('production', function(){
    io.set('log level', 0);
    io.set("transports", ["xhr-polling"]);
    io.set("polling duration", 10);
});

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

io.sockets.on('connection', function (socket) {
    socket.emit('message', socket.handshake);
});