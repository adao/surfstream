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
			this.currVideo = new models.Video();
			this.history = new models.VideoCollection();
		},
	});

	models.Video = Backbone.Model.extend({
		defaults: {
			'videoId': null,
			'duration': 0,
			'timeStart': null,
			'timeoutId': null,
			'timesPlayed': 0,
			'upvotes': 0,
			'downvotes': 0
		},
	});
	
	models.VideoCollection = Backbone.Collection.extend({
		model: models.Video
	});

	//usage: var myPlaylist = new PlaylistModel();
	//			 myPlaylist.addVideoId(i2V_ZT-nyOs);
	models.PlaylistModel = Backbone.Model.extend({
		initialize: function() {
			this.videos = new models.VideoCollection();
		},

		addVideoId: function(id) {
			var vid = new models.Video();
			vid.id = id;
			vid.set({ videoId: id});
			this.videos.add(vid);
		},
		
		moveVideo: function(videoId, indexToMove) {
			var video = this.get(videoId);
			if(video) {
				this.videos.remove(video);
				this.videos.add(video, { at: indexToMove });
			}
		},
		
		//returns the first Video, and moves the Video
		//to the end of the playlist 
		playFirstVideo: function() {
			if(this.videos.length == 0) {
				return null;
			}
			var first = this.videos.at(0);
			this.videos.remove(first);
			//this.videos.add(first);	//adds video to the end;
			return first;
		},
		
		deleteVideo: function(videoId) {
			this.videos.remove(videoId);
		}
	});
	
	var X_MAX = 100;
	var Y_MAX = 100;
	
	models.User = Backbone.Model.extend({
		defaults: {
			'avatar': null,
			'points': 0,
			'xCoord': 0,
			'yCoord': 0
		},
		
		initialize: function() {
			this.id = this.get('socketId');	
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
		}
		
	});

	models.UserCollection = Backbone.Collection.extend({
		model: models.User
	});
	
	var MAX_DJS = 4;
	models.DJCollection = Backbone.Collection.extend({
		model: models.User,
		
		addDJ: function(user, index) {
			if(this.length >= MAX_DJS || index > MAX_DJS || index < 0) return false;
			this.add(user, {at: index});
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