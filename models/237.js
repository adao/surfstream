(function() {
	_ = require('underscore')._;
  Backbone = require('backbone');
	models = exports;
	var redisClient = require('redis').createClient(),
	http = require('http');
	
	/*************************/
	/*      VideoManager     */
	/*************************/
	models.VideoManager = Backbone.Model.extend({
		initialize: function(room) {
			this.room = room;
		},
		
		playVideoFromPlaylist: function(socketId) {
			var videoToPlay = this.room.users.get(socketId).playlist.playFirstVideo();
			if(!videoToPlay) {
				console.log('Request to play video from playlist, but playlist has no videos!');
				return;
			}
			console.log("(playVideoFromPlaylist) Video to play has id: "+videoToPlay.get('videoId')+' and title: '+videoToPlay.get('title'));

			this.room.currVideo = new models.Video({ videoId: videoToPlay.get('videoId'), title: videoToPlay.get('title')});
			this.room.meter.reset();

			this.getVideoDurationAndPlay(this.room.currVideo.get('videoId'));
		},
		
		getVideoDurationAndPlay: function(videoId) {
			if(!videoId) {
				console.log('Need another video to load! videoId is null or undefined: '+videoId);
				this.playNextVideo();
				return;
			}
			console.log("Video to play has id: "+videoId);
			var options = { 
				host: 'gdata.youtube.com',
				port: 80,
				path: '/feeds/api/videos/'+videoId+'?&alt=json',
				method: 'GET'
			};

			var room = this.room;
			var vm = this;
			var req = http.request(options, function(res) {
			  res.setEncoding('utf8');
				var videoData = '';
			  res.on('data', function (chunk) {
			    videoData += chunk;
			  });
			
				res.on('end', function() {
					videoData = JSON.parse(videoData);
					var videoDuration = videoData['entry']['media$group']['yt$duration']['seconds'];
					var videoTitle = videoData['entry']['title']['$t'];

					if(room.currVideo != null) {
						room.currVideo.set({ 
							duration: videoDuration, 
							timeStart: (new Date()).getTime(),
							timeoutId: setTimeout(function() { vm.onVideoEnd() }, videoDuration*1000),
							title: videoTitle
						});
					}
					room.sockM.announceVideo(videoId, videoDuration, videoTitle);
				});
			});

			req.on('error', function(e) {
			  console.log('problem with request: ' + e.message);
			});
			req.end();
		},
		
		onVideoEnd: function () {	
			//add the video the room history
			if(this.room.currVideo != null) {
				if(this.room.djs.currDJ) {
					this.room.djs.currDJ.playlist.moveToBottom(this.room.currVideo.get('videoId'));	
				}
				var videoFinished = new models.Video({
					id: (new Date()).getTime(),
					videoId: this.room.currVideo.get('videoId'), 
					up: this.room.meter.up, 
					down: this.room.meter.down,
				});
				redisClient.rpush('room:history', JSON.stringify(videoFinished));
				this.room.history.add(videoFinished);
				this.room.clearVideo();
			}
		
			if(this.room.djs.length == 0) {
				this.room.sockM.announceStopVideo();
			} else {
				this.playNextVideo();
			}
		},
		
		playNextVideo: function() {
			if(this.room.djs.length == 0) {
				console.log("No DJs, stopping");
				return;
			}

			currDJInfo = this.room.djs.nextDJ(); 
			console.log('Playing next video, dj has index '+currDJInfo.index+' and is user '
									+ currDJInfo.dj.get('userId')); 
			this.playVideoFromPlaylist(this.room.djs.currDJ.get('socketId'));
		}
	});
	
	/*************************/
	/*          Room         */
	/*************************/
	
	models.Room = Backbone.Model.extend({
		
		defaults: {
			'name': '',
			'creator': '',
			'roomId': 0
		},
		
		initialize: function(io, redisClient) {
			this.io = io;
			this.redisClient = redisClient;
			this.vm = new models.VideoManager(this);
			
			this.users = new models.UserCollection();
			this.users.setRoom(this);
			
			this.djs = new models.DJCollection();
			this.djs.setRoom(this);
			
			this.meter = new models.Meter();
			this.meter.setRoom(this);
			
			this.currVideo = null;
			this.history = new models.VideoCollection();
			this.sockM = new models.SocketManager(this);
		},
		
		clearVideo: function() {
			this.currVideo = null;
		},
		
		removeSocket: function(socketId) {
			this.users.remove(socketId);
			this.djs.removeDJ(socketId);
		},
		
		connectUser: function(user) {
			this.users.addUser(user);
			this.sockM.addSocket(user.get("socket"));
			
			if(this.currVideo) {
				var timeIn = new Date();
				var timeDiff = (timeIn.getTime() - this.currVideo.get('timeStart')) / 1000; //time difference in seconds
				console.log('Sending current video to socket, title is : '+this.currVideo.get('title'));

				user.get("socket").emit('video:sendInfo', {  
					video: this.currVideo.get('videoId'), 
					time: Math.ceil(timeDiff), 
					title: this.currVideo.get('title') 
				});
			}	
			this.sockM.sendRoomState();
		},
		
		//will need to be room-specific soon, just ripped from existing solution for now.
		addChatListener : function(socket) {
				var room = this;
				socket.on('message', function(msg) { 
					room.sockM.announceChat(socket, msg) 
				});
		},
		
		xport: function() {
			var roomData = {};
			roomData.rID = this.get('name');
			roomData.numDJs = this.djs.length;
			roomData.numUsers = this.users.length;
			if(this.currVideo) roomData.curVidTitle = this.currVideo.get('title');
			
			return roomData;
		}
		
	});
	
	/*************************/
	/*     SocketManager     */
	/*************************/
	
	models.SocketManager = Backbone.Model.extend({
		//this model handles global socket events
		
		initialize: function(room) {
			this.room = room;
			io = room.io;
		},
		
		io: null,
		
		addSocket: function(socket) {
			var thisSocket = this;
			socket.on('disconnect', function() { 
				thisSocket.removeSocket(socket);
			});
			
			if(this.room) {
				this.room.addChatListener(socket);
				//this.room.users.addConnectListener(socket);
				this.room.users.addPlaylistListeners(socket);
				this.room.meter.addListeners(socket);
				this.room.djs.addListeners(socket);
				socket.join(this.room.get("name"));
			}
		},
		
		sendRoomState: function() {
			this.announceClients();
			this.announceDJs();
			this.announceMeter();
		},

		removeSocket: function(socket) {
			if(!this.room || !this.room.users || this.room.users == undefined) return;
			if(!this.room.users.get(socket.id)) return;
			
			var userId = this.room.users.get(socket.id).get('userId');
			var userToRemove = this.room.users.get(socket.id);
			redisClient.set('user:'+userId+':points', userToRemove.get('points'));	//save points for user
			this.room.removeSocket(socket.id);
			console.log('there are now '+this.room.users.length+ ' users in the room, and dj count: '+this.room.djs.length);

			//save playlist for user
			var userPlaylist = userToRemove.playlist.xport();
			console.log('Saving playlist for user '+userId+': '+userPlaylist);	//not working, results in undefined
			redisClient.set('user:'+userId+':playlist', userPlaylist, function() {
				console.log('...save was successful');
			});
			this.announceClients();
//		this.room.djs.removeDJ(socket.id);
		},

		announceVideo: function(videoId, duration, title) {
			io.sockets.in(this.room.get('name')).emit('video:sendInfo', { video: videoId, time: 0, title: title});
		},
		
		announceClients: function() {
			var allUsers = this.room.users.xport();
			console.log("'announceClients' fired to all sockets, client count: "+allUsers.length);
			io.sockets.in(this.room.get('name')).emit('users:announce', allUsers);
		},
		
		announceMeter: function() {
			meter = this.room.meter;
			io.sockets.in(this.room.get('name')).emit('meter:announce', 
				{ upvoteSet: meter.upvoteSet, 
					down: meter.down, 
					up: meter.up }
			);
		},
		
		announceDJs: function() {
			io.sockets.in(this.room.get('name')).emit('djs:announce', this.room.djs.xport());
		},
		
		announceStopVideo: function() {
			io.sockets.in(this.room.get('name')).emit('video:stop');
		},
		
		announceChat : function(socket, msg) {
			io.sockets.in(this.room.get('name')).emit('message', {event: 'chat', data: msg});
		}
	});

	/*************************/
	/*          Video        */
	/*************************/
	
	models.Video = Backbone.Model.extend({
		defaults: {
			'videoId': null,
			'duration': -1,
			'timeStart': null,
			'timeoutId': null,
			'timesPlayed': -1,
			'up': 0,
			'down': 0,
			'title': null,
			'thumb': null
		},
		
		xport: function() {
			return { 
				videoId: this.get('videoId'), 
				id: this.get('videoId'), 
				thumb: this.get('thumb'), 
				title: this.get('title'), 
				duration: this.get('duration') 
			};
		}		
	});
	
	/*************************/
	/*    VideoCollection    */
	/*************************/
	
	models.VideoCollection = Backbone.Collection.extend({
		model: models.Video
	});

	/*************************/
	/*        Playlist       */
	/*************************/

	models.Playlist = Backbone.Model.extend({
		initialize: function() {
			this.videos = new models.VideoCollection();
		},

		addVideo: function(id, thumb, title, duration) {
			if(this.videos.get(id) >= 0)
				return false;
			var vid = new models.Video();
			vid.id = id;
			vid.set({ videoId: id, thumb: thumb, title: title, duration: duration});
			this.videos.add(vid);
		},
		
		getSize: function() {
			return this.videos.length;
		},
		
		moveToTop: function(videoId) {
			var video = this.videos.get(videoId);
			if(video) {
				this.videos.remove(video);
				this.videos.add(video, { at: 0 });
				return true;
			}
			return false;
		},
		
		moveToBottom: function(videoId) {
			var video = this.videos.get(videoId);
			if(video) {
				this.videos.remove(video);
				this.videos.add(video);
				return true;
			}
			return false;
		},
		
		//returns the first Video, and moves the Video
		//to the end of the playlist 
		playFirstVideo: function() {
			if(this.videos.length == 0) {
				return null;
			}
			var first = this.videos.at(0);
			this.videos.remove(first);
			this.videos.add(first);	//adds video to the end;
			return first;
		},
		
		deleteVideo: function(videoId) {
			this.videos.remove(videoId);
		},
		
		xport: function() {
			var videoExport = [];
			this.videos.each(function(video) {
				videoExport.push(video.xport());
			});
			return JSON.stringify(videoExport);
		},
		
		mport: function(rawVideoData) {
			for(var i= 0; i < rawVideoData.length; i = i+1) {
				var video = rawVideoData[i];
				var videoToAdd = new models.Video({ videoId: video.videoId, thumb: video.thumb, title: video.title /*, duration: duration*/ });
				videoToAdd.id = video.videoId;
				this.videos.add(videoToAdd);
			}
		}
		
	});
	
	
	/*************************/
	/*         User          */
	/*************************/
	
	var X_MAX = 510;
	var Y_MAX = 95;

	models.User = Backbone.Model.extend({
		defaults: {
			'avatar': null,
			'points': 0,
			'xCoord': 0,
			'yCoord': 0,
			'userId': 0,
			'socketId': 0,
			'name': null
		},
		
		initialize: function() {
			this.id = this.get('socketId');	
			this.playlist = new models.Playlist();
			this.randLoc();
		},
		
		setPlaylist: function(playlist) {
			this.playlist = playlist;
		},
		
		randLoc: function() {
			var thisX = Math.random()*X_MAX;
			var thisY = Math.random()*Y_MAX;
			this.set({ xCoord: thisX, yCoord: thisY});
			return { x: thisX, y: thisY };
		},
		
		getLoc: function() {
			return { x: this.get('xCoord'), y: this.get('yCoord')};
		},
		
		addPoint: function() {
			var points = this.get('points');
			this.set({ points: points+1 });
		},
		
		subtractPoint: function() {
			var points = this.get('points');
			if(points > 0) this.set({ points: points-1 });
		},
		
		xport: function() {
			return { 
				id: this.get('userId'), 
				name: this.get('name'), 
				avatar: this.get('avatar'), 
				points: this.get('points'),
				x: this.get('xCoord'),
				y: this.get('yCoord')
			};
		}
	});

	
	/*************************/
	/*       RoomUsers       */
	/*************************/
	
	models.RoomUsers = Backbone.Model.extend({})


	
	/*************************/
	/*      UserCollection   */
	/*************************/


	models.UserCollection = Backbone.Collection.extend({
		model: models.User,
		
		setRoom: function(room) {
			this.room = room;
		},
		
		addUser: function(user) {
			this.add(user);
			this.initializeAndSendPlaylist(user.get("socket"));
			// userCollection = this;
			// socket.on('user:sendFBData', function(fbUser) {
			// 	console.log('User '+fbUser.user.name+' has sent over info');
			// 	if(redisClient) {
			// 		redisClient.set('user:'+fbUser.user.id+':fb_info', JSON.stringify(fbUser)); 
			// 	}
			// 	var name = fbUser.user.name;
			// 	var currUser = new models.User({name: name, socketId: socket.id, userId: fbUser.user.id});
			// 	userCollection.add(currUser);
			// 
			// 	redisClient.get('user:'+fbUser.user.id+':points', function(err, reply) {
			// 		if(err) {
			// 			console.log("Error in getting "+fbUser.user.name+" 's points!");
			// 			return;
			// 		}
			// 		if(reply) {
			// 			console.log("Points for "+fbUser.user.name+": "+reply);
			// 			userCollection.get(socket.id).set({ points: reply});
			// 		}
			// 	
			// 		userCollection.room.sockM.sendRoomState();
			// 		userCollection.initializeAndSendPlaylist(socket);
			// 	});
			// })
		},
		
		initializeAndSendPlaylist: function(socket) {
			var userId = this.get(socket.id).get('userId');
			var userCollection = this;
			redisClient.get('user:'+userId+':playlist', function(err, reply) {
				if(err) {
					console.log("Error in getting user"+userId+"'s playlist!");
				} else {
					var currPlaylist = new models.Playlist();
					console.log('getting playlist for user '+userId+', reply: '+reply);
					if(reply != 'undefined' && reply != null) {
						var playlist = JSON.parse(reply);	
						currPlaylist.mport(playlist);
						userCollection.get(socket.id).setPlaylist(currPlaylist);
						socket.emit("playlist:refresh", playlist);
					}
				} 
			});
		},
		
		
		addPlaylistListeners: function(socket) {
			
			var userCollect = this;
			socket.on('playlist:addVideo', function(data) {
				var thisUser = userCollect.get(socket.id);
				console.log('Received request to add video '+data.video+' to user '+thisUser.get('userId')+ ' dur: '+data.duration);
				if(thisUser.playlist.videos.get(data.video)) return;
				thisUser.playlist.addVideo(data.video, data.thumb, data.title, data.duration);
			}); 

			socket.on('playlist:moveVideoToTop', function(data) {
				console.log('received request to move video to top');
				var thisUser = userCollect.get(socket.id);
				
				if(thisUser.playlist.videos.get(data.video)) {
					thisUser.playlist.moveToTop(data.video);
				}
				console.log('playlist is now: '+JSON.stringify(thisUser.playlist.xport()));
			});

			socket.on('playlist:delete', function(data) {
				var thisUser = userCollect.get(socket.id);

				if(thisUser.playlist.videos.get(data.video)) {
					thisUser.playlist.deleteVideo(data.video);
				}
				console.log('Received request to delete video '+data.video+' from the playlist for '+ thisUser.get('name'));
			});
		},
		
		xport: function() {
			var array = new Array();
			this.each(function(user) {
				array.push(user.xport());
			});
			return array;
		}
	});
	
	
	/*************************/
	/*      DJCollection    */
	/*************************/
	
	var MAX_DJS = 4;
	
	models.DJCollection = Backbone.Collection.extend({
		model: models.User,
		
		initialize: function() {
			this.currDJIndex = 0;
			this.currDJ = null;
		},
		
		setRoom: function(room) {
			this.room = room;
		},
		
		addListeners: function (socket) {
			var djs = this;
			socket.on('dj:join', function() {
				console.log(djs.room.users.get(socket.id).get('name')+' requesting to be DJ');

				var users = djs.room.users;
				//in order to be a dj, the user has to have vids in his playlist, has to not be a dj, and
				//the dj list can't be full
				console.log('user playlist has length: '+djs.room.users.get(socket.id).playlist.getSize());
				if(djs.length < 4 && users.get(socket.id).playlist.getSize() > 0 && !djs.get(socket.id)) {
					console.log('user '+ users.get(socket.id).get('userId')+' is now a DJ');
					var currUser = users.get(socket.id);
					var numDJs = djs.length;
					djs.addDJ(currUser, numDJs);

					djs.room.sockM.announceDJs(); 

					if(djs.length == 1) { //this user is the only dj
						djs.nextDJ();
						djs.room.vm.playVideoFromPlaylist(socket.id);
					}
				}
			});

			socket.on('dj:quit', function() { 
				console.log("Quit dj event called for socket" + socket.id);
				djs.removeDJ(socket.id) 
			});
			
			socket.on("video:skip", function () { 
				if(djs.room.currVideo) {
					clearTimeout(djs.room.currVideo.get('timeoutId'));
					console.log('playlist of dj after skipping: '+djs.currDJ.playlist.xport());
					djs.room.vm.onVideoEnd();
				}
			});
		},
		
		addDJ: function(user, index) {
			if(this.length >= MAX_DJS || index > MAX_DJS || index < 0) return false;
			
			if(index == undefined)
				this.add(user);
			else
				this.add(user, {at: index});
		},
		
		removeDJ: function(socketId) {
			var djIndex = this.indexOf(this.get(socketId));
			
			if(djIndex < 0) return;
			
			if(this.currDJIndex >= djIndex && this.currDJIndex > 0) {	
				this.currDJIndex = this.currDJIndex - 1;
			}
			if(this.currDJ != null && this.currDJ.get('socketId') == socketId) {
				this.currDJ = null;
			} 
			this.remove(socketId);
			
			this.room.sockM.announceDJs();
			if(this.currDJ == null) {
				console.log('the DJ removed was the current one, going to the next DJ');
				if(this.room.currVideo != null) {
					clearTimeout(this.room.currVideo.get('timeoutId'));
				}
				this.room.vm.onVideoEnd();
			}	
		},
		
		xport: function() {
			var list = new Array();
			this.each(function(user) {
				var u = {};
				u.id = user.get('userId');
				u.points = user.get('points');
				u.name = user.get('name');
				u.avatar = user.get('avatar');
				list.push(u);
			});
			return list;
		},
		
		nextDJ: function() {
			this.currDJIndex = (this.currDJIndex + 1) % this.length;
			this.currDJ = this.at(this.currDJIndex);
			return { dj: this.currDJ, index: this.currDJIndex };
		},
		
		announceDJs: function() {
			
		}
	});
	
	
	/*************************/
	/*         Meter         */
	/*************************/
	
	models.Meter = Backbone.Model.extend({
		initialize: function() {
			//this.room = room;
			this.upvoteSet = {};
			this.downvoteSet = {};
			this.up = 0;
			this.down = 0;
			this.percentage = 0;
		},
		
		setRoom: function(room) {
			this.room = room;
		},
		
		addListeners: function(socket) {
			var meter = this;
			socket.on('meter:upvote', function() {
				if(!meter.room.currVideo) return;

				var currUser = meter.room.users.get(socket.id);
				console.log('voting user: '+currUser.get('name') + ' for video: '+meter.room.currVideo.get('title'));
				if(currUser.get('userId') == meter.room.djs.currDJ.get('userId')) return; 	//the DJ can't vote for himself

				var success = meter.addUpvote(currUser.get('userId'));	//checks to make sure the user hasn't already voted
				if(success) {
					console.log('...success!');
					meter.room.djs.currDJ.addPoint();
					meter.room.sockM.announceMeter();
				}
			});

			socket.on('meter:downvote', function() {
				if(!meter.room.currVideo) return;

				var currUser = meter.room.users.get(socket.id);
				console.log('downvoting user: '+currUser.get('name'));
				if(currUser.get('userId') == meter.room.djs.currDJ.get('userId')) return;

				var success = meter.room.meter.addDownvote(currUser.get('userId'));	//checks to make sure the socket hasn't already voted
				if(success) {
					console.log('..success!');
					meter.room.users.get(socket.id).subtractPoint();
					meter.room.sockM.announceMeter();
				}
			});
		},
		
		//'userId' is the facebook user-id #
		addUpvote: function(userId) {
			if(this.upvoteSet[userId]) {
				console.log('User '+userId+' is trying to upvote again');
				return false;
			} 
			this.removeDownvote(userId); 	//see note below	
			//if(this.removeDownvote(userId)) return true; 
			this.up = this.up + 1;				
			this.upvoteSet[userId] = true;
			return true;
		},
		/* Note: this is being done turntable style, where 
		* if you disliked a song, then like it, it doesn't go
		* to 'neutral', but instead counts as a net upvote 
		* (and vice versa).
		*
		* If we want the 'neutral' mode, we just put that
		* in an 'else if' bracket, and the last bit in an 'else'  
		*/
		
		addDownvote: function(userId) {
			if(this.downvoteSet[userId]) {
				console.log('User '+userId+' is trying to downvote again');
				return false;
			}
			this.removeUpvote(userId); //see note above
			this.down = this.down + 1;
			this.downvoteSet[userId] = true;
			return true;
		},
		
		removeUpvote: function(userId) {
			if(this.upvoteSet[userId]) {
				this.up = this.up - 1;
				this.upvoteSet[userId] = false;
				return true;
			} return false;
		},
		
		removeDownvote: function(userId) {
			if(this.downvoteSet[userId]) {
				this.down = this.down - 1;
				this.downvoteSet[userId] = false;
				return true;
			} return false;
		},
		
		reset: function() {
			this.initialize();
			if(this.room) this.room.sockM.announceMeter();
		}, 
	});
	
}) ()