$(function(){
	window.PlaylistCellView = Backbone.View.extend({
		playlistCellTemplate: _.template($('#video-list-cell-template').html()),
				
		
		initializeView: function () {
			var buttonRemove, buttonToTop, videoID;
			//Hack because of nested view bindings part 2 (events get eaten by Sidebar)
			this.render();
			$("#video-list .videoListContainer").append(this.el);
			videoID = this.options.playlistItemModel.get("vid_id");
			buttonRemove = $("#remove_video_" + videoID );
			buttonRemove.bind("click", {videoModel: this.options.playlistItemModel },this.removeFromPlaylist);
			buttonToTop = $("#send_to_top_" + videoID);
			buttonToTop.bind("click", {videoModel: this.options.playlistItemModel , context: this}, this.toTheTop);
			this.options.playlistItemModel.bind("remove", this.removeFromList, this); 
		},
		
		removeFromPlaylist : function(event) {
			event.data.videoModel.destroy();
			SocketManagerModel.deleteFromPlaylist(event.data.videoModel.get("vid_id"));
		},
		
		toTheTop : function(event) {
			var copyPlaylistItemModel = new PlaylistItemModel(event.data.videoModel.attributes);
			var collectionReference = event.data.videoModel.collection;
			event.data.videoModel.destroy();
			collectionReference.add(copyPlaylistItemModel, {at: 0, silent: true});
			SocketManagerModel.toTopOfPlaylist(event.data.videoModel.get("vid_id"));
			var playlistCellView = new PlaylistCellView({playlistItemModel: copyPlaylistItemModel});
			var buttonRemove, buttonToTop, videoID;
			playlistCellView.render();
			$("#video-list .videoListContainer").prepend(playlistCellView.el);
			videoID = copyPlaylistItemModel.get("vid_id");
			buttonRemove = $("#remove_video_" + videoID);
			buttonRemove.bind("click", {videoModel: copyPlaylistItemModel  },event.data.context.removeFromPlaylist);
			buttonToTop = $("#send_to_top_" + videoID);
			buttonToTop.bind("click", {videoModel: copyPlaylistItemModel, context: event.data.context }, event.data.context.toTheTop);
			copyPlaylistItemModel.bind("remove", event.data.context.removeFromList, event.data.context);
		},
		
		render: function() {
			$(this.el).html(this.playlistCellTemplate({title: this.options.playlistItemModel.get('title'), vid_id: this.options.playlistItemModel.get("vid_id")}));
			this.$(".thumbContainer").attr("src", this.options.playlistItemModel.get("thumb"));
			return this;
		},
		
		removeFromList : function (playlistItemModel, collection) {
			//hack because backbone sucks
			$("#vid_"+playlistItemModel.attributes.vid_id).remove();
		}
	});
});