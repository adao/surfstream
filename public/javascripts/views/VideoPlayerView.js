$(function(){
	window.VideoPlayerView = Backbone.View.extend({
		
		el: "#funroom",
		
		roomTemplate: _.template($('#room-template').html()),
		
		
		
		initialize: function () {
			$(this.el).html(this.roomTemplate());
			if(window.playerLoaded) {
				//WUT LOL
				//ytplayer.loadVideoById(currVideo.video, currVideo.time);
			} else {
				var params = { allowScriptAccess: "always" };
				var atts = { id: "YouTubePlayer"};
				swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=YouTubePlayer",
			                       "video-container", "640", "390", "8", null, null, params, atts);
			}
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