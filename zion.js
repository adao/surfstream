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
	m = require('./models/237');

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
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

require('./router.js').setupRoutes(app);

//backbone stuff
//var currRoom = new m.Room(io,redisClient);

RoomManager = Backbone.Model.extend({
	initialize: function() {
		this.roomMap = {};
	},
	
	sendRoomsInfo: function(socket) {
		var roomsInfo = [];
		for(var rName in this.roomMap) {
			if(this.roomMap.hasOwnProperty(rName)) {
				var currRoom = this.roomMap[rName];
				roomsInfo.push(currRoom.xport())
			}
		}
		socket.emit('rooms:announce', roomsInfo);
	},
	
	createRoom: function(socket, roomId) {
		this.roomMap[roomId] = new models.Room(io, redisClient);
		this.roomMap[roomId].set({ name: roomId });
		redisClient.set('room:'+roomId, this.roomMap[roomId].xport());
		//delete StagingUsers[socket.id];
	}
});

var roomManager = new RoomManager();
var StagingUsers = {};

io.sockets.on('connection', function(socket) {
	
	socket.on('user:sendFBData', function(fbUser) {
		roomManager.sendRoomsInfo(socket);
		var name = fbUser.user.name;
		var currUser = new models.User({
			name: name, 
			socketId: socket.id, 
			userId: fbUser.user.id, 
			socket: socket
	  });
		StagingUsers[socket.id] = currUser;
	
		if(redisClient) {
			redisClient.set('user:'+fbUser.user.id+':fb_info', JSON.stringify(fbUser)); 
		}
		// redisClient.get('user:'+fbUser.user.id+':points', function(err, reply) {
		// 	if(reply) {
		// 		console.log("Points for "+fbUser.user.name+": "+reply);
		// 		if(StagingUsers[socket.id]) StagingUsers[socket.id].set({ points: reply});
		// 	}	
		// });
	});
	
	socket.on('room:join', function(data) {
		if(data.create == true) {
			roomManager.createRoom(socket, data.rID);
		} 
		roomManager.roomMap[data.rID].connectUser(StagingUsers[socket.id]);
		if(StagingUsers[socket.id]) delete StagingUsers[socket.id];
	});
});





app.listen(3000);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
