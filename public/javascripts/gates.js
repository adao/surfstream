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
					new ChatCellView({username: "surfstream.tv", msg: "Now playing " + video.title});
					window.SurfStreamApp.get("mainView").chatView.chatContainer.activeScroll();
				}
				//HACK
				$("#room-name").html(video.title)
				app.get("roomModel").get("userCollection").forEach(function(userModel) {
					var user =  $("#" + userModel.get("id"));
					if (user.attr("isDJ") != "1") {
						user.css("border-width", "0px");
					} else {
						user.css("border-width", "2px");
						user.css("border-color", "yellow");
					}
					
				})
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
				app.get("roomModel").get("chatCollection").add({username: msg.data.name, msg: msg.data.text});
				TheatreView.tipsyChat(msg.data.text, msg.data.id);				
			});
			
			
			socket.on('users:announce', function(userJSONArray) {
				//userJSONArray is an array of users, with .userId = fbid#, .name = full name, .avatar = TBD,
				// .points = TBA, .x = top coord for room-conatiner, .y = leftmost coord for room-container
				app.get("roomModel").updateDisplayedUsers(userJSONArray);
			});
			
			
			socket.on('djs:announce', function(djArray) {
				app.get("roomModel").get("userCollection").forEach(function(userModel) {
					var user =  $("#" + userModel.get("id"));
					user.attr("isDJ", "0")
				})
				for (var dj in djArray) {
					$("#"+ djArray[dj].id).css("border-style", "solid").css("border-color","yellow").css("border-width", "2px");
					$("#"+ djArray[dj].id).attr("isDJ", "1")
				}
				app.get("roomModel").get("userCollection").forEach(function(userModel) {
				var user =  $("#" + userModel.get("id"));
				if (user.attr("isDJ") != "1" && user.css("border-right-color") == "rgb(255, 255, 0)") {
					user.css("border-width", "0px");
				}
					
				})
			});
			
			//.upvoteset maps userids who up to true, .down, .up totals
			socket.on("meter:announce", function(meterStats) {
				for (var fbid in meterStats.upvoteSet){
					if (meterStats.upvoteSet[fbid] === true) {
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
	
	window.playerLoaded = false;
	window.SurfStreamApp = new SurfStreamModel({socket: socket_init});
	console.log("started app");
	
});

