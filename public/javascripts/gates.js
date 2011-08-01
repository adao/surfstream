$(function(){
	
	_.templateSettings = {
	  interpolate : /\{\{(.+?)\}\}/g
	};
	/**************/
	/*** MODELS ***/
	/**************/
	
	window.ChatMessageModel = Backbone.Model.extend({});
	
	window.PlayerModel = Backbone.Model.extend({
		initialize: function () {
			
		}
	});
	
	
	window.RoomModel = Backbone.Model.extend({		
		initialize: function () {
			
		}
		
	});
	
	window.SearchModel = Backbone.Model.extend({
		
		executeSearch : function(searchQuery) {
			this.set({searchTerm: searchQuery});
			$.ajax({
				url:"http://gdata.youtube.com/feeds/api/videos?max-results=10&alt=json&q=" + searchQuery,
			  success: $.proxy(this.processResults, this)
			});
		},
		
		processResults: function(data) {
			var feed, entries, resultsCollection, buildup;
			feed = data.feed;
		  entries = feed.entry || [];
			resultsCollection = this.get("resultsList");
			buildup = [];
		  for (var i = 0; i < entries.length; i++) {
		    var entry = entries[i];
		    var videoResult = {
		      title: entry.title.$t,
		      image_src: entry.media$group.media$thumbnail[0].url,
		      videoUrl: entry.id.$t
		    };
					buildup.push(videoResult);			
		  }
			resultsCollection.add(buildup);
		}
		
	});
	
	window.SharingModel = Backbone.Model.extend({
		initialize: function () {
			
		}
	});
	
	
	window.UserModel = Backbone.Model.extend({
		defaults: {
			is_main_user: false			
		},
	
		initialize: function () {
			if (this.get("is_main_user")) {
				FB.api('/me', function(info) {
						this.fbUserObject = info;
					}
				);
			}
		}
		
	});
	
	window.VideoModel = Backbone.Model.extend({
		initialize: function () {
			
		}
		
	});
	
	socket_init = io.connect();
	
	window.SocketManager = Backbone.Model.extend({
		initialize: function () {
			var socket, app;
			socket = this.get("socket");
			app = this.get("app");
			if (!socket){
				throw "No Socket Passed to SocketManager!";
			} else {
				console.log("Got socket. " + socket);
			}
			
			if (!app){
				throw "No App Passed to SocketManager!";
			} else {
				console.log("Got app. " + app);
			}
			
			//Chat -- msg received
			socket.on('message', function(msg) {
				app.get("roomModel").get("chatCollection").add({user: "Elliot", message: msg.data});				
			});
			
			
			
/*
			//Sends list of who is DJing
			//Data is a js array of DJ Socket IDs
			socket.on('dj:announceDJs', function(data) {
				console.log("Received dj info: "+JSON.stringify(data));
				djInfo = data;
				$('#djCount').html(djInfo.length);
				var index = djInfo.indexOf(me['socketId']);

				if(index >= 0) {	//client is dj
					index += 1;
					$('#djStatus').html("You are DJ number "+index);
					$('#beDJ').hide();
					$('#quitDJ').show();
				} else {
					configureDJButtons();
				}
				
			});
			
			socket.on('playlist:refresh', function(data) {

				console.log("Socket received video info");
				currVideo.video = data.video;
				currVideo.timeStart = data.time;

				if(playerLoaded) {
					ytplayer.loadVideoById(currVideo.video, currVideo.time);
				} else {
					var params = { allowScriptAccess: "always" };
					var atts = { id: "myytplayer"};
					swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=ytplayer",
				                       "videoPlayer", "640", "390", "8", null, null, params, atts);
					playerLoaded = true;
				}
			});
			
			socket.on('clientUpdate', function(numClients) {
				console.log("client has been updated: "+numClients);
				//$clientCounter.html(numClients);
			});

			socket.on('playlist:refresh', function(data) {
				console.log("Refreshing playlist..."+data);
				data = String(data);
				videos = data.split(',');
				if(videos.length > 0) {
					var playlistHtml = '<ul>';
					for(var v in videos)
						playlistHtml += '<li>'+videos[v]+'</li>';
					playlistHtml += '</li>';
					$("#playlist").html(playlistHtml);
				}
			});
			
			socket.on('videoInfo', function(data) {

				console.log("Socket received video info");
				currVideo.video = data.video;
				currVideo.timeStart = data.time;

				if(playerLoaded) {
					ytplayer.loadVideoById(currVideo.video, currVideo.time);
				} else {
					var params = { allowScriptAccess: "always" };
					var atts = { id: "myytplayer"};
					swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=ytplayer",
				                       "videoPlayer", "640", "390", "8", null, null, params, atts);
					playerLoaded = true;
				}
			});
*/
	
		},
		
	},{
		socket: socket_init,
		
		/* Outgoing Socket Events*/
		
		sendMsg: function(data) {
			this.socket.emit("chat:msgRcvd",data);
		}
	});
	
	window.SurfStream = Backbone.Model.extend({
		defaults: {
			sharing: new SharingModel			
		},
		
		initialize: function () {
			
			this.set({mainUI: new MainView()})
			
			
			this.set({roomModel: new RoomModel({
														player: new PlayerModel,
														chatCollection: new ChatList,
														video: new VideoModel,
													}),
								socket_manager: new SocketManager({
														socket: this.get("socket"), app: this
													}),
								user: new UserModel/({is_main_user: true}),
								search: new SearchModel({resultsList: new Playlist})
							});
			
			//Give the chat view a reference to the room's chat collection
			this.get("mainUI").initializeChat(this.get("roomModel").get("chatCollection"));
			this.get("mainUI").initializeSidebar();
			this.get("mainUI").initializeSearch(this.get("search"));
			
			//Make sure everything gets initialized first before we start the view magic
			//This can change to render some thing before we init the models and then
			//finish here later				
							
		}
	});
	
	/*FOR ANTHONY: MAKE SURE ON PAGE <div id="fb_user_init">userID</div>*/
	
	/************************/
	/**COLLECTIONS (LISTS)**/
	/***********************/
	
	window.ChatList = Backbone.Collection.extend({
		model: ChatMessageModel,
		
		defaults: {
			"clientId": 0
		},
		
		initialize: function () {
			
		}
	});
	
	/*
	window.FriendList = Backbone.Collection.extend({
		model: UserModel,
		
		initialize: function () {
			FB.api('/me/friends')
		}
		
	});
	*/
	/*** BEGIN: PLAYLIST AND SUBCLASSES ***/
	
	window.Playlist = Backbone.Collection.extend({
		model: VideoModel,
		
		initialize: function () {
			
		}
		
	});
	
	/*window.PersonalHistoryList = window.Playlist.extend({
		initialize: function () {
			
		}
		
	});
	
	
	window.RoomHistoryList = window.Playlist.extend({
		initialize: function () {
			
		}
		
	});
	
	window.SuggestionsList = window.Playlist.extend({
		initialize: function () {
			
		}
		
	}); */
	
	/*** END: PLAYLIST AND SUBCLASSES ***/
	
	/*
	window.RoomUsersList = Backbone.Collection.extend({
		model: UserModel,
		
		initialize: function () {
			
		}
	});
	*/
	/*NOT IMPLEMENTING THIS WEEKEND (7/30)*/  /*
	window.RoomList = Backbone.Collection.extend({
		model: RoomModel,
		
		initialize: function () {
			
		}
	}); */

	
	
	/***************/
	/*****VIEWS*****/
	/***************/

  window.TopBar = Backbone.View.extend({
		initialize: function () {
			
		}
		
	});
	
	window.RoomInfo = Backbone.View.extend({
		initialize: function () {
			
		}
		
	});
	
	window.ShareBar = Backbone.View.extend({
		initialize: function () {
			
		}
		
	});

	window.Tabs = Backbone.View.extend({
		initialize: function () {
			
		}
		
	});
	
	window.SideBar = Backbone.View.extend({
		el: '#sidebar',
		
		sidebarTemplate: _.template($('#sidebar-template').html()),
		
		
		initialize: function () {
			this.render();
		},
		
		render: function() {
			$(this.el).html(this.sidebarTemplate());
			return this;
		},
		
		
	});
	
	window.SearchView = Backbone.View.extend({
		
		searchViewTemplate: _.template($('#searchView-template').html()),
		
		initialize: function () {
			this.render();
			//Hack because of nested view bindings (events get eaten by Sidebar)
			var input = $("#searchBar .inputBox")
			input.bind("submit", {searchview: this },this.searchVideos);
			this.options.searchModel.bind("change:searchQuery", this.updateSearchQuery);
			this.options.searchModel.get("resultsList").bind("add", this.updateResults);
		},
		
		
		render: function() {
			$(".videoView").html(this.searchViewTemplate());
			return this;
		},
		
		searchVideos : function(event) {
			event.preventDefault();
			var query = $($('input[name=search]')[0]).val();
			event.data.searchview.options.searchModel.executeSearch(query);
			return false;
		},
		
		updateSearchQuery : function(query) {
			this.$('#searchBox').val(query);			
		},
		
		updateResults : function (model, collection) {
				new SearchCell({video: model})						
		}
		
		
		
	});
	
	window.SearchCell = Backbone.View.extend({
		
		searchCellTemplate: _.template($('#searchCell-template').html()),
		
		initialize: function () {
			this.addToPlaylist();
		},
		
		addToPlaylist: function (){
			$("#searchContainer").append(this.render({thumb: this.options.video.get("image_src"), title: this.options.video.get("title"), vid_id: this.options.video.get("videoURL")}).el);
		},
		
		render: function(searchResult) {
			$(this.el).html(this.searchCellTemplate(searchResult));
			return this;
		}
		
	});
	
	window.VideoList = Backbone.View.extend({
		
		playlistTemplate: _.template($('#playlist-template').html()),
		
		initialize: function () {
			
		},
		
		render: function() {
			$(this.el).html(this.playlistTemplate());
			return this;
		}
		
	});
	
	window.VideoCell = Backbone.View.extend({
		
		playlistCellTemplate: _.template($('#playlistCell-template').html()),
		
		initialize: function () {
			
		},
		
		addToPlaylist: function (){
			$(".playlistContainer").append(this.render(/*params for a video cell*/));
		},
		
		render: function() {
			$(this.el).html(this.playlistCellTemplate());
			return this;
		}
		
	});
	
	window.ChatView = Backbone.View.extend({
		el: '#chat',
		
		chatTemplate: _.template($('#chat-template').html()),
		
		
		initialize: function () {
			this.render();
			this.options.chatCollection.bind("add", this.makeNewChatMsg);
		},
		
		render: function() {
			$(this.el).html(this.chatTemplate());
			return this;
		},
		
		events: {
        "submit .inputBox" : "sendMessage"
    },

		sendMessage : function (event) {
			var userMessage = this.$('input[name=message]').val();
			this.$('input[name=message]').val('');
			SocketManager.sendMsg({name: "Elliot", text:  userMessage });
			return false;
		},
		
		makeNewChatMsg: function (chat) {
			new ChatCell({user: chat.get("user"), msg: chat.get("message")});
		}
	});
	
	window.ChatCell = Backbone.View.extend({
		
		chatCellTemplate: _.template($('#chatcell-template').html()),
		
		initialize: function () {
			$("#messages").append(this.render().el);
		},
		
		render: function() {
			$(this.el).html(this.chatCellTemplate({user: this.options.user, msg: this.options.msg }));
			return this;
		}
		
	});
	
	//The Avatar + Seating Area
	window.Theatre = Backbone.View.extend({
		initialize: function () {
			
		}
		
	});
	
	//The Actual Video Player Presentation
	window.Screen = Backbone.View.extend({
		initialize: function () {
			
		}
		
	});
	
	window.Remote = Backbone.View.extend({
		initialize: function () {
			
		}
		
	});
	
	window.Meter = Backbone.View.extend({
		initialize: function () {
			
		}
		
	});
	
	window.Avatar = Backbone.View.extend({
		initialize: function () {
			
		}
		
	});
	
	window.ProfilePage = Backbone.View.extend({
		initialize: function () {
			
		}
		
	});
	
	window.SettingsView = Backbone.View.extend({
		initialize: function () {
			
		}
		
	});
	
	window.MainView = Backbone.View.extend({
		el: 'body',
		
		initialize: function () {
			
		},
		
		initializeChat: function (chatCollection) {
			this.chatView = new ChatView({chatCollection: chatCollection});
		},
		
		initializeSidebar: function () {
			this.sidebar = new SideBar;
		},
		
		initializeSearch: function (search) {
			this.search = new SearchView({searchModel: search});
		}
		
		
	});
	
	/***************/
	/*****ROUTES*****/
	/***************/
	
	window.BasicRouter = Backbone.Router.extend({
		routes: {
			"index": "hideLoginAndSho", 
		}
		
	});

	/* INITIALIZATION */
	
	window.SurfStreamApp = new SurfStream({socket: socket_init});
	console.log("started app");
	
});
