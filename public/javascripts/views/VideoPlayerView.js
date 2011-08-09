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