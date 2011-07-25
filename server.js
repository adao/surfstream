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
	
/* Custom Modules */
var facebook = require('./facebook'),
	models = require('./public/models/models');

facebook.connect(app, express);
io.configure(function () {
	io.set('log level', 2); 
})

require('jade');

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: "dklfj83298fhds" }));
});

app.configure('development', function(){
	app.use(require('stylus').middleware({ src: __dirname + '/public', force: true}));
});

app.configure('production', function(){
	app.use(require('stylus').middleware({ src: __dirname + '/public'}));
});

app.configure(function(){
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

//related to the current video
var currVideo = null;

function sendDJInfo(socket) {
	socket.emit('djInfo', djList);
}

function sendClientInfo(socket, fbInfo) {
	fbInfo['socketId'] = socket.id;
	socket.emit('clientInfo', fbInfo);
}

io.sockets.on('connection', function(socket) {
	socket.on('getUserData', function(fbUser) {
		console.log("Saving to redis...user id: "+fbUser.user.id);
		//TODO: need to check and see if redis already has the id
		redisClient.set('user:'+fbUser.user.id+':info', JSON.stringify(fbUser)); 
		console.log('socket id: '+socket.id);
		console.log('socketToUser[socket.id] = '+socketToUser[socket.id]);

		console.log('about to push onto clients the user id '+fbUser.user.id);
		clients.push(fbUser.user.id);
		socketToUser[socket.id] = fbUser.user.id;
		
		announceClients();
		sendClientInfo(socket, fbUser);
		sendFullPlaylist(socket, fbUser.user.id);
		sendDJInfo(socket);

		addListeners(socket);
	});
	
	if(currVideo) {
		var timeIn = new Date();
		var timeDiff = (timeIn.getTime() - currVideo.timeStart) / 1000; //time difference in seconds
		socket.emit('videoInfo', { video: currVideo.video, time: Math.ceil(timeDiff) });
	}
	
	//taken from chat tutorial
	socket.emit('initialChat', { event: 'initial', data: nodeChatModel.xport() });
});

function addListeners(socket) {
	socket.on('disconnect', function() { 
		clientDisconnect(socketToUser[socket.id]);
		removeFromDJ(socket.id);	
		delete socketToUser[socket.id]; 
	});
	
	socket.on('addVideoToQueue', function(data) {
		var userId = socketToUser[socket.id];
		console.log("user "+ userId +" wants to add video: "+data.video);
		redisClient.rpush("user:"+userId+":queue", data.video, function(err,res) { sendFullPlaylist(socket, userId)});
	});
	
	socket.on('becomeDJ', function() {
		console.log('user '+socketToUser[socket.id]+' requesting to be DJ');
		
		if(djList.length < 4 && djList.indexOf(socket.id) < 0) {
			console.log('user '+socketToUser[socket.id]+' is now a DJ');
			djList.push(socket.id);
			announceDJs(); 
		}
		if(djList.length == 1) {
			currDJIndex = 0;			//eventually we'll want to replace this with a full DJ model
			playVideoFromPlaylist(socket.id);
		}
	});
	
	socket.on('quitDJ', function() { 
		console.log("Quit dj event called for socket" + socket.id);
		removeFromDJ(socket.id) 
	});
	
	//taken from the chat tutorial
	socket.on('message', function(msg) { chatMessage(socket, msg) });
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

function announceVideo(videoId, videoDuration) {
	currVideo.video = videoId;
	currVideo.duration = videoDuration;
	currVideo.timeStart = (new Date()).getTime();
	setTimeout(function() { playNextVideo() }, videoDuration*1000);	//*1000 for milliseconds
	io.sockets.emit('videoInfo', { video: videoId, time: 0 });
}

function playVideoFromPlaylist(socketId) {
	var userId = socketToUser[socketId];
	redisClient.lpop('user:'+userId+':queue', function(err, reply) {
		if(err) {
			console.log("error in getting the first video from playlist for "+userId+": "+err);
			return;
		}
		currVideo = {};	//makes it non-null
		currVideo.socketIdOfDj = socketId;
		getVideoDurationAndPlay(reply)
	});
}

function removeFromDJ(socketId) {
	var index = djList.indexOf(socketId);
	if(index != -1) djList.splice(index,1);
	announceDJs();
}

function announceDJs() {
	io.sockets.emit('djInfo', djList);
}

function sendFullPlaylist(socket, userId) {
	redisClient.llen('user:'+userId+':queue', function(err, size) {
		console.log('size of '+userId+"'s queue: "+size);
		redisClient.lrange('user:'+userId+':queue', 0, size, function(err, reply) {
			if(err) {
				console.log("error in refreshing playlist for "+userId+": "+err);
				return;
			}
			socket.emit("refreshPlaylist", reply); 
		});
	})	
}

function clientDisconnect(userId) {
	console.log("userId "+userId+" is disconnecting");
	var index = clients.indexOf(userId);
	if(index != -1) clients.splice(index,1);
	announceClients();
}

function announceClients() {
	console.log("'announceClients' fired to all sockets, client count: "+clients.length);
	io.sockets.emit('clientUpdate', clients.length);
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

// console.log("Starting timer...");
// setTimeout(function() { console.log("10 seconds have passed")}, 10000);
// console.log("Timer is active.");

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
