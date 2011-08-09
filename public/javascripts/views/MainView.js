$(function(){
	window.MainView = Backbone.View.extend({
		el: 'body',
		
		initialize: function () {
			
		},
		
		initializeTopBarView: function () {
			this.roomInfoView = new RoomInfoView(({roomName: 'Placeholder'}));
			this.shareBarView = new ShareBarView();
		},
			
		initializeChatView: function (chatCollection, userModel) {
			this.chatView = new ChatView({chatCollection: chatCollection, userModel: userModel});
		},
		
		initializeSidebarView: function (searchBarModel, playlistCollection) {
			this.sideBarView = new SideBarView({searchBarModel: searchBarModel, playlistCollection: playlistCollection});
		},
		
		initializePlayerView : function (playerModel, userCollection) {
			this.videoPlayerView = new VideoPlayerView({playerModel: playerModel});
			this.theatreView = new TheatreView({userCollection: userCollection});			
		}
		
		
	});
});