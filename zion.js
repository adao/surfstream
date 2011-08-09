/**
 * Module dependencies.
 */

var _ = require('underscore')._,
	Backbone = require('backbone'),
	url = require('url'),
	express = require('express'),
	app = express.createServer(),
	io = require('socket.io').listen(app),
	redis = require('redis'),
	redisClient = redis.createClient();

require('jade');
	
/* Custom Modules */
var facebook = require('./facebook'),
	models = require('./public/models/models');
	m = require('./models/models2');

io.configure(function () {
	io.set('log level', 2); 
})


// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: "dklfj83298fhds" }));
  facebook.connect(app, express);
  app.use(app.router);
  app.use(require('stylus').middleware({ src: __dirname + '/public'}));
  app.use(express.static(__dirname + '/public'));
});
	
app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

require('./router.js').setupRoutes(app);

//chat model
var nodeChatModel = new models.NodeChatModel();

//backbone stuff
var currRoom = new m.Room(io,redisClient);


//chat tutorial stuff
function chatMessage(socket, msg){
	var chat = new models.ChatEntry({name: msg.name, text: msg.text, fbid: msg.id});
	
	redisClient.incr('next.chatentry.id', function(err, newId) {
		chat.set({id: newId});
		nodeChatModel.chats.add(chat);
		console.log('(' + socket.id + ') ' + chat.get('fbid') + ' ' + chat.get('name') + ': ' + chat.get('text'));

		redisClient.rpush('chatentries', chat.xport(), redis.print);
		redisClient.bgsave(function() { });
				
		io.sockets.emit('message', { event: 'chat', data: JSON.parse(chat.xport()) }); 
	}); 
}


io.sockets.on('connection', function(socket) {
	socket.on('message', function(msg) { chatMessage(socket, msg) }); 
	
	currRoom.connectSocket(socket);
});



app.listen(3000);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
