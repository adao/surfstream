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

// require('tamejs').register();
// require('mylib.tjs');
require('jade');
	
/* Custom Modules */
var facebook = require('./facebook'),
	models = require('./public/models/models');
	m = require('./models/models');

facebook.connect(app, express);
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
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));   
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
app.get('/*.(js|css)', function(req, res){
  	res.sendfile("./public"+req.url);
});



//chat model
var nodeChatModel = new models.NodeChatModel();

//keep track of the people in the room
var djList = new Array();
var currDjIndex = -1;
var clients = new Array();
var socketToUser = {};
var socketToPlaylist = {};

//backbone stuff
var currRoom = new m.Room();

//related to the current video
var currVideo = null;

function sendDJInfo(socket) {
	socket.emit('dj:announceDJs', djList);
}

function sendRoomState(socket) {
	announceClients();
	initializeAndSendPlaylist(socket);
	sendDJInfo(socket);
	//sendRoomHistory(socket);
}



io.sockets.on('connection', function(socket) {
	socket.on('user:sendFBData', function(fbUser) {
		console.log("Saving to redis...user id: "+fbUser.user.id);
		console.log('socket id: '+socket.id);
		//TODO: need to check and see if redis already has the id
		redisClient.set('user:'+fbUser.user.id+':fb_info', JSON.stringify(fbUser)); 
		
		console.log('about to push onto clients the user id '+fbUser.user.id);
		clients.push(fbUser.user.id);	
		socketToUser[socket.id] = fbUser.user.id;
		
		//Backbone`
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
		});
				
		sendRoomState(socket);
		addListeners(socket);
	});

	if(currVideo) {
		var timeIn = new Date();
		var timeDiff = (timeIn.getTime() - currVideo.get('timeStart')) / 1000; //time difference in seconds
		console.log('Sending current video to socket');
		socket.emit('video:sendInfo', { video: currVideo.get('videoId'), time: Math.ceil(timeDiff) });
	}
	
	//taken from chat tutorial
	//socket.emit('chat:initial', { event: 'initial', data: nodeChatModel.xport() });
});

function addListeners(socket) {
	socket.on('disconnect', function() { 
		removeSocketFromRoom(socket);
	});
		// 
		// socket.on('addVideoToQueue', function(data) {
		// 	var userId = socketToUser[socket.id];
		// 	console.log("user "+ userId +" wants to add video: "+data.video);
		// 	//redisClient.rpush("user:"+userId+":queue", data.video, function(err,res) { sendFullPlaylist(socket, userId)});
		// });
		// 
	socket.on('dj:join', function() {
		console.log('user '+socketToUser[socket.id]+' requesting to be DJ');
		
		if(djList.length < 4 && djList.indexOf(socket.id) < 0) {
			console.log('user '+socketToUser[socket.id]+' is now a DJ');
			djList.push(socket.id);
			announceDJs(); 
			
			if(djList.length == 1) { //this user is the only dj
				currDJIndex = 0;			//note: eventually we'll want to replace this with a full DJ model
				playVideoFromPlaylist(socket.id);
			}
		}
	});
	
	socket.on('dj:quit', function() { 
		console.log("Quit dj event called for socket" + socket.id);
		removeFromDJ(socket.id) 
	});
	
	//taken from the chat tutorial
	socket.on('message', function(msg) { chatMessage(socket, msg) });
	
	addPlaylistListeners(socket);
	addMeterListeners(socket);
}

function addMeterListeners(socket) {
	socket.on('meter:upvote', function() {
		if(!currVideo) return;
		var currUser = currRoom.users.get(socket.id);
		console.log('Received upvote request for current video from user '+currUser.get('name'));
		var success = currRoom.meter.addUpvote(currUser.get('userId'));	//checks to make sure the socket hasn't already voted
		if(success) {
			console.log('...success!');git
			announceMeter();
		}
	});
	
	socket.on('meter:downvote', function() {
		if(!currVideo) return;
		var currUser = currRoom.users.get(socket.id);
		console.log('Received upvote request for current video from user '+currUser.get('name'));
		var success = currRoom.meter.addDownvote(currUser.get('userId'));	//checks to make sure the socket hasn't already voted
		if(success) {
			console.log('..success!');
			announceMeter();
		}
	});
}

function addPlaylistListeners(socket) {
	socket.on('playlist:addVideo', function(data) {
		console.log('Received request to add video '+data.video+' to user '+socketToUser[socket.id]);
		socketToPlaylist[socket.id].addVideoId(data.video);
	});
	
	socket.on('playlist:moveVideo', function(data) {
		console.log('Received request to move video '+data.video+' to index '+data.indexToMove+' for user '+socketToUser[socket.id]);
		socketToPlaylist[socket.id].move(data.videoId, data.indexToMove);
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
			//console.log(chunk);
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
	if(djList.length == 0) {
		console.log("No DJs, stopping");
		return;
	}
	currDJIndex = (currDJIndex + 1) % djList.length;
	console.log('Playing next video, dj has index '+currDJIndex+' and is user '+socketToUser[djList[currDJIndex]]);
	playVideoFromPlaylist(djList[currDJIndex]);
}

function onVideoEnd() {	//add the video the room history
	var videoFinished = new m.Video({ 
		videoId: currVideo.get('videoId'), 
		upvotes: currRoom.meter.up, 
		downvotes: currRoom.meter.down });
	currRoom.history.add(videoFinished);
	
	
	playNextVideo();
}

function announceVideo(videoId, videoDuration) {
	currVideo.set({ 
		duration: videoDuration, 
		timeStart: (new Date()).getTime(),
		timeoutId: setTimeout(function() { onVideoEnd() }, videoDuration*1000)
	});
	
	io.sockets.emit('video:sendInfo', { video: videoId, time: 0 });
}

function playVideoFromPlaylist(socketId) {
	var videoToPlay = socketToPlaylist[socketId].playFirstVideo();
	
	if(!videoToPlay) {
		console.log('Request to play video from playlist, but playlist has no videos!');
		return;
	}
	console.log("(playVideoFromPlaylist) Video to play has id: "+videoToPlay.get('videoId'));
	currVideo = videoToPlay;
	currVideo.set({ socketIdOfDj: socketId});
	currRoom.meter.reset();
	announceMeter();
	getVideoDurationAndPlay(currVideo.get('videoId'));
}

function announceMeter() {
	var meter = currRoom.meter;
	io.sockets.emit('meter:announce', { upvoteSet: meter.upvoteSet, down: meter.down, up: meter.up });
}

function removeFromDJ(socketId) {
	var index = djList.indexOf(socketId);
	if(index != -1) djList.splice(index,1);
	announceDJs();
}

function announceDJs() {
	console.log('sending DJs');
	io.sockets.emit('dj:announceDJs', djList);
}

function initializeAndSendPlaylist(socket) {
	var userId = socketToUser[socket.id];
	redisClient.get('user:'+userId+':playlist', function(err, reply) {
		if(err) {
			console.log("Error in getting user "+socketToUser[socket.id]+"'s playlist!");
		} else {
			var currPlaylist = new models.PlaylistModel();
			console.log('getting playlist for user '+userId+', reply: '+reply);
			if(reply) {
					console.log('...serializing playlist');
					currPlaylist.mport(reply);
			}
			socketToPlaylist[socket.id] = currPlaylist;
			socket.emit("playlist:refresh", reply);
		}
	});
}

function clientDisconnect(userId) {
	console.log("userId "+userId+" is disconnecting");
	announceClients();
}

function removeSocketFromRoom(socket) {
	//clientDisconnect(socketToUser[socket.id]);
	removeFromDJ(socket.id);	
	
	var userId = socketToUser[socket.id];
	var index = clients.indexOf(userId);
	if(index != -1) clients.splice(index,1);
	
	delete socketToUser[socket.id];
	
	//Backbone way
	var userToRemove = currRoom.users.get(socket.id);
	redisClient.set('user:'+userId+':points', userToRemove.get('points'));	//save points for user
	currRoom.users.remove(socket.id);
	
	//save playlist for user
	var userPlaylist = socketToPlaylist[socket.id].xport();
	console.log('Saving playlist for user '+userId+': '+userPlaylist);
	redisClient.set('user:'+userId+':playlist', userPlaylist);
	delete socketToPlaylist[socket.id];
}

function announceClients() {
	var allUsers = [];
	currRoom.users.each(function(user) {
		console.log("curr user's attributes: "+JSON.stringify(user.toJSON));
		var u = {};
		u.points = user.get('points');
		u.name = user.get('name');
		u.avatar = user.get('avatar');
		u.x = user.get('xCoord');
		u.y = user.get('yCoord');
		console.log('curr user: '+u);
		allUsers.push(u);
	});
	console.log("'announceClients' fired to all sockets, client count: "+allUsers.length);
	io.sockets.emit('users:announce', allUsers);
}
//chat tutorial stuff
function chatMessage(socket, msg){
	var chat = new models.ChatEntry();
	chat.mport(msg);

	redisClient.incr('next.chatentry.id', function(err, newId) {
		chat.set({id: newId});
		nodeChatModel.chats.add(chat);
		console.log('(' + socket.id + ') ' + chat.get('id') + ' ' + chat.get('name') + ': ' + chat.get('text'));

		redisClient.rpush('chatentries', chat.xport(), redis.print);
		redisClient.bgsave();
				
		io.sockets.emit('message', { event: 'chat', data: chat.xport() }); 
	}); 
}

app.listen(3000);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
