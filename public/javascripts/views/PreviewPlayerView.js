$(function(){
	window.PreviewPlayerView = Backbone.View.extend({
		
		el: "#previewContainer",
		
		previewTemplate: _.template($('#search-preview-template').html()),
		
		events: {
			"click #close-preview-player" : "hidePreviewPlayer",
    	},
		
		initialize: function () {
			$(this.el).html(this.previewTemplate());
			if(false) {
				//WUT LOL
				//ytplayer.loadVideoById(currVideo.video, currVideo.time);
			} else {
				var params = { allowScriptAccess: "always", allowFullScreen: 'false' };
				var atts = { id: "YouTubePlayerTwo"};
				swfobject.embedSWF("http://www.youtube.com/v/9jIhNOrVG58?version=3&enablejsapi=1&playerapiid=YouTubePlayerTwo",
			                       "preview-player", "299", "183", "8", null, null, params, atts);
			}
		},
		
		hidePreviewPlayer: function() {
			window.playerTwoLoaded = false;
			// $("#preview-container").animate({
			// 	height: 0,
			// 	width: 0
			// }, "slow", null, function() {
			// 	$("#preview-container").css('display', 'none');
			// });
			$("#preview-container").css('display', 'none');
			$("#searchContainer").css('height', 360);
			// $("#searchContainer").animate({
			// 	height: 360
			// }, "slow");
			
		}
	});
});