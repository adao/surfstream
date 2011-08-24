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

//backbone stuff
//var currRoom = new m.Room(io,redisClient);

RoomManager = Backbone.Model.extend({
	initialize: function() {
		this.roomMap = {};
	},
	
	sendRoomsInfo: function(socket, id) {
		// var roomsInfo = [];
		if (redisClient) {
			redisClient.sinter("user:" + id + ":fb_friends", "onlineFacebookUsers", function(err, reply) {
				console.log("WTF");
				console.log(reply);
				var rooms = [];
				var friendsRooms = {};
				for (var index in reply) {
					friendsRooms[reply[index]] = userManager.ssIdToRoom[reply[index]];
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
		console.log('[RoomMgr] createRoom(): socket '+socket.id+' is creating a room: '+roomId);
		this.roomMap[roomId] = new models.Room(io, redisClient);
		this.roomMap[roomId].set({ name: roomId });
		redisClient.set('room:'+roomId, this.roomMap[roomId].xport());
		//delete StagingUsers[socket.id];
	},
	
	roomListForUser: function(friendIds) {
		
	}
});

UserManager = Backbone.Model.extend({
	initialize: function() {
		//ssId to {user: userModel, roomInfo}
		this.ssIdToRoom = {};
		this.ssIdToUserProfile = {};
	}
});

var roomManager = new RoomManager();
var userManager = new UserManager();
var StagingUsers = {};

io.sockets.on('connection', function(socket) {
	
	socket.on("user:sendFBId", function(fbId) {
		if (redisClient) {
			//redisClient.get("user:" + fbId + ":fb_info", function(err, reply) {
			redisClient.get("user:fb_id:" + fbId + ":profile", function(err, reply) {
				if (err) {
					console.log("Error trying to fetch user by Facebook id on initial login");
				} else {
					var ssUser = JSON.parse(reply);
					if (ssUser == null || ssUser == 'undefined') {
						
					} else {
						roomManager.sendRoomsInfo(socket, ssUser.ssId);
						var name = ssUser.name;
						var currUser = new models.User({
							name: name, 
							socketId: socket.id, 
							userId: ssUser.ssId, 
							socket: socket
					  });
						currUser.initializeAndSendPlaylists(socket);
						StagingUsers[socket.id] = currUser; 
						console.log(ssUser.ssId);
					}
					socket.emit("user:profile", ssUser);
				}
			});
		}
	});
	
	socket.on('user:sendFBData', function(fbUser) {
		if(redisClient) {
			redisClient.incr("userId", function(err, reply){
				var ssUser = fbUser;
				ssUser.ssId = reply;
				socket.emit("user:profile", ssUser);
				roomManager.sendRoomsInfo(socket, ssUser.ssId);
				var stringSSUser = JSON.stringify(ssUser);
				redisClient.set("user:" + ssUser.ssId + ":profile", stringSSUser, function(err, reply) {
					if (err) {
						console.log("Error writing ss user " + ssUser.ssId + " to Redis");
					}
				});
				redisClient.set("user:fb_id:" + fbUser.id + ":profile", stringSSUser, function(err, reply) {
					if (err) {
						console.log("Error writing facebook user " + fbUser.id + " to Redis");
					}
				});
				var currUser = new models.User({
					name: ssUser.name, 
					socketId: socket.id, 
					userId: ssUser.ssId, 
					socket: socket
			  });
				StagingUsers[socket.id] = currUser;
				var defaultPlaylist = new models.Playlist({name: "defaultList"});
				var facebookPlaylist = new models.Playlist({name: "myFacebookWall"});
				redisClient.hmset("user:" + reply + ":playlists", 1, JSON.stringify(defaultPlaylist), 2, JSON.stringify(facebookPlaylist), function(err, reply) {
					if (err) {
						console.log("Error writing ss user's default playlists " + ssUser.ssId + " to Redis");
					} else {
						currUser.initializeAndSendPlaylists(socket);
					}
				});
			});
		}
	});
	
	socket.on("user:sendUserFBFriends", function(data) {
		if (redisClient) {
			for (var i = 0; i < data.fbFriends.length; i++) {
				redisClient.sadd("user:" + data.ssId + ":fb_friends", data.fbFriends[i]);
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
			redisClient.sadd("onlineFacebookUsers", data.id);
			userManager.ssIdToRoom[data.id] = data.rID;
		}
		if(data.currRoom) {
				console.log('curr room: '+data.currRoom);
				var user = roomManager.roomMap[data.currRoom].sockM.removeSocket(socket);
				if(user) {
					console.log('user '+user.get('name')+'is already in a room, leaving the room: '+data.currRoom);
					roomManager.roomMap[data.rID].connectUser(user);
				}
				return;
		}
		if(StagingUsers[socket.id]) {
			roomManager.roomMap[data.rID].connectUser(StagingUsers[socket.id]);
		 	delete StagingUsers[socket.id];
		}
	});
	
	socket.on('rooms:load', function(data) {
		roomManager.sendRoomsInfo(socket, data.id);
	});
});



app.listen(3000);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
