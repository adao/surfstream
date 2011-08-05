(function() {
	_ = require('underscore')._;
  Backbone = require('backbone');
	models = exports;

	models.Room = Backbone.Model.extend({
		defaults: {
			'name': '',
			'creator': '',
			'roomId': 0
		},
		
		initialize: function() {
			this.users = new models.UserCollection();
			this.djs = new models.DJCollection();
			this.meter = new models.Meter();
			this.currVideo = null;
			this.history = new models.VideoCollection();
		},
		
		clearVideo: function() {
			this.currVideo = null;
		},
		
		remove: function(socketId) {
			this.users.remove(socketId);
			this.djs.removeDJ(socketId);
		}
	});

	models.Video = Backbone.Model.extend({
		defaults: {
			'videoId': null,
			'duration': -1,
			'timeStart': null,
			'timeoutId': null,
			'timesPlayed': -1,
			'up': 0,
			'down': 0
		},
		
		xport: function() {
			return { videoId: this.get('videoId'), thumb: this.get("thumb"), title : this.get("title"), id: this.id };
		}
	});
	
	models.VideoCollection = Backbone.Collection.extend({
		model: models.Video
	});

	//usage: var myPlaylist = new Playlist();
	//			 myPlaylist.addVideoId(i2V_ZT-nyOs);
	models.Playlist = Backbone.Model.extend({
		initialize: function() {
			this.videos = new models.VideoCollection();
		},

		addVideoId: function(id, thumb, title) {
			if(this.videos.get(id) >= 0)
				return false;
			var vid = new models.Video();
			vid.id = id;
			vid.set({ videoId: id, thumb: thumb, title: title});
			this.videos.add(vid);
		},
		
		getSize: function() {
			return this.videos.length;
		},
		
		// moveVideo: function(videoId, indexToMove) {
		// 		var video = this.get(videoId);
		// 		if(video) {
		// 			this.videos.remove(video);
		// 			this.videos.add(video, { at: indexToMove });
		// 		}
		// 	},
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
				this.videos.add(video, { at: this.videos.length });
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
			//console.log('video playlist will be saved as: '+JSON.stringify(videoExport));
			return JSON.stringify(videoExport);
		},
		
		mport: function(rawVideoData) {
			for(var i= 0; i < rawVideoData.length; i = i+1) {
				var video = rawVideoData[i];
				//console.log('importing video to playlist: '+video.videoId);
				this.videos.add(new models.Video({ videoId: video.videoId }));
			}
		}
		
	});
	
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

	models.UserCollection = Backbone.Collection.extend({
		model: models.User,
		
		xport: function() {
			var array = new Array();
			this.each(function(user) {
				array.push(user.xport());
			});
			return array;
		}
	});
	
	var MAX_DJS = 4;
	
	models.DJCollection = Backbone.Collection.extend({
		model: models.User,
		
		initialize: function() {
			this.currDJIndex = 0;
			this.currDJ = null;
		},
		
		addDJ: function(user, index) {
			if(this.length >= MAX_DJS || index > MAX_DJS || index < 0) return false;
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
		}
	});
	
	models.Meter = Backbone.Model.extend({
		initialize: function() {
			this.upvoteSet = {};
			this.downvoteSet = {};
			this.up = 0;
			this.down = 0;
			this.percentage = 0;
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
		}, 
	});

}) ()