var PlaylistController = {
	init: function(socket, el) {
		this.socket = socket;
		this.model = new models.PlaylistModel();
		this.view = new PlaylistView({ model: this.model, el: el }); 
		
		var view = this.view;
		this.socket.on('refreshPlaylist', function(data) { 
			console.log('Received playlist from server, value: '+data);
			view.refreshPlaylist(data);
		});
		
		return this;
	},
	
	addVideo: function(videoId) {
		this.model.addVideoId(videoId);
		this.socket.emit('playlistAddVideo', { video: videoId });
	},
	
	moveVideo: function(videoId, indexToMove) {
		this.model.moveVideo(videoId, indexToMove);
		this.socket.emit('playlistMoveVideo', { videoId: videoId, indexToMove: indexToMove });
	}
}

var NodeChatController = {
	init: function(socket) {
		this.socket = socket;
		var mysocket = this.socket;

		this.model = new models.NodeChatModel();
		console.log('created the model and view');
		this.view = new NodeChatView({model: this.model, socket: this.socket, el: $('#content')});
		var view = this.view;

		this.socket.on('message', function(msg) {view.msgReceived(msg)});
		this.view.render();

		return this;
	}
};
