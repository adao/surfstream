$(function(){
	window.SearchCellView = Backbone.View.extend({
		
		searchCellTemplate: _.template($('#searchCell-template').html()),
		
		className: "searchCellContainer",
		
		events: {
			"click .addToPlaylist" : "addToPlaylist",
			"click .previewVideo" : "previewVideo"
    	},
		
		initialize: function () {
			$("#searchContainer").append(this.render().el);
		},
		
		addToPlaylist: function (){
			var videoID = this.options.video.get("videoUrl").replace("http://gdata.youtube.com/feeds/api/videos/", "");
			this.options.video.set({vid_id: videoID});
			var playlistItemModel = new PlaylistItemModel(this.options.video.attributes);
			this.options.playlistCollection.add(playlistItemModel);
			SocketManagerModel.addVideoToPlaylist(videoID, this.options.video.get("thumb"), this.options.video.get("title"));
		},
		
		previewVideo: function() {
			var videoID = this.options.video.get("videoUrl").replace("http://gdata.youtube.com/feeds/api/videos/", "");
			if(!window.playerTwoLoaded) {
				if (!window.YTPlayerTwo) {
					window.YTPlayerTwo = document.getElementById('YouTubePlayerTwo');
				}
				window.playerTwoLoaded = true;
				window.videoIdTwo = videoID;
				$("#preview-container").css('display', 'block');
				//$('#preview-container').slideDown("slow");
				//$("#searchContainer").css("height", 187);
				// $("#preview-container").animate({
				// 					height: 195
				// 				}, "slow", null, function() {
				// 					window.YTPlayerTwo.loadVideoById(window.videoIdTwo);
				// 				});
				// $("#searchContainer").animate({
				// 					height: 165
				// 				}, "slow");
				$("#searchContainer").css('height', 133);
			} else {
				window.YTPlayerTwo.loadVideoById(videoID);
			}
		},
		
		render: function(searchResult) {
			$(this.el).html(this.searchCellTemplate({thumb: this.options.video.get("thumb"), title: this.options.video.get("title"), vid_id: this.options.video.get("videoUrl").replace("http://gdata.youtube.com/feeds/api/videos/", "")}));
			$(this.el).find(".thumbContainer").attr("src", this.options.video.get("thumb"));
			return this;
		}
		
	});
});