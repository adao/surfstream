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
		initialize: function () {
			
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
			if (this.get("is_main_user")){
				//FOR ANTHONY -- USE FB SDK HOPEFULLY TO PULL USER DATA HERE
				
				
			}
		}
		
	});
	
	window.VideoModel = Backbone.Model.extend({
		initialize: function () {
			
		}
		
	});
	
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
														search: new SearchModel,
														video: new VideoModel,
														user: this.get("user")
													}),
								socket_manager: new SocketManager({
														socket: this.get("socket"), app: this
													}),
								user: new UserModel/*({is_main_user: true, fbid: $(#fb_user_init).html() })*/
							});
			
			//Give the chat view a reference to the room's chat collection
			this.get("mainUI").initializeChat(this.get("roomModel").get("chatCollection"), this.get("socket"));
			
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
	
	window.FriendList = Backbone.Collection.extend({
		model: UserModel,
		
		initialize: function () {
			
		}
		
	});
	
	/*** BEGIN: PLAYLIST AND SUBCLASSES ***/
	
	window.Playlist = Backbone.Collection.extend({
		model: VideoModel,
		
		initialize: function () {
			
		}
		
	});
	
	window.PersonalHistoryList = window.Playlist.extend({
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
		
	});
	
	/*** END: PLAYLIST AND SUBCLASSES ***/
	
	
	window.RoomUsersList = Backbone.Collection.extend({
		model: UserModel,
		
		initialize: function () {
			
		}
	});
	
	/*NOT IMPLEMENTING THIS WEEKEND (7/30)*/
	window.RoomList = Backbone.Collection.extend({
		model: RoomModel,
		
		initialize: function () {
			
		}
	});

	
	
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
	
	window.SearchBar = Backbone.View.extend({
		initialize: function () {
			
		}
		
	});
	
	window.VideoList = Backbone.View.extend({
		initialize: function () {
			
		}
		
	});
	
	window.VideoCell = Backbone.View.extend({
		initialize: function () {
			
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
			this.options.socket.emit("chat:msgRcvd",{name: "Elliot", text:  userMessage });
			console.log("FUCKL")
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
		
		initializeChat: function (chatCollection, socket) {
			this.chatView = new ChatView({chatCollection: chatCollection, socket: socket});
		}
	});

	/* INITIALIZATION */
	


	socket_init = io.connect();
	window.SurfStream = new SurfStream({socket: socket_init});
	console.log("started app");
	
});
