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
	
if (redisClient) {
	redisClient.get("userId", function(err, reply) {
		if (!reply) {
			redisClient.set("userId", 1);
		}
	});
}

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

RoomManager = Backbone.Model.extend({
	initialize: function() {
		this.roomMap = {};
		this.userToRoom = {};
	},
	
	sendRoomsInfo: function(socket, id) {
		if (redisClient) {
			redisClient.sinter("user:fb_id:" + id + ":fb_friends", "onlineUsers", function(err, reply) {
				var rooms = [];
				var friendsRooms = {};
				for (var index in reply) {
					friendsRooms[reply[index]] = roomManager.userToRoom[reply[index]];
					console.log(friendsRooms[reply[index]]);
				}
				for(var rName in roomManager.roomMap) {
					if(roomManager.roomMap.hasOwnProperty(rName)) {
						var currRoom = roomManager.roomMap[rName];
						rooms.push(currRoom.xport())
					}
				}
				var roomList = {};
				roomList.rooms = rooms;
				roomList.friendsRooms = friendsRooms;
				socket.emit('rooms:announce', roomList);
			});
		}
	},
	
	createRoom: function(socket, roomId) {
		console.log('[   zion   ][RoomMgr] createRoom(): socket '+socket.id+' is creating a room: '+roomId);
		this.roomMap[roomId] = new models.Room(io, redisClient);
		this.roomMap[roomId].set({ name: roomId });
		redisClient.set('room:'+roomId, this.roomMap[roomId].xport());
	},
	
	roomListForUser: function(friendIds) {
		
	}
});

var roomManager = new RoomManager();
var StagingUsers = {};

io.sockets.on('connection', function(socket) {
	
	socket.on("user:sendFBId", function(fbId) {
		if (redisClient) {
			//redisClient.get("user:" + fbId + ":fb_info", function(err, reply) {
			redisClient.get("user:fb_id:" + fbId, function(err, reply) {
				if (err) {
					console.log("Error trying to fetch user by Facebook id on initial login");
				} else {
					var fbUser = JSON.parse(reply);
					if (fbUser == null) {
						
					} else {
						roomManager.sendRoomsInfo(socket, fbId);
						var name = fbUser.name;
						var currUser = new models.User({
							name: name, 
							socketId: socket.id, 
							userId: fbUser.id, 
							socket: socket
					  });
						StagingUsers[socket.id] = currUser;
					}
					socket.emit("user:fbProfile", fbUser);
				}
			});
		}
	});
	
	socket.on('user:sendFBData', function(fbUser) {
		roomManager.sendRoomsInfo(socket, fbUser.id);
		if(redisClient) {
			redisClient.incr("userId", function(err, reply){
				redisClient.set("user:" + reply + ":fb_info", JSON.stringify(fbUser), function(err, reply) {
					if (err) {
						console.log("Error writing facebook user " + fbUser.id + " to Redids");
					}
				});
				redisClient.set("user:fb_id:" + fbUser.id, JSON.stringify(fbUser), function(err, reply) {
					if (err) {
						console.log("Error writing facebook user " + fbUser.id + " to Redids");
					}
				});
				var currUser = new models.User({
					name: fbUser.name, 
					socketId: socket.id, 
					userId: fbUser.id, 
					socket: socket
			  });
				StagingUsers[socket.id] = currUser;
			});
		}
		// redisClient.get('user:'+fbUser.id+':points', function(err, reply) {
		// 	if(reply) {
		// 		console.log("Points for "+fbUser.name+": "+reply);
		// 		if(StagingUsers[socket.id]) StagingUsers[socket.id].set({ points: reply});
		// 	}	
		// });
	});
	
	socket.on("user:sendUserFBFriends", function(data) {
		if (redisClient) {
			for (var i = 0; i < data.fbFriends.length; i++) {
				redisClient.sadd("user:fb_id:" + data.fbId + ":fb_friends", data.fbFriends[i]);
			}
		}
	});
	
	socket.on('room:join', function(data) {
		if(data.create == true) {	
			if(data.rID == '') {
				console.log("\n\n[   zion   ] [socket] [room:join]: user tried to create an empty room! returning")
				return;
			}
			roomManager.createRoom(socket, data.rID);
		} 
		if(redisClient) {
			redisClient.sadd("onlineUsers", data.id);
			roomManager.userToRoom[data.id] = data.rID;
		}
		if(data.currRoom && roomManager.roomMap[data.currRoom]) {
				console.log('curr room: '+data.currRoom);
				var user = roomManager.roomMap[data.currRoom].sockM.removeSocket(socket);
				if(user) {
					console.log('user '+user.get('name')+'is already in a room, leaving the room: '+data.currRoom);
					roomManager.roomMap[data.rID].connectUser(user);
				}
				return;
		}
		if(StagingUsers[socket.id]) {
			if(roomManager.roomMap[data.rID]) {
				roomManager.roomMap[data.rID].connectUser(StagingUsers[socket.id]);
				delete StagingUsers[socket.id];
			}
			else if(StagingUsers[socket.id] && StagingUsers[socket.id].get('userId')) {
				roomManager.sendRoomsInfo(socket, StagingUsers[socket.id].get('userId'));
				//TODO: notify them that this is not a room on the front end
			}
		}
	});
	
	socket.on('rooms:load', function(data) {
		roomManager.sendRoomsInfo(socket, data.id);
	});
});



app.listen(3000);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
