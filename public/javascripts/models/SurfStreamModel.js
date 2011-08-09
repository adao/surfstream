$(function(){
	window.SurfStreamModel = Backbone.Model.extend({
		defaults: {
			sharing: new ShareModel			
		},
		
		initialize: function () {
			
			this.set({mainView: new MainView()})
			
			this.set({
				roomModel: new RoomModel({
					playerModel: new VideoPlayerModel,
					chatCollection: new ChatCollection,
					userCollection: new UserCollection
				}),
				socketManagerModel: new SocketManagerModel({
					socket: this.get("socket"), 
					app: this
				}),
				searchBarModel: new SearchBarModel({
					searchResultsCollection: new SearchResultsCollection
				})
			});
			this.set({userModel: new UserModel({is_main_user: true, playlistCollection: new PlaylistCollection, socketManagerModel: this.get("socketManagerModel")})})
								
			this.get('userModel').getUserData(this.get('userModel'));
			//Give the chat view a reference to the room's chat collection
			this.get("mainView").initializeTopBarView();
			//initializeShareBar (this.get(sharing))
			this.get("mainView").initializeChatView(this.get("roomModel").get("chatCollection"), this.get("userModel"));
			this.get("mainView").initializeSidebarView(this.get("searchBarModel"), this.get("userModel").get("playlistCollection"));
			this.get("mainView").initializePlayerView(this.get("roomModel").get("playerModel"), this.get("roomModel").get("userCollection"));
			
			
			//this.setVideos([{video: "THIS"}, {video: "WORKS"}]);
			//this.addUserToCurRoom({userId: "ebabchick", x: 20, y:60})
			//Make sure everything gets initialized first before we start the view magic
			//This can change to render some thing before we init the models and then
			//finish here later				
							
		},
		
		
		
		setPlaylist : function(videos) {
			for (var index in videos){
				this.get("userModel").get("playlistCollection").add({title: videos[index].title, thumb: videos[index].thumb, vid_id: videos[index].id});
			}
		},
	});
});