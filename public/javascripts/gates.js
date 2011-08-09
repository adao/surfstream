$(function(){
	console.log("IN GATES");
	_.templateSettings = {
	  interpolate : /\{\{(.+?)\}\}/g
	};
	
	ZeroClipboard.setMoviePath('/swf/ZeroClipboard.swf');

	socket_init = io.connect();
	
	window.SocketManagerModel = Backbone.Model.extend({
		initialize: function () {
			var socket, app;
			socket = this.get("socket");
			app = this.get("app");
			if (!socket){
				throw "No Socket Passed to SocketManager!";
			} else {
				console.log("Got socket. " + socket);
			}
			
			if (!app){
				throw "No App Passed to SocketManager!";
			} else {
				console.log("Got app. " + app);
			}
			
			
			
			/* First set up all listeners */
			//Chat -- msg received
			
			socket.on("video:sendInfo", function(video) {
				//video.video = videoID, video.time = seconds into video
				if(!window.playerLoaded) {
					window.playerLoaded = true;
					var params = { allowScriptAccess: "always" };
					var atts = { id: "YouTubePlayer"};
					swfobject.embedSWF("http://www.youtube.com/apiplayer?enablejsapi=1&playerapiid=YouTubePlayer",
				                       "video-container", "640", "390", "8", null, null, params, atts);
					window.secs = video.time;
					window.video_ID = video.video;
					playerLoaded = true;
					
				} else {
					window.YTPlayer.loadVideoById(video.video, video.time);
					new ChatCellView({username: "SurfStream.tv", msg: "Now playing " + video.title});
					window.SurfStreamApp.get("mainView").chatView.chatContainer.activeScroll();
				}
				//HACK
				$("#room-name").html(video.title)
				//ENDHACK
			});
			
			socket.on('video:stop', function() {
				if(!window.playerLoaded) return;
				console.log('video ending!');
				window.YTPlayer.stopVideo();
				window.YTPlayer.clearVideo();
			});
			
			socket.on('playlist:refresh', function(videoArray) {
				app.setPlaylist(videoArray);
			});
			
			socket.on('message', function(msg) {
				window.SurfStreamApp.get("roomModel").get("chatCollection").add({username: msg.data.attrs.name, msg: msg.data.attrs.text});
				TheatreView.tipsyChat(msg.data.attrs.text, msg.data.attrs.fbid);				
			});
			
			
			socket.on('users:announce', function(userJSONArray) {
				//userJSONArray is an array of users, with .userId = fbid#, .name = full name, .avatar = TBD,
				// .points = TBA, .x = top coord for room-conatiner, .y = leftmost coord for room-container
				app.get("roomModel").updateDisplayedUsers(userJSONArray);
			});
			
			
			socket.on('dj:announceDJs', function(djArray) {
				for (dj in djArray) {
					$("#"+ djArray[dj].id).css("border-style", "solid").css("border-color","yellow");
				}
			});
			
			//.upvoteset maps userids who up to true, .down, .up totals
			socket.on("meter:announce", function(meterStats) {
				for (fbid in meterStats.upvoteSet){
					if (meterStats.upvoteSet[fbid] == true) {
						//app.get("roomModel").get("users").get(fbid).
						//BEGIN HACK
						if ($("#" + fbid).css("border-color") != "yellow") {
							$("#" + fbid).css("border-width", $("#" + fbid).css("border-width") + 20 + "px");
							$("#" + fbid).css("border-color","#98bf21");
							$("#" + fbid).css("border-style","solid");
						}
						//ENDHACK
					}
				}
			});
			

		},
		
		/* Initialize first contact */
		makeFirstContact : function(user) {	
			var socket = this.get("socket");		
			socket.emit('user:sendFBData', user);		
		}
		
		
	},{
		socket: socket_init,
		
		/* Outgoing Socket Events*/
		
		sendMsg: function(data) {
			this.socket.emit("message",data);
		},
		
		becomeDJ : function() {
			this.socket.emit('dj:join');
		},	
		
		stepDownFromDJ : function() {
			this.socket.emit('dj:quit');
		},
		
		addVideoToPlaylist : function(video, thumb, title) {
			this.socket.emit('playlist:addVideo', {video: video, thumb: thumb, title: title });			
		},
		
		voteUp : function() {
			SocketManagerModel.socket.emit('meter:upvote');
		},
		
		voteDown : function() {
			SocketManagerModel.socket.emit('meter:downvote');
		},
		
		toTopOfPlaylist : function(vid_id) {
			this.socket.emit("playlist:moveVideoToTop", {video: vid_id});
		},
		
		deleteFromPlaylist : function(vid_id) {
			this.socket.emit("playlist:delete", {video: vid_id})
		}		
	
	});
	
	window.SurfStreamModel = Backbone.Model.extend({
		defaults: {
			sharing: new ShareModel			
		},
		
		initialize: function () {
			
			this.set({mainView: new MainView()})
			
			this.set({
				roomModel: new RoomModel({
					playerModel: new VideoPlayerModel,
					chatCollection: new ChatCollection,
					userCollection: new UserCollection
				}),
				socketManagerModel: new SocketManagerModel({
					socket: this.get("socket"), 
					app: this
				}),
				searchBarModel: new SearchBarModel({
					searchResultsCollection: new SearchResultsCollection
				})
			});
			this.set({userModel: new UserModel({is_main_user: true, playlistCollection: new PlaylistCollection, socketManagerModel: this.get("socketManagerModel")})})
								
			this.get('userModel').getUserData(this.get('userModel'));
			//Give the chat view a reference to the room's chat collection
			this.get("mainView").initializeTopBarView();
			//initializeShareBar (this.get(sharing))
			this.get("mainView").initializeChatView(this.get("roomModel").get("chatCollection"), this.get("userModel"));
			this.get("mainView").initializeSidebarView(this.get("searchBarModel"), this.get("userModel").get("playlistCollection"));
			this.get("mainView").initializePlayerView(this.get("roomModel").get("playerModel"), this.get("roomModel").get("userCollection"));
			
			
			//this.setVideos([{video: "THIS"}, {video: "WORKS"}]);
			//this.addUserToCurRoom({userId: "ebabchick", x: 20, y:60})
			//Make sure everything gets initialized first before we start the view magic
			//This can change to render some thing before we init the models and then
			//finish here later				
							
		},
		
		
		
		setPlaylist : function(videos) {
			for (var index in videos){
				this.get("userModel").get("playlistCollection").add({title: videos[index].title, thumb: videos[index].thumb, vid_id: videos[index].id});
			}
		},
	});		
	
	window.playerLoaded = false;
	window.SurfStreamApp = new SurfStreamModel({socket: socket_init});
	console.log("started app");
	
});

function onYouTubePlayerReady(playerId) {
	if (playerId == "YouTubePlayerTwo") {
		window.YTPlayerTwo.loadVideoById(window.videoIdTwo);
	}
	
	if(!window.YTPlayer) {
    window.YTPlayer = document.getElementById('YouTubePlayer');
    window.YTPlayer.addEventListener('onStateChange', 'onytplayerStateChange');
		window.playerLoaded = true;
		if(window.video_ID) {
			window.YTPlayer.loadVideoById(window.video_ID, window.secs);
		}
	}
}

function setToTime() {
		window.YTPlayer = document.getElementById('YouTubePlayer');
		window.YTPlayer.addEventListener('onStateChange', 'onytplayerStateChange');
		window.YTPlayer.seekTo(window.secs);
}

function setVideoVolume(event) {
	var volume = window.YTPlayer.getVolume();
	if (volume + event.data.offset >= 0 && volume + event.data.offset <= 100) {
		window.YTPlayer.setVolume(volume + event.data.offset);
	}
}

function mute(event) {
	if (window.YTPlayer.isMuted()) {
		window.YTPlayer.unMute();
		event.data.button.css("background", 'url("http://i.imgur.com/euzaw.png") 50% 50% no-repeat');
	} else {
		window.YTPlayer.mute();		
		event.data.button.css("background", 'url("http://i.imgur.com/c77ZF.png") 50% 50% no-repeat');
	}
}
    
function onytplayerStateChange(newState) {
/*	$('#state').html("Player state: "+newState);
	if(newState == 0 && currVideo.isLeader) { 
		console.log("Video finished, broadcasting back to server");
		socket.emit('videoFinished');
		currVideo = {};
	} */
}

function skipVideo() {
	socket_init.emit("video:skip");
}