$(function(){
	window.PlaylistView = Backbone.View.extend({
		id: 'video-list',
	
		videoListTemplate: _.template($('#video-list-template').html()),
	
		initialize: function () {
			this.options.playlistCollection.bind('add', this.addVideo, this);
			this.render();
		},
	
		hide : function() {
			$("#video-list").hide();
		},
	
		show : function() {
			$("#video-list").show();
		},
	
		render: function() {
			$(this.el).html(this.videoListTemplate());
			$(".videoView").append(this.el);
			return this;
		},
	
		addVideo: function (playlistItemModel) {
			var playlistCellView = new PlaylistCellView({playlistItemModel: playlistItemModel});
			playlistCellView.initializeView();
		}
	});
});