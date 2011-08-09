$(function(){
	window.TheatreView = Backbone.View.extend({
		
		el: '#room-container',
		
		initialize: function () {
			$("#dj").bind("click", this.toggleDJStatus); 	
			$("#up-vote").bind("click", SocketManagerModel.voteUp);
			$("#down-vote").bind("click", SocketManagerModel.voteDown);
			$("#vol-up").bind("click", {offset: 10}, setVideoVolume);
			$("#vol-down").bind("click", {offset: -10}, setVideoVolume);
			$("#mute").bind("click", {button: $("#mute")}, mute);
			
			this.options.userCollection.bind("add", this.placeUser, this);
			this.options.userCollection.bind("remove", this.removeUser, this);		
			this.chats = [];
		},

		
		toggleDJStatus : function () {
			if (this.innerHTML != "Step Down") { 
				SocketManagerModel.becomeDJ();
				this.innerHTML = "Step Down";
				$("#people-area").append("<button id='skip'> Skip Video </button>");
	 			$("#skip").bind("click", skipVideo);
			} else { 
				SocketManagerModel.stepDownFromDJ();
			  this.innerHTML = "Become DJ";
				$("#skip").remove();
			}
		},
		
		placeUser : function(user) {
			this.$("#people-area").append("<img id='" + user.id + "' src=http://graph.facebook.com/"+ user.id + "/picture style='position:absolute; margin-left:" + user.get("x") + "px; margin-top:" + user.get("y") + "px;' >");
			this.$("#" + user.id).tipsy({gravity: 'sw', fade: 'true', delayOut: 3000, trigger: 'manual', title: function() { return this.getAttribute('latest_txt') }});
		},
		
		removeUser: function(user) {
			this.$("#" + user.id).remove();
		}
		
		
	},{ /* Class properties */
	
		tipsyChat : function(text, fbid) {
			var userPic = $("#" + fbid);
			userPic.attr('latest_txt', text);
			userPic.tipsy("show");
			setTimeout(function(){userPic.tipsy("hide")}, 3000);
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