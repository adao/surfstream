$(function(){
	window.RoomListView = Backbone.View.extend({
		
		roomListCellTemplate: _.template($('#roomlistCell-template').html()),

		initialize: function () {
			$(this.el).html(this.roomListCellTemplate(
																						{viewers: this.options.viewers,
																						 numDjs: this.options.numDjs
																						}));
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