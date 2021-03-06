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
			redisClient.set("userId", 1, function(err, reply) {

			});
		}
	});
	redisClient.sinterstore("onlineFacebookUsers", "onlineFacebookUsers", "emptySet");
}

require('jade');
	
/* Custom Modules */
var facebook = require('./facebook'),
	models = require('./models/237');

io.configure(function () {
	io.set('log level', 2); 
})

process.on('uncaughtException', function (err) {
  console.log('\n****			CRASH REPORT			****');
	console.log(new Date())
	console.error(err)
	console.log('Stack trace: '+err.stack)
  console.log("Node NOT Exiting...\n\n");
});

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
	app.set('view options', {
		layout: false
	});
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
	app.enable("production");
});

require('./router.js').setupRoutes(app);

var PROMO_CODES = [];

var adminSUB = redis.createClient();

adminSUB.on('ready', function() {
	console.log('subscribing to admin');
	adminSUB.subscribe('admin');
})

adminSUB.on('message', function(channel, message) {
	console.log('received message from channel: '+channel+' with message: '+message)
	message = JSON.parse(message)
	
	switch(message.type) {
		case 'room:delete': 		
			console.log('\n[PUBSUB] received request to delete room: '+message.room);
			if(roomManager.roomMap[message.room]) {
				delete roomManager.roomMap[message.room];
			}
			break;
		case 'room:add':
			console.log('\n[PUBSUB] received request to add room: '+JSON.stringify(message))
			if(message.roomId && !roomManager.roomMap[message.roomId]) {
				console.log('...passed check, making room')
				roomManager.createRoom(message.roomId, message.trueName, true);
			}
			break;
		case 'room:rename':
			console.log('\n[PUBSUB] received request to rename room: '+message.oldName+ ' --> '+message.newName + ' with roomId: '+message.roomId)
			if(roomManager.roomMap[message.oldName] && !roomManager.roomMap[message.roomId])
				roomManager.renameRoom(message.oldName, message.newName, message.roomId);
			break;
		case 'promo:make':
			if(message.promo) {
				if (_.indexOf(PROMO_CODES, message.promo) == -1) {
					PROMO_CODES.push(message.promo);
					console.log("[PUBSUB][PROMO_TOOLS] add promo " + message.promo + " to the promo code list")
					console.log("[PUBSUB][PROMO_TOOLS] PROMO_CODES is now " + PROMO_CODES);
				} else {
					console.log("[PUBSUB][PROMO_TOOLS] could not add promo code because it already exists in PROMO_CODES");
				}
			} else {
				console.log("[PUBSUB][PROMO_TOOLS] no promo code sent for addition!");
			}
			break;
		case 'promo:delete':
			if(message.promo) {
				var ind = _.indexOf(PROMO_CODES, message.promo);
				if (ind != -1) {
					PROMO_CODES.splice(ind, 1); 
						console.log("[PUBSUB][PROMO_TOOLS] removed " + message.promo + " from promo code list");
						console.log("[PUBSUB][PROMO_TOOLS] PROMO_CODES is now " + PROMO_CODES);
				} else {
					console.log("[PUBSUB][PROMO_TOOLS] could not delete promo code because it doesn't exist yet in PROMO_CODES");
				}				
			} else {
				console.log("[PUBSUB][PROMO_TOOLS] no promo code sent for deletion!");
			}
			break;
		default:
			console.log('\n[PUBSUB] received unknown message type: '+message.type);
			break;
	}
});

RoomManager = Backbone.Model.extend({
	initialize: function() {
		
		this.roomMap = {};
		
		var roomMgr = this;
		redisClient.lrange('rooms',0,-1, function(err, rooms) {
			if(rooms) { 
				console.log('[   zion    ][RoomManager] initialize(): fetching rooms from redis...'+rooms)
				_.each(rooms, function(roomId) {
					//roomMgr.roomMap[roomId] = new models.Room(io, redisClient);
					//roomMgr.roomMap[roomId].set({ name: roomId });
					roomMgr.roomMap[roomId] = new models.Room(io, roomId);
					redisClient.get('room:'+roomId, function(err, reply) {
						if(err) return;
						console.log("...getting specific room's info: "+reply)
						if(!reply) return;
						
						var rawRoom = JSON.parse(reply);
						if(rawRoom.roomName) {
							console.log('...the room name is '+rawRoom.roomName)
							roomMgr.roomMap[roomId].set({ trueName: rawRoom.roomName });
						}
					})
				});
			}
		});
		redisClient.lrange('promo',0,-1, function(err, codes) {
			if (err) {
				console.log("problem fetching error codes");
			} else {
				if (codes) {
					console.log("promo codes received");
					_.each(codes, function(code){
						console.log("promo code: " + code);
						PROMO_CODES.push(code);
					});
				}
			}
		});
	},
	
	sendRoomsInfo: function(socket, id) {
		if (redisClient) {
			redisClient.sinter("user:" + id + ":fb_friends", "onlineFacebookUsers", function(err, reply) {
				var rooms = [];
				var friendsRooms = {};
				for (var index in reply) {
					friendsRooms[reply[index]] = userManager.fbIdToRoom[reply[index]];
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
	
	createRoom: function(roomId, roomName, fromAdmin) {
		if(this.roomMap[roomId]) return;
		console.log('[   zion   ][RoomMgr] createRoom(): a room is being created: '+roomId);
		this.roomMap[roomId] = new models.Room(io, redisClient);
		this.roomMap[roomId].set({ name: roomId, trueName: roomName });
		if(!fromAdmin) {
			this.roomMap[roomId].set({ valstream: 0 });
			redisClient.rpush('rooms', roomId);	//list of all rooms
		} else {
			this.roomMap[roomId].set({ valstream: 1 });
		}
		redisClient.set('room:'+roomId, JSON.stringify(this.roomMap[roomId].xport()), function(err, reply) {

		});
	},
	
	renameRoom: function(oldName, newName, roomId) {
		console.log('[   zion   ][RoomMgr] renameRoom(): trying to rename room, room doesn\'t exist? '+!this.roomMap[roomId])
		if(this.roomMap[oldName] && !this.roomMap[roomId]) {
			this.roomMap[roomId] = this.roomMap[oldName];
			this.roomMap[roomId].set({ name: newName });
			delete this.roomMap[oldName];
			console.log('[   zion   ][RoomMgr] renameRoom(): successfully renamed room to '+newName)
		}
	},
	
	roomListForUser: function(friendIds) {
		
	}
});

UserManager = Backbone.Model.extend({
	initialize: function() {
		//ssId to {user: userModel, roomInfo}
		this.ssIdToRoom = {};
		this.ssIdToUserProfile = {};
		this.fbIdToRoom = {};
	}
});

var roomManager = new RoomManager();
var userManager = new UserManager();
var StagingUsers = {};

io.sockets.on('connection', function(socket) {
	
	socket.on('surfstream:login', function(loginAttemptData) {
		if (redisClient) {
			var promoCode = loginAttemptData.promo;
			var facebookID = loginAttemptData.fbId;
			var email = loginAttemptData.email;
			redisClient.get("user:fb_id:" + loginAttemptData.fbId + ":profile", function(err, reply) {
				if (err) {
					console.log("[   zion   ] [socket][surfstream:login]: Error trying to fetch user by Facebook id on initial login");
				} else {
					var ssUser = JSON.parse(reply);
					var promoCandidate = promoCode;
					var fbId = facebookID;
					if (ssUser == null || ssUser == 'undefined') {
						if (_.indexOf(PROMO_CODES, promoCandidate) == -1) {
							console.log("[   zion   ] [socket][surfstream:login]: This user needs a promo to get in");
							redisClient.hset("fbIDPromoRequests", fbId, email, function(err, reply) {
								if (err) {
									console.log("[   zion   ] [socket][surfstream:login]: Problem setting fbID to promo invite list");
								} else {
									console.log("[   zion   ] [socket][surfstream:login]: FBid with email received!");
					 				socket.emit("email:receivedWithFBID");
								}
							})
						} else {
							console.log("[   zion   ] [socket][surfstream:login]: This user is signing up for the first time");
							socket.emit("surfstream:gate", {details: "approved", fbId: fbId, firstTime: true});
						}
					} else {
						console.log("[   zion   ] [socket][surfstream:login]: This user is signing in as a returning user");
					  socket.emit("surfstream:gate", {details: "approved", fbId: fbId, firstTime: false});	
					}
				}
			});
		}
	});
	
	socket.on("user:startApp", function(signInPayload) {
		if (redisClient) {
			redisClient.get("user:fb_id:" + signInPayload.fbId + ":profile", function(err, reply) {
				if (err) {
					console.log("[   zion   ] [socket][user:startApp]: Error trying to fetch user by Facebook id on initial login");
				} else {
					var ssUser = JSON.parse(reply);
					if (ssUser == null || ssUser == 'undefined') {
						console.log("[   zion   ] [socket][user:startApp]: Error! User should be found if startApp event was sent" )		
					} else {
						redisClient.get("user:" + ssUser.ssId + ":fb_import_date", function(err, reply) {
							if (err) {
								console.log("Error gettings user " + ssUser.ssId + "'s last fbImport date");
							} else {
								if (reply == null || reply == "undefined") {
									socket.emit("playlist:showFBImport");
								}
							}
						});
						socket.emit("user:profile", ssUser);
						var name = ssUser.ss_name;
						var currUser = new models.User({
							name: name, 
							socketId: socket.id, 
							userId: ssUser.ssId,
							fbId: ssUser.id, 
							socket: socket,
							avatar: ssUser.avatarSettings
					  });
						
						currUser.initializeAndSendPlaylists(socket, roomManager, userManager);
						currUser.sendLikes(socket);
						StagingUsers[socket.id] = currUser; 
						console.log('\n\n[   zion   ] [socket][user:startApp]: User has logged on <name,ss_id,fb_id>: '
							+ '<'+name+','+ssUser.ssId+','+ssUser.id+'>'); 
								
					}
				}
			});
		}
	});
	
	socket.on('user:initializeProfile', function(fbUser) {
		if(redisClient) {
			redisClient.incr("userId", function(err, reply){
				var ssUser = fbUser;
				var newAvatarSettings = fbUser.avatarSettings;
				ssUser.ssId = reply;
				socket.emit("user:profile", ssUser);
				var stringSSUser = JSON.stringify(ssUser);
				redisClient.set('user:'+ssUser.ssId+':avatar', newAvatarSettings.toString(), function(err, reply) {
					if (err) {
						console.log("Error setting new avatar settings for user " + thisUser.get('userId'));
					}					
				});
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
				socket.emit("user:sendFBFriends");
				var currUser = new models.User({
					name: ssUser.ss_name, 
					socketId: socket.id,
					userId: ssUser.ssId,
					fbId: ssUser.id, 
					socket: socket,
					avatar: newAvatarSettings
			  });
				
				StagingUsers[socket.id] = currUser;
				var queue = new models.Playlist({name: "My Queue", videos: new models.VideoCollection()});
				var facebookPlaylist = new models.Playlist({name: "Facebook Wall", videos: new models.VideoCollection()});
				redisClient.hmset("user:" + ssUser.ssId + ":playlists", 0, JSON.stringify(queue), 1, JSON.stringify(facebookPlaylist), function(err, reply) {
					if (err) {
						console.log("Error writing ss user's default playlists " + ssUser.ssId + " to Redis");
					} else {
						redisClient.set("user:" + ssUser.ssId + ":activePlaylist", 1, function(err, reply) {
							if (err) {
								console.log("error setting user " + ssUser.ssId + "'s active playlist");
							} else {
								socket.emit("playlist:importFacebook");
								currUser.initializeAndSendPlaylists(socket, roomManager, userManager);
								console.log('\n\n[   zion   ] [socket][user:sendFbId]: User has logged on for the first time <name,ss_id,fb_id>: '
									+ '<'+ssUser.name+','+ssUser.ssId+','+ssUser.id+'>');
							}
						});
					}
				}); 
			
			});
		}
	});
	
	/* PROMO CODE LOGIC */
	
	socket.on("promo:validate", function(data){
		if (redisClient) {
			if (_.indexOf(PROMO_CODES, data.promo) != -1) {
				console.log("Good promo submitted!")
				socket.emit("promo:valid");
			} else {
				console.log("Bad promo tried!")
				socket.emit("promo:bad")
			}
		}
	})
	
	socket.on("surfstream:requestPromo", function(data){
		if (data.email) {
			redisClient.sadd("emailPromoRequests", data.email, function(err, reply) {
				if (err) {
					console.log("[   zion   ] [socket][surfstream:requestPromo]: Problem adding email to request list");
				} else {
					console.log("[   zion   ] [socket][surfstream:requestPromo]: Email received!");
	 				socket.emit("email:received");
				}				
			});
		}
	})
	
	socket.on("user:sendUserFBFriends", function(data) {
		if (redisClient) {
			for (var i = 0; i < data.fbFriends.length; i++) {
				redisClient.sadd("user:" + data.ssId + ":fb_friends", data.fbFriends[i], function(err, reply) {
				});
			}
		}
	});
	
	socket.on("user:sendFBImportDate", function(data) {
		if (redisClient) {
			redisClient.set("user:" + data.ssId + ":fb_import_date", data.date, function(err, reply) {
				
			});
		}
	});
	
	socket.on('room:join', function(data) {
		if(data) console.log("\n\n[   zion   ] [socket] [room:join]: data = "+JSON.stringify(data));
		
		if(data.create == true) {	
			if(data.rID == '') {
				console.log("\n\n[   zion   ] [socket] [room:join]: user tried to create an empty room! returning")
				return;
			}
			console.log("\n\n[   zion   ] [socket] [room:join]: user wants to create room: "+data.roomName+' with rID '+data.rID);
			roomManager.createRoom(data.rID, data.roomName, false);
		} 
		if(redisClient) {
			redisClient.sadd("onlineFacebookUsers", data.fbId);
			userManager.fbIdToRoom[data.fbId] = data.rID;
			userManager.ssIdToRoom[data.ssId] = data.rID;
		}
		if(data.currRoom && roomManager.roomMap[data.currRoom]) {
				var user = roomManager.roomMap[data.currRoom].sockM.removeSocket(socket, false);
				if(user) {
					console.log('user '+user.get('name')+'is already in a room, leaving the room: '+data.currRoom);
					if(roomManager.roomMap[data.rID])
						roomManager.roomMap[data.rID].connectUser(user);
					else
						console.log('...there was no such room with name '+data.rID+'! canceling request to join')
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
