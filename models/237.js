(function() {
	_ = require('underscore')._;
  Backbone = require('backbone');
	models = exports;
	var redisClient = require('redis').createClient(),
	http = require('http');
	
	var permSockEvents = {};
	permSockEvents['user:sendFBData'] = true;
	permSockEvents['room:join'] = true;
	permSockEvents['rooms:load'] = true;
	permSockEvents['user:sendFBId'] = true;
	permSockEvents['user:sendUserFBFriends'] = true;       
	permSockEvents['playlists:choosePlaylist'] = true;
	permSockEvents['playlists:addPlaylist'] = true;
	permSockEvents['playlists:deletePlaylist'] = true;
	permSockEvents['playlist:addVideo'] = true;
	permSockEvents['playlist:moveVideoToTop'] = true;
	permSockEvents['playlist:delete'] = true;
	permSockEvents['playlist:moveVideo'] = true;


	/*************************/
	/*      		VAL			     */
	/*************************/
	models.VAL = Backbone.Model.extend({
		initialize: function(room) {
			this.room = room;
			this.userSuggest = new models.Playlist({videos: new models.VideoCollection()});
			this.autoPlaylist = new models.Playlist({videos: new models.VideoCollection()});
			
			this.isDJ = true;
			this.takeSuggest = false;
		},
		
		addValListeners: function(socket) {
			var val = this;
			
			socket.on('val:turnOffDJ', function() {
				val.isDJ = false;
				if(val.room.currVideo.get('dj')) {	//VAL is the current DJ
					clearTimeout(val.room.currVideo.get('timeoutId'));
					val.room.vm.onVideoEnd();
				}
			});
			
			socket.on('val:turnOnDJ', function() {
				val.isDJ = true;
				if(val.room.djs.length == 0) {
					val.playVideo();
				}
			});
		},
		
		playVideo: function() {
			var roomName = this.room.get('name');
			console.log('['+roomName+'][VAL] playVideo(): num users --> '+this.room.users.length);
			if(this.room.users.length == 0) return;

			var rc = this.room.redisClient;
			var roomName = this.room.get('name');
			var key = 'room:'+roomName+':val:playlist';
			
			var val = this;
			rc.lpop(key, function(err, reply) {
				if(val.room.currVideo) return;
				if(err) {
					console.log('['+roomName+'][VAL] playVideo() | rc.lpop : ERROR! '+err);
					val.fetchYouTubeVideo();
					return;
				}
				if(reply) {
					console.log('['+roomName+'][VAL] playVideo(): playing a video from the autoplaylist');
					var videoToPlay = new models.Video({
						videoId: reply.videoId,
						duration: reply.duration,
						title: reply.title,
						thumb: reply.thumb,
						author: reply.author,
						dj: 'VAL'
					});
					
					val.room.vm.play(videoToPlay);
				} else {
					console.log('['+roomName+'][VAL] playVideo(): no videos in the autoplaylist, fetching one from YouTube');
					val.fetchYouTubeVideo();
				}
			});
		},
		
		fetchYouTubeVideo: function() {
			if(this.room.history.length == 0) return;
			
			//choose video to base it on
			// var lookBackNum = 3;
			// 			if (this.room.history.length < lookBackNum) lookBackNum = this.room.history.length;
			// 			var randInt = Math.floor(Math.random()*lookBackNum + 1);	//between 1 and lookBackNum, inclusive
			// 			
			// 			var recentVideo = this.room.history.at(this.room.history.length - randInt);
			// 			if(!recentVideo) {
			// 				console.log("ERROR No video found. You should never see this message! ");
			// 				return;
			// 			}
			var lookBackNum = this.room.djs.length;
			if(lookBackNum <= 0) lookBackNum = 3;
			var recentVideo = this.room.history.getGoodVideo(lookBackNum);
			if(!recentVideo) {
				console.log('error! recentVid is '+recentVideo+', returning')
				return;
			}
			var videoId = recentVideo.get('videoId');
			
			var roomName = this.room.get('name');
			console.log('['+roomName+'][VAL] fetchYouTubeVideo(): basing recommendation off of video '+recentVideo.get('title'));
			
			var options = { 
				host: 'gdata.youtube.com',
				port: 80,
				path: '/feeds/api/videos/'+videoId+'/related?alt=json&start-index=1&max-results=25&v=2',
			};
			
			var room = this.room;
			var VAL = this;
			var req = http.request(options, function(res) {
			  res.setEncoding('utf8');
				var videoData = '';
			  res.on('data', function (chunk) {
			    videoData += chunk;
			  });
			
				res.on('end', function() {
					if(room.currVideo != null) {
						console.log('['+roomName+'][VAL] fetchYouTubeVideo(): VAL just finished the request for fetching vid '+
							', but there\'s another video playing! Someone must have gotten back on the couch...ending this request');
						return;
					}
					
					videoData = JSON.parse(videoData);
					
					//make sure the candidate videos are unplayed
					var unplayedVideos = [];
					var unplayedCount = 0;
					for(var i = 0; i < videoData['feed']['entry'].length; i++) {
						if(unplayedCount > 4) break;
						
						var currVideoId = videoData['feed']['entry'][i]['media$group']['yt$videoid']['$t'];
						if(!room.history.checkIfPlayedRecently(currVideoId)) {
							unplayedVideos.push(videoData['feed']['entry'][i]);
							unplayedCount = unplayedCount + 1;
						}
					}
					
					var videoEntry;
					if(unplayedVideos.length >= 1) { 
						var randIndex = Math.floor(Math.random()*unplayedVideos.length);
						videoEntry = unplayedVideos[randIndex];
					} else {
						var randIndex = Math.floor(Math.random()*4);	//picks one at random from top 4
						videoEntry = videoData['feed']['entry'][randIndex];
					}
											
					var videoToPlayId = videoEntry['media$group']['yt$videoid']['$t'];
					var videoDuration = videoEntry['media$group']['yt$duration']['seconds'];
					var videoTitle = videoEntry['media$group']['media$title']['$t'];
					var videoThumb = videoEntry['media$group']['media$thumbnail'][0]['url'];
					var videoAuthor = videoEntry['author'][0]['name']['$t'];

					console.log('['+room.get('name')+']'+"[VAL] fetchYouTubeVideo(): got related vids, index "+randIndex+"/4 with videoid: "+videoToPlayId+" and title: "+videoTitle);
					var videoToPlay = new models.Video({
						videoId: videoToPlayId,
						duration: videoDuration,
						title: videoTitle,
						thumb: videoThumb,
						author: videoAuthor,
						dj: 'VAL'
					});
					
					room.vm.play(videoToPlay);
				});
			});
	
			req.on('error', function(e) {
			  console.log('['+roomName+'][VAL] playVideo(): *** ERROR *** ' + e.message);
			});
			req.end();
		}
		
	});
	
	/*************************/
	/*      VideoManager     */
	/*************************/
	models.VideoManager = Backbone.Model.extend({
		initialize: function(room, val) {
			this.room = room;
			this.VAL = val;
		},
		
		playVideoFromPlaylist: function(socketId) {
			var roomName = this.room.get('name');
			var videoToPlay = this.room.users.get(socketId).playlist.playFirstVideo();
			this.room.users.get(socketId).saveActivePlaylist();
			var currDJ = this.room.djs.currDJ.get('userId');
			videoToPlay.set({ dj: currDJ });
			if(!videoToPlay) {
				console.log('['+roomName+'][VM] playVideoFromPlaylist(): Request to play video from playlist, but playlist has no videos!');
				this.playNextVideo();
				return;
			}
			
			this.play(videoToPlay);
		},
		
		// videoToPlay: models.Video 
		play: function(videoToPlay) {
			if(!videoToPlay) return;
			
			var videoId = videoToPlay.get('videoId');
			var videoDuration = videoToPlay.get('duration');
			var videoTitle = videoToPlay.get('title');
			var videoDJ = videoToPlay.get('dj');			

			var vm = this;
			this.room.currVideo = new models.Video({ 
				videoId: videoId, 
				title: videoTitle,
				duration: videoDuration,
				author: videoToPlay.get('author'),
				timeStart: (new Date()).getTime(),
				timeoutId: setTimeout(function() { vm.onVideoEnd() }, videoDuration*1000),
				dj: videoToPlay.get('dj')
			});
			
			this.room.meter.reset();
			this.room.sockM.announceVideo(videoId, videoDuration, videoTitle, videoDJ);
			
			var roomName = this.room.get('name');
			console.log('['+roomName+']'+"[VM] play(): announcing video with <id,title,dur>: <"+videoId+','+videoTitle+','+videoDuration+'>');
		},
		
		onVideoEnd: function () {	
			//add the video the room history
			if(this.room.currVideo != null) {
				console.log('['+this.room.get('name')+'][VM] onVideoEnd(): adding video to history : <title,dj>: '+this.room.currVideo.get('title')+','+this.room.currVideo.get('dj'));
				if(this.room.djs.currDJ) {
					this.room.djs.currDJ.playlist.moveToBottom(this.room.currVideo.get('videoId'));	
				}
				
				var videoId = this.room.currVideo.get('videoId'), 
					percent = this.room.meter.calculatePercent(),
					title = this.room.currVideo.get('title'),
					duration = this.room.currVideo.get('duration'),
					thumb = this.room.currVideo.get('thumb');
					dj = this.room.currVideo.get('dj');
							
				this.room.history.addVideo(videoId, title, duration, thumb, dj, percent);
				this.room.clearVideo();
			}
		
			//logic for setting up the next video
			if((this.room.djs.length == 0 || this.room.djs.getNumVideos() == 0) && !this.VAL.isDJ) {	
				this.room.sockM.announceStopVideo();
			} else {
				this.room.vm.playNextVideo();
			};
		},
		
		playNextVideo: function() {
			if(this.room.djs.length == 0 || this.room.djs.getNumVideos() == 0) {
				if(this.VAL.isDJ) {
					console.log('['+this.room.get('name')+'][VM] playNextVideo(): playing next video from VAL');
					this.VAL.playVideo();
				}
				return;
			}
			
			if(this.VAL.isDJ && this.room.djs.isValsTurn()) {	
				this.VAL.playVideo();										//since that DJ will always be the last one
			} else {	//play a video from a human
				var currDJInfo = this.room.djs.nextDJ(); 	
				console.log('['+this.room.get('name')+'][VM] playNextVideo(): playing next video <dj_index, user>: <'+currDJInfo.index+', ' + currDJInfo.dj.get('name')+'>'); 
				this.playVideoFromPlaylist(this.room.djs.currDJ.get('socketId'));
			}
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
			this.VAL = new models.VAL(this);
			this.vm = new models.VideoManager(this, this.VAL);
			
			this.users = new models.UserCollection();
			this.users.setRoom(this);
			
			this.djs = new models.DJCollection();
			this.djs.setRoom(this);
			
			this.meter = new models.Meter();
			this.meter.setRoom(this);
			
			this.currVideo = null;
			this.history = new models.History(this);
			this.sockM = new models.SocketManager(this);
		},
		
		clearVideo: function() {
			this.currVideo = null;
		},
		
		removeSocket: function(socketId) {
			this.djs.removeDJ(socketId);
			this.users.remove(socketId);
		},
		
		connectUser: function(user) {
			this.users.addUser(user);
			this.sockM.addSocket(user.get("socket"));
			user.randLoc();
			//this.sockM.sendRoomState(user.get("socket"));
			this.sockM.sendRoomState();
			if(this.currVideo) {
				var timeIn = new Date();
				var timeDiff = (timeIn.getTime() - this.currVideo.get('timeStart')) / 1000; //time difference in seconds
				console.log('['+this.get('name')+'][Room] sending current video to socket, title: '+this.currVideo.get('title')+ ' and time to start: '+Math.ceil(timeDiff));

				var dj = this.currVideo.get('dj');
				console.log("...the current dj is "+dj);
				user.get("socket").emit('video:sendInfo', { 
					id: this.currVideo.get('videoId'), 
					time: Math.ceil(timeDiff), 
					title: this.currVideo.get('title'),
					dj: this.currVideo.get('dj'),
					duration: this.currVideo.get('duration')
				});
			}
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
			
			var recentVids = [];
			if(this.history.recentVids && this.history.recentVids.length > 0) {
				for(var i=0; i < this.history.recentVids.length && i < 3; i++) {
					var currVid = this.history.recentVids.at(i);
					var vidToAdd = { title: currVid.get('title'), thumb: currVid.get('thumb') };
					recentVids.push(vidToAdd);
				}
				recentVids = recentVids.reverse();
			
				roomData.recentVids = recentVids;
			}
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
				var roomName = thisSocket.room.get('name');
				console.log('['+roomName+'] [socket][:disconnect]: user '+thisSocket.room.users.get(socket.id).get('name') + ' is disconnecting');
				thisSocket.removeSocket(socket, true);
			});
			
			if(this.room) {
				this.room.addChatListener(socket);
				this.room.meter.addListeners(socket);
				this.room.djs.addListeners(socket);
				console.log('['+this.room.get('name')+'][SM] addSocket(): socket is joining channel with name: '+this.room.get('name'));
				socket.join(this.room.get("name"));
			}
		},
		
		sendRoomState: function() {
			this.announceClients();
			this.announceDJs();
			this.announceMeter();
			//this.announceRoomHistory();
		},

		removeSocket: function(socket, trueDisconnect) {
			if(!this.room || !this.room.users || this.room.users == undefined) return;
			if(!this.room.users.get(socket.id)) return;
			
			var roomName = this.room.get('name');
			if(!trueDisconnect) socket.leave(this.room.get('name'));
			
			this.stripListeners(socket);
			
			var userToRemove = this.room.users.get(socket.id);
			var userId = userToRemove.get('userId');
			redisClient.set('user:'+userId+':points', userToRemove.get('points'));	//save points for user
			redisClient.srem("onlineFacebookUsers", userToRemove.get("fbId")); 
			this.room.removeSocket(socket.id);
			console.log('['+this.room.get('name')+'][SockM] removeSocket(): <# users, # sockets, # djs> : <'+this.room.users.length+ ','+io.sockets.clients(roomName).length+','+this.room.djs.length+'>');

			this.announceClients();			
			return userToRemove;
		},
		
		stripListeners: function(socket) {
			for(var socketEvent in socket._events) {
				if(socket._events.hasOwnProperty(socketEvent)) {
					if(!permSockEvents[socketEvent]) {
						socket.removeAllListeners(socketEvent);
					}
				}
			}
		},

		announceVideo: function(videoId, duration, title, dj) {
			io.sockets.in(this.room.get('name')).emit('video:sendInfo', { id: videoId, time: 0, title: title, dj: dj, duration: duration });
		},
		
		announceClients: function() {
			var allUsers = this.room.users.xport();
			io.sockets.in(this.room.get('name')).emit('users:announce', allUsers);
			console.log("["+this.room.get('name')+"] 'announceClients' fired to all sockets, client count: "+allUsers.length);
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
		
		announceChat: function(socket, msg) {
			io.sockets.in(this.room.get('name')).emit('message', {event: 'chat', data: msg});
		},
		
		announceRoomHistory: function() {
//			io.sockets.in(this.room.get('name')).emit('room:history', this.room.history.toJSON());
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
				duration: this.get('duration'),
				author: this.get('author')
			};
		}		
	});
	
	/*************************/
	/*    VideoCollection    */
	/*************************/
	
	models.VideoCollection = Backbone.Collection.extend({
		model: models.Video,
	});
	
	var HIST_NUM_RECENT = 10;
	models.History = Backbone.Model.extend({
		initialize: function(room) {
			this.room = room;
			this.recentVids = new models.VideoCollection();
			this.size = -1;	//to signify no redis read
			this.setSize();
			//TODO: initialize this.recentVids from redis history
		},
		
		setSize: function() {
			if(!this.room.redisClient) return;
			var hist = this;
			var roomName = this.room.get('name');
		 	this.room.redisClient.llen('room:'+roomName+':history', function(err, len) {
				if(err) {
					console.log('['+roomName+'] [Hist] initialize(): Error in getting history length: '+err)
					return;
				}
				//console.log('setting size of room history for room '+roomName+', size is '+len);
				hist.size = len;
			});
		},
		
		getGoodVideo: function(lookBackNum) {
 			var len = this.recentVids.length;
			var videoArray = [];
			
			for(var i=0; i < lookBackNum && i < len; i++) {
				var currVideo = this.recentVids.at(i);
				if(currVideo.get('percent') >= 50) {
					//console.log('pushing on good video '+currVideo.get('title'));
					videoArray.push(currVideo);
				}
			}
			
			if(videoArray.length >= 1) {
				var randInt = Math.floor(Math.random()*videoArray.length);	//0 <= x < videoArray.length
				return videoArray[randInt];
			} else {
				//console.log('all those failed, reverting to old school')
				var lookBackNum = 3;
				if (this.recentVids.length < lookBackNum) lookBackNum = this.recentVids.length;
				var randInt = Math.floor(Math.random()*lookBackNum);	//0 <= randInt < lookBackNum
				var recentVideo = this.recentVids.at(randInt);
				return recentVideo;
			}
		},
		
		addVideo: function(videoId, title, duration, thumb, dj, percent) {
			var videoToAdd = new models.Video({ 
				id: (new Date()).getTime(),
				videoId: videoId,
				title: title,
				duration: duration,
				thumb: thumb,
				dj: dj,
				percent: percent,
			});
			
			if(this.recentVids.length >= HIST_NUM_RECENT)
				this.recentVids.remove(this.recentVids.at(HIST_NUM_RECENT-1)); //remove the oldest video
			this.recentVids.add(videoToAdd, { at: 0 });
			this.room.redisClient.lpush('room:'+this.room.get('name')+':history', JSON.stringify(videoToAdd));

			// if(this.size >= 0) { 			//not working, figure out why llen above in setSize doesn't work
			// 	this.size = this.size + 1;
			// }
		},
		
		checkIfPlayedRecently: function(videoId) {
			var len = this.recentVids.length;
			for(var i = 0; i < len; i++) {
				if(this.recentVids.at(i).get('videoId') == videoId) 
					return true;
			}
			return false;
		},

		getSize: function() { 
			return this.size;
		},
	});

	/*************************/
	/*        Playlist       */
	/*************************/

	models.Playlist = Backbone.Model.extend({

		addVideo: function(playlistId, videoId, thumb, title, duration, author) {
			if(this.containsVideo(videoId))
				return false;
			var vid = new models.Video();
			vid.id = videoId;
			vid.set({ playlistId: playlistId, videoId: videoId, thumb: thumb, title: title, duration: duration, author: author});
			this.get("videos").add(vid);
			return true;
		},
		
		containsVideo: function(id) {
			if(ss_modelWithAttribute(this.get("videos"), "videoId", id)) return true;
			return false;
		},
		
		getVideo: function(id) {
			return ss_modelWithAttribute(this.get("videos"), "videoId", id);
		},
		
		getSize: function() {
			return this.get("videos").length;
		},
		
		moveToIndex: function(videoId, indexToMove) {
			if(indexToMove < 0 || indexToMove >= this.get("videos").length || !this.containsVideo(videoId)) //make sure index is legit
				return false;
			
			var video = this.getVideo(videoId);
			if(video) {
				this.get("videos").remove(video);
				this.get("videos").add(video, { at: indexToMove });
				return true;
			}
			return false;
		},
		
		moveToTop: function(videoId) {
			return this.moveToIndex(videoId, 0);
		},
		
		moveToBottom: function(videoId) {
			if (!this.containsVideo(videoId))
				return false;
			var video = this.getVideo(videoId);
			if(video) {
				this.get("videos").remove(video);
				this.get("videos").add(video);
				return true;
			}
			return false;
		},
		
		//returns the first Video, and moves the Video
		//to the end of the playlist 
		playFirstVideo: function() {
			// if(this.get("videos").length == 0) {
			// 				return null;
			// 			}
			// 			var first = this.get("videos").at(0);
			// 			this.get("videos").remove(first);
			// 			this.get("videos").add(first);	//adds video to the end;
			// 			return first;
			var firstVideo = this.popVideo();
			if(firstVideo) {
				this.get("videos").add(firstVideo);
			}
			return firstVideo;
		},
		
		popVideo: function() {
			if(this.get("videos").length == 0) return null;

			var first = this.get("videos").at(0);
			this.get("videos").remove(first);
			return first;
		},
		
		deleteVideo: function(videoId) {
			if (this.containsVideo(videoId)) {
				this.get("videos").remove(this.getVideo(videoId));
				return true;
			}
			return false;
		},
		
		xport: function() {
			var videoExport = [];
			this.get("videos").each(function(video) {
				videoExport.push(video.xport());
			});
			return JSON.stringify(videoExport);
		}
		
	});
	
	
	/*************************/
	/*         User          */
	/*************************/
	
	var X_MAX = 470;
	var Y_MAX = 145;
	var Y_MIN = 20;
	
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
			this.getAvatar();
			this.playlists = {};
		},
		
		setPlaylists: function(userPlaylists) {
			this.playlists = userPlaylists;
		},
		
		setPlaylist: function(playlistId) {
			this.playlistId = playlistId;
			this.playlist = this.playlists[playlistId];
			var userId = this.get("userId");
			redisClient.set("user:" + userId + ":activePlaylist", playlistId, function(err, reply) {
				if (err) {
					console.log("error setting user " + userId + "'s active playlist");
				} else {
					
				}
			});
		},
		
		getAvatar: function() {
			var userId = this.get("userId");
			var userObj = this;
			redisClient.get('user:'+userId+':avatar', function(err, reply) {
				var avatarData, newAvatar;
				if(err) {
					console.log("\n\nERROR in getting user "+userId+"'s avatar!\n");
				} else {
					avatarData = reply;
					//console.log('getting avatar for user '+userId+', reply: '+reply);
					if(reply != 'undefined' && reply != null) {
						userObj.set({avatar: avatarData});
					} else { //give them a random first default
						newAvatar = Math.ceil(Math.random() * 5);
						redisClient.set('user:'+userId+':avatar', newAvatar);
						userObj.set({avatar: newAvatar});
					}
				} 
			});
		},
		
		randLoc: function() {
			var thisX = Math.random()*X_MAX;
			var thisY = Math.random()*Y_MAX;
			if (thisY < 90 && thisX > 100) { //avoid the sofa
				thisY = 105 + thisY % 40;
			} //TODO: More logic to avoid remote
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
		
		savePlaylist: function(playlistId) {
			redisClient.hset('user:'+this.get("userId")+':playlists', playlistId, JSON.stringify(this.playlists[playlistId]), function(err, reply) {
				if (err) {
					console.log(' playlist save was NOT SUCCESSFUL');
				}
			});
		},
		
		saveActivePlaylist: function() {
			this.savePlaylist(this.playlistId);
		},
		
		hasPlaylist: function(playlistName) {
			for(var id in this.playlists) {
				//console.log(this.playlists[id].get("name"));
				if(this.playlists.hasOwnProperty(id)) {
					if (this.playlists[id].get("name") == playlistName) {
						console.log("Tried to add playlist with a name that already existed. UH UH!");
						return true;
					}
				}
			}
			return false;
		},
		
		initializeAndSendPlaylists: function(socket) {
			var userId = this.get('userId');
			var userModel = this;
			redisClient.hgetall('user:' + userId + ':playlists', function(err, reply) {
				if(err) {
					console.log("Error in getting user" + userId + "'s playlists");
				} else {
					if (reply != 'undefined' && reply != null) {
						var userPlaylists = {};
						for(var id in reply) {
							if(reply.hasOwnProperty(id) && reply[id]) {
								//console.log(reply[id]);
								var playlist = JSON.parse(reply[id]);
								userPlaylists[id] = new models.Playlist({name: playlist.name, videos: new models.VideoCollection(playlist.videos)});
							}
						}
						//console.log('getting playlists for user '+userId);
						userModel.setPlaylists(userPlaylists);
						userModel.addPlaylistListeners(socket);
						//socket.emit("playlist:initialize", userPlaylists);
						redisClient.get("user:" + userId + ":activePlaylist", function(err, reply) {
							if (err) {
								console.log("Error getting user " + userId + "'s active playlist");
							} else {
								socket.emit("playlist:initialize", {userPlaylists: userPlaylists, activePlaylistId: reply});
							}
						});
					}
				}
			});
		},
		
		addPlaylistListeners: function(socket) {
			var userId = this.get("userId");
			var playlists = this.playlists;
			var thisUser = this;
			socket.on('playlists:choosePlaylist', function(data) {
				//console.log("!playlists[data.playlistId] = " + !playlists[data.playlistId] + " ... thisUser.playlist == playlists[data.playlistId]" + (thisUser.playlist == playlists[data.playlistId]))
				if (!playlists[data.playlistId] || thisUser.playlist == playlists[data.playlistId]) {
					return;
				} else {
					thisUser.setPlaylist(data.playlistId);
				}
			});
			socket.on('playlists:addPlaylist', function(data) {
				if (!thisUser.hasPlaylist(data.playlistName)) {
					var newPlaylist = new models.Playlist({name: data.playlistName, videos: new models.VideoCollection()});
					playlists[data.playlistId] = newPlaylist;
					thisUser.savePlaylist(data.playlistId);
				}
			});
			socket.on('playlists:deletePlaylist', function(data) {
				redisClient.hdel("user:" + userId + ":playlists", data.playlistId, function(err, reply) {
					if (err) {
						console.log("Error deleting user " + userId + "playlist with id " + data.playlistId);
					} else {
						console.log("Success deleting user " + userId + "playlist with id " + data.playlistId);
						//console.log(reply);
						//console.log(playlists);
						delete playlists[data.playlistId];
						//console.log(playlists);
					}
				})
				
				var newPlaylist = new models.Playlist({name: data.playlistName, videos: new models.VideoCollection()});
				playlists[data.playlistId] = newPlaylist;
				thisUser.savePlaylist(data.playlistId);
			});
			
			socket.on('playlist:addVideo', function(data) {
				if (playlists[data.playlistId].addVideo(data.playlistId, data.videoId, data.thumb, data.title, data.duration, data.author)) {
					thisUser.savePlaylist(data.playlistId);
					//console.log('playlist is now: '+JSON.stringify(playlists[data.playlistId].get("videos").pluck("title")));
				}
			}); 

			socket.on('playlist:moveVideoToTop', function(data) {
				if (playlists[data.playlistId].moveToTop(data.videoId)) {
					thisUser.savePlaylist(data.playlistId);
					//console.log('playlist is now: '+JSON.stringify(playlists[data.playlistId].get("videos").pluck("title")));
				}
			});

			socket.on('playlist:delete', function(data) {
				if (playlists[data.playlistId].deleteVideo(data.videoId)) {
					thisUser.savePlaylist(data.playlistId);
					//console.log('playlist is now: '+JSON.stringify(playlists[data.playlistId].get("videos").pluck("title")));
				}
			});
			
			socket.on('playlist:moveVideo', function(data) {
				if (playlists[data.playlistId].moveToIndex(data.videoId, data.index)) {
					thisUser.savePlaylist(data.playlistId);
					//console.log('playlist is now: '+JSON.stringify(playlists[data.playlistId].get("videos").pluck("title")));
				}
			})
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
	
	var MAX_DJS = 3;
	
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
				var roomName = djs.room.get('name');
				console.log('\n\n['+roomName+'][socket] [dj:join] requesting to be dj: '+ djs.room.users.get(socket.id).get('name'));

				var users = djs.room.users;
				//in order to be a dj, the user has to have vids in his playlist, has to not be a dj, and
				//the dj list can't be full
				if(djs.length < 4 && users.get(socket.id).playlist.getSize() > 0 && !djs.get(socket.id)) {
					console.log('\t\t\t\t...success! '+ users.get(socket.id).get('name')+' is now a DJ');
					var currUser = users.get(socket.id);
					var numDJs = djs.length;
					djs.addDJ(currUser, numDJs);

					djs.room.sockM.announceDJs(); 

					if(djs.length == 1) { //this user is the only human dj
						if(djs.room.currVideo) {	//VAL is playing a video, need to clear it
							console.log('['+roomName+'][socket] [dj:join] -- clearing the timeout for VAL\'s video'+djs.room.currVideo.get('timeoutId'));
							clearTimeout(djs.room.currVideo.get('timeoutId'));
						}
						djs.nextDJ();
						djs.room.vm.playVideoFromPlaylist(socket.id);
					}
				}
			});

			socket.on('dj:quit', function() { 
				var roomName = djs.room.get('name');
				console.log("\n\n["+roomName+"][socket] [dj:quit] -- quit dj event called for socket " + socket.id);
				djs.removeDJ(socket.id) 
			});
			
			socket.on("video:skip", function () { 
				var roomName = djs.room.get('name');
				console.log('\n\n['+roomName+'][socket] [video:skip] -- called...')
				if(djs.room.currVideo) {
					console.log('...video playing, clearing timeout :'+djs.room.currVideo.get('timeoutId'));
					clearTimeout(djs.room.currVideo.get('timeoutId'));
				}
				djs.room.vm.onVideoEnd();
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
			
			var roomName = this.room.get('name');
			console.log('['+roomName+'][DJS] removeDJ(): djIndex of user is '+djIndex);

			if(djIndex < 0) return false;
			
			if(this.currDJIndex >= djIndex && this.currDJIndex > 0) {	
				this.currDJIndex = this.currDJIndex - 1;
			}
			if(this.currDJ != null && this.currDJ.get('socketId') == socketId) {
				this.currDJ = null;
			} 
			this.remove(socketId);
			
			this.room.sockM.announceDJs();
			if(this.room.currVideo != null && this.room.currVideo.get('dj') == this.room.users.get(socketId).get('userId')) {
					console.log('['+this.room.get('name')+'][DJS] removeDJ(): the DJ removed was the current one, clearing timeout: '+
						this.room.currVideo.get('timeoutId'));
					clearTimeout(this.room.currVideo.get('timeoutId'));
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
	
		getNumVideos: function() {
			var numVideos = 0;
			this.each(function(user) {
				if(user.playlist) {
					numVideos += user.playlist.getSize();
				}
			});
			return numVideos;
		},
		
		//note this function changes program state 
		//(it doesn't just return true/false)
		//If it is VAL's turn, this.currDJ is set to null
		isValsTurn: function() {

			var numDJs = this.length;
			console.log('['+this.room.get('name')+'][DJC] isValsTurn(): human djs: '+ numDJs)
			if(numDJs == 0) {
				console.log('...VAL is DJ!')
				return true;
			}
			else if(numDJs == 1) { 
				var nextDJInfo = this.peekNextDJ();
				if(nextDJInfo.dj == this.currDJ) {
					console.log('...it\'s VAL\'s turn');
					this.currDJ = null;
					return true;
				}
				console.log('...no');
				return false;
			}
			
			if(this.currDJIndex == (this.length - 1) && this.currDJ != null) {
				console.log('...it\'s VAL\'s turn');
				this.currDJ = null;
				return true;
			}
			console.log('...no');
			return false;
		},
		
		peekNextDJ: function() {
			var nextDJIndex = (this.currDJIndex + 1) % this.length;
			var nextDJ = this.at(nextDJIndex);
			return { dj: nextDJ, index: this.currDJIndex };
		}
	});
	
	
	/*************************/
	/*         Meter         */
	/*************************/
	
	var SKIP_PERCENT_THRESHOLD = 35;
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
			var roomName = this.room.get('name');
			socket.on('meter:upvote', function() {
				if(!meter.room.currVideo) return;

				var currUser = meter.room.users.get(socket.id);
				
				if(currUser) console.log('['+roomName+'][socket] [meter:upvote]  voting user: '+currUser.get('name') + ' for video: '+meter.room.currVideo.get('title'));
				
				
				if(meter.room.currVideo.get('dj') != 'VAL' && currUser.get('userId') == meter.room.djs.currDJ.get('userId')) return; 	//the DJ can't vote for himself

				var success = meter.addUpvote(currUser.get('userId'));	//checks to make sure the user hasn't already voted
				if(success) {
					console.log('...success!');
					if(meter.room.currVideo.get('dj') != 'VAL')
						meter.room.djs.currDJ.addPoint();
					meter.room.sockM.announceMeter();
				}
			});

			socket.on('meter:downvote', function() {
				if(!meter.room.currVideo) return;

				var currUser = meter.room.users.get(socket.id);
				if(currUser) console.log('['+roomName+'][socket] [meter:upvote]  voting user: '+currUser.get('name') + ' for video: '+meter.room.currVideo.get('title'));
				if(meter.room.currVideo.get('dj') != 'VAL' && currUser.get('userId') == meter.room.djs.currDJ.get('userId')) return;

				var success = meter.room.meter.addDownvote(currUser.get('userId'));	//checks to make sure the socket hasn't already voted
				if(success) {
					console.log('..success!');
					if(meter.room.currVideo.get('dj') != 'VAL')
						meter.room.djs.currDJ.subtractPoint();
					
					var currPercent = meter.calculatePercent();
					if(currPercent < SKIP_PERCENT_THRESHOLD) {
						console.log('\n\n['+roomName+'][socket] [meter:downvote] called, percent below threshold...skipping current video');
						if(meter.room.currVideo) {
							console.log('...video playing, clearing timeout :'+meter.room.currVideo.get('timeoutId'));
							clearTimeout(meter.room.currVideo.get('timeoutId'));
						}
						meter.room.vm.onVideoEnd();
					}
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
		
		calculatePercent: function() { 
			var numUp = this.up, 
				numDown = this.down,
				numUsers = this.room.users.length,
				basePercent = 50;
			
			var percentUp, percentDown;
			if(numUsers == 0) {
				percentUp = (1.0 * numUp) * (100 - basePercent);
				percentDown = (1.0 * numDown) * (100 - basePercent);
			} else {
				percentUp = ((1.0 * numUp) / numUsers) * (100 - basePercent);
				percentDown = ((1.0 * numDown) / numUsers) * (100 - basePercent);
			}
			var videoScore = basePercent + percentUp - percentDown;
			console.log('['+this.room.get('name')+'][MET] calculatePercent(): percent for video is '+videoScore+' with up: '+numUp+' and down: '+numDown+' and numUsers: '+numUsers);
			return videoScore;
		}

	});
	
}) ()

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function ss_modelWithAttribute(collection, attribute, valueToMatch) {
	for (var i = 0; i < collection.length; i++) {
		if (collection.at(i).get(attribute) == valueToMatch) {
			return collection.at(i);
		}
	}
	return null;
}