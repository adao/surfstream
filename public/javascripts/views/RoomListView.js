$(function(){
	window.RoomListView = Backbone.View.extend({
		
		roomListTemplate: _.template($('#roomlist-template').html()),

		initialize: function () {
			$(this.el).html(this.roomListTemplate());
		},
		
		hide : function() {
			$("#room-modal").hide();
		},
	
		show : function() {
			$("#room-modal").show();
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