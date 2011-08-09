$(function(){
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