/**
 * Module dependencies.
 */

var http = require('http'),
	_ = require('underscore')._,
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
	m = require('./models/models');

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
var currRoom = new m.Room();

function sendDJInfo(socket) {
	io.sockets.emit('dj:announceDJs', currRoom.djs.xport());
}

function sendRoomState(socket) {
	announceClients();
	initializeAndSendPlaylist(socket);
	sendDJInfo(socket);
}

io.sockets.on('connection', function(socket) {
	
	socket.on('user:sendFBData', function(fbUser) {
		console.log("Saving to redis...user id: "+fbUser.user.id);
		console.log('socket id: '+socket.id);
		//TODO: need to check and see if redis already has the id
		redisClient.set('user:'+fbUser.user.id+':fb_info', JSON.stringify(fbUser)); 
		
		var name = fbUser.user.name;
		var currUser = new m.User({name: name, socketId: socket.id, userId: fbUser.user.id});
		console.log('creating a new User object, with name: '+currUser.get('name'));
		currRoom.users.add(currUser);
		
		redisClient.get('user:'+fbUser.user.id+':points', function(err, reply) {
			if(err) {
				console.log("Error in getting "+fbUser.user.name+" 's points!");
				return;
			}
			if(reply) {
				console.log("Points for "+fbUser.user.name+": "+reply);
				currRoom.users.get(socket.id).set({ points: reply});
			}
			sendRoomState(socket);
		});

		addListeners(socket);
	});

	if(currRoom.currVideo) {
		var timeIn = new Date();
		var timeDiff = (timeIn.getTime() - currRoom.currVideo.get('timeStart')) / 1000; //time difference in seconds
		console.log('Sending current video to socket');
		socket.emit('video:sendInfo', { video: currRoom.currVideo.get('videoId'), time: Math.ceil(timeDiff) });
	}	
});

function addListeners(socket) {
	socket.on('disconnect', function() { 
		removeSocketFromRoom(socket);
	});
	//taken from the chat tutorial
	socket.on('message', function(msg) { chatMessage(socket, msg) });
	addDJListeners(socket);
	addPlaylistListeners(socket);
	addMeterListeners(socket);
	addSocialListeners(socket);
}

function addDJListeners(socket) {
	socket.on('dj:join', function() {
		console.log('user '+currRoom.users.get(socket.id).get('userId')+' requesting to be DJ');
		
		var djs = currRoom.djs;
		console.log('is this user already a dj? '+djs.get(socket.id));
		
		//in order to be a dj, the user has to have vids in his playlist, has to not be a dj, and
		//the dj list can't be full
		console.log('user playlist has length: '+currRoom.users.get(socket.id).playlist.getSize() )
		if(djs.length < 4 && currRoom.users.get(socket.id).playlist.getSize() > 0 && !djs.get(socket.id)) {
			console.log('user '+currRoom.users.get(socket.id).get('userId')+' is now a DJ');
			
			//backbone way
			var currUser = currRoom.users.get(socket.id);
			var numDJs = currRoom.djs.length;
			currRoom.djs.addDJ(currUser, numDJs);
			
			//djList.push(socket.id);
			announceDJs(); 
			
			if(currRoom.djs.length == 1) { //this user is the only dj
				currRoom.djs.nextDJ();
				playVideoFromPlaylist(socket.id);
			}
		}
	});
	
	socket.on('dj:quit', function() { 
		console.log("Quit dj event called for socket" + socket.id);
		removeFromDJ(socket.id) 
	});
	
	socket.on("video:skip", function () { skipVideo();})
	
}

function addSocialListeners(socket) {
	socket.on('social:saveFriendsList', function(data) {
		
	});
}

function addMeterListeners(socket) {
	socket.on('meter:upvote', function() {
		if(!currRoom.currVideo) return;
		
		var currUser = currRoom.users.get(socket.id);
		console.log('voting user: '+currUser.get('name'));
		if(currUser.get('userId') == currRoom.djs.currDJ.get('userId')) return; 	//the DJ can't vote for himself

		console.log('Received upvote request for current video from user '+currUser.get('name'));
		var success = currRoom.meter.addUpvote(currUser.get('userId'));	//checks to make sure the socket hasn't already voted
		if(success) {
			console.log('...success!');
			currRoom.djs.currDJ.addPoint();
			announceMeter();
		}
	});
	
	socket.on('meter:downvote', function() {
		if(!currRoom.currVideo) return;
		
		var currUser = currRoom.users.get(socket.id);
		console.log('downvoting user: '+currUser.get('name'));
		if(currUser.get('userId') == currRoom.djs.currDJ.get('userId')) return;
		
		console.log('Received upvote request for current video from user '+currUser.get('name'));
		var success = currRoom.meter.addDownvote(currUser.get('userId'));	//checks to make sure the socket hasn't already voted
		if(success) {
			console.log('..success!');
			currRoom.users.get(socket.id).subtractPoint();
			announceMeter();
		}
	});
}

function addPlaylistListeners(socket) {
	socket.on('playlist:addVideo', function(data) {
		console.log('Received request to add video '+data.video+' to user '+currRoom.users.get(socket.id).get('userId'));
		currRoom.users.get(socket.id).playlist.addVideoId(data.video);
	}); 
	
	socket.on('playlist:moveVideoToTop', function(data) {
		console.log('Received request to move video '+data.video+ ' for user ' + 	
			currRoom.users.get(socket.id).get('userId'));
		currRoom.users.get(socket.id).playlist.moveToTop(data.video);
		console.log('playlist is now: '+JSON.stringify(currRoom.users.get(socket.id).playlist.xport()));
	});
	
	socket.on('playlist:delete', function(data) {
		console.log('Received request to delete video '+data.video+' from the playlist for user '+ 
							currRoom.users.get(socket.id).get('userId'));
		currRoom.users.get(socket.id).playlist.deleteVideo(data.video);
	});
} 

function getVideoDurationAndPlay(videoId) {
	if(!videoId) {
		console.log('Need another video to load! videoId is null or undefined: '+videoId);
		playNextVideo();
		return;
	}
	console.log("Video to play has id: "+videoId);
	var options = { 
		host: 'gdata.youtube.com',
		port: 80,
		path: '/feeds/api/videos/'+videoId+'?&alt=json',
		method: 'GET'
	};
		
	var req = http.request(options, function(res) {
	  res.setEncoding('utf8');
		var videoData = '';
	  res.on('data', function (chunk) {
	    videoData += chunk;
	  });
		res.on('end', function() {
			console.log('Finished getting info for video '+videoId);
			videoData = JSON.parse(videoData);
			var videoDuration = videoData['entry']['media$group']['yt$duration']['seconds'];
			console.log("Video length: "+videoDuration+" seconds");
			announceVideo(videoId, videoDuration);
		})
	});
		
	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	});
	req.end();
}

function playNextVideo() {
	if(currRoom.djs.length == 0) {
		console.log("No DJs, stopping");
		return;
	}
	
	currDJInfo = currRoom.djs.nextDJ();//(currDJIndex + 1) % currRoom.djs.length;
	console.log('Playing next video, dj has index '+currDJInfo.index+' and is user '
							+ currDJInfo.dj.get('userId')); //socketToUser[djList[currDJIndex]]);
	playVideoFromPlaylist(currRoom.djs.currDJ.get('socketId'));
}

function onVideoEnd() {	//add the video the room history
	if(currRoom.currVideo != null) {
		var videoFinished = new m.Video({ 
			videoId: currRoom.currVideo.get('videoId'), 
			up: currRoom.meter.up, 
			down: currRoom.meter.down 
		});
		redisClient.rpush('room:history', JSON.stringify(videoFinished));
		currRoom.history.add(videoFinished);
		currRoom.clearVideo();
	}
	
	if(currRoom.djs.length == 0) {
		endVideo();
	} else {
		playNextVideo();
	}
}

//this is a hack
function endVideo() {
	console.log('ending the current video!');
	io.sockets.emit('video:stop');
}

function announceVideo(videoId, videoDuration) {
	if(currRoom.currVideo != null) {
		currRoom.currVideo.set({ 
			duration: videoDuration, 
			timeStart: (new Date()).getTime(),
			timeoutId: setTimeout(function() { onVideoEnd() }, videoDuration*1000)
		});
	}
	
	io.sockets.emit('video:sendInfo', { video: videoId, time: 0 });
}

function playVideoFromPlaylist(socketId) {
	var videoToPlay = currRoom.users.get(socketId).playlist.playFirstVideo();
	
	if(!videoToPlay) {
		console.log('Request to play video from playlist, but playlist has no videos!');
		return;
	}
	console.log("(playVideoFromPlaylist) Video to play has id: "+videoToPlay.get('videoId'));

	currRoom.currVideo = new m.Video({ videoId: videoToPlay.get('videoId')});
	currRoom.currVideo.set({ socketIdOfDj: socketId});
	currRoom.meter.reset();
	
	announceMeter();
	getVideoDurationAndPlay(currRoom.currVideo.get('videoId'));
}

function announceMeter() {
	var meter = currRoom.meter;
	io.sockets.emit('meter:announce', { upvoteSet: meter.upvoteSet, down: meter.down, up: meter.up });
}

function removeFromDJ(socketId) {
	currRoom.djs.removeDJ(socketId);
	announceDJs();
	if(currRoom.djs.currDJ == null) {
		console.log('the DJ removed was the current one, going to the next DJ');
		if(currRoom.currVideo != null) {
			clearTimeout(currRoom.currVideo.get('timeoutId'));
		}
		onVideoEnd();
	}		
}

function skipVideo() {
	clearTimeout(currRoom.currVideo.get('timeoutId'));
	onVideoEnd();
}

function announceDJs() {
	console.log('sending DJs');
	io.sockets.emit('dj:announceDJs', currRoom.djs.xport());
}

function initializeAndSendPlaylist(socket) {
	var userId = currRoom.users.get(socket.id).get('userId');
	redisClient.get('user:'+userId+':playlist', function(err, reply) {
		if(err) {
			console.log("Error in getting user"+userId+"'s playlist!");
		} else {
			var currPlaylist = new m.Playlist();
			console.log('getting playlist for user '+userId+', reply: '+reply);
			if(reply != 'undefined' && reply != null) {
				console.log('...serializing playlist');
				var playlist = JSON.parse(reply);	
				currPlaylist.mport(playlist);
				currRoom.users.get(socket.id).setPlaylist(currPlaylist);
				socket.emit("playlist:refresh", playlist);
			} else {
				socket.emit("playlist:refresh");
			}
		}
	});
}


function removeSocketFromRoom(socket) {
	var userId = currRoom.users.get(socket.id).get('userId');

	//Backbone way
	var userToRemove = currRoom.users.get(socket.id);
	redisClient.set('user:'+userId+':points', userToRemove.get('points'));	//save points for user
	currRoom.remove(socket.id);
	console.log('there are now '+currRoom.users.length+ ' users in the room, and dj count: '+currRoom.djs.length);
	
	//save playlist for user
	var userPlaylist = userToRemove.playlist.xport();
	console.log('Saving playlist for user '+userId+': '+userPlaylist);	//not working, results in undefined
	redisClient.set('user:'+userId+':playlist', userPlaylist, function() {
		console.log('...save was successful');
	});
	announceClients();
	removeFromDJ(socket.id);	
}

function announceClients() {
	var allUsers = currRoom.users.xport();
	console.log("'announceClients' fired to all sockets, client count: "+allUsers.length);
	io.sockets.emit('users:announce', allUsers);
}

//chat tutorial stuff
function chatMessage(socket, msg){
	var chat = new models.ChatEntry({name: msg.name, text: msg.text, fbid: msg.id});
	
	redisClient.incr('next.chatentry.id', function(err, newId) {
		chat.set({id: newId});
		nodeChatModel.chats.add(chat);
		console.log('(' + socket.id + ') ' + chat.get('fbid') + ' ' + chat.get('name') + ': ' + chat.get('text'));

		redisClient.rpush('chatentries', chat.xport(), redis.print);
		redisClient.bgsave();
				
		io.sockets.emit('message', { event: 'chat', data: JSON.parse(chat.xport()) }); 
	}); 
}

app.listen(3000);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
