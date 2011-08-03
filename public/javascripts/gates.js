$(function(){
	console.log("IN GATES");
	_.templateSettings = {
	  interpolate : /\{\{(.+?)\}\}/g
	};
	
	ZeroClipboard.setMoviePath('/swf/ZeroClipboard.swf');
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
			this.users = [];
		},
		
		addUser : function(user) {
			this.users.push(user.userId);
			$("#people-area").append("<img id='" + user.name + "' src=http://graph.facebook.com/"+ user.userId + "/picture style='position:absolute; margin-left:" + user.x + "px; margin-top:" + user.y + "px;' >");
		},
		
		removeUser: function(userModel) {
			//this.get("users").remove(userModel);
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
					console.log(info);
					console.log('fuck');
					this.set({user: info, avatar_image: 'https://graph.facebook.com/' + info.id + '/picture'});
					this.get("socket_manager").makeFirstContact({user: info});
				}.bind(this));
				FB.api('/me/friends', function(response) {
					console.log(response);
				});
			}
		},
		
		getUserData: function(self) {
			if (this.get("fbUserInfo")){
				return this.get("fbUserInfo");
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
			
			
			
			/* First set up all listeners */
			//Chat -- msg received
			
			socket.on("video:sendInfo", function(video) {
				//video.video = videoID, video.time = seconds into video
				if(!window.playerLoaded) {
					window.playerLoaded = true;
					var params = { allowScriptAccess: "always" };
					var atts = { id: "YouTubePlayer"};
					swfobject.embedSWF("http://www.youtube.com/apiplayer?enablejsapi=1&playerapiid=YouTubePlayer",
				                       "video-container", "640", "390", "8", null, null, params, atts);
					window.secs = video.time;
					window.video = video.video;
					playerLoaded = true;
				} else {
					window.YTPlayer.loadVideoById(video.video, video.time)		
				}
			});
			
			socket.on('playlist:refresh', function(videoArray) {
				app.setVideos(videoArray);
			});
			
			socket.on('message', function(msg) {
				app.get("roomModel").get("chatCollection").add({user: msg.data.attrs.name, message: msg.data.attrs.text});				
			});
			
			socket.on('playlist:initial', function(response) {
				app.get("user").set({playList: 'response'});
			});
			
			socket.on('users:announce', function(userJSONArray) {
				//userJSONArray is an array of users, with .userId = fbid#, .name = full name, .avatar = TBD,
				// .points = TBA, .x = top coord for room-conatiner, .y = leftmost coord for room-container
				var hash;
				if(!this.userhash) {
					this.userhash = {};
				}
				hash = this.userhash;
				for (var user in userJSONArray) {
					if (!app.curRoomHasUser(userJSONArray[user])) {
						app.addUserToCurRoom(userJSONArray[user]);
					}
					hash[user.userId] = true;
				}	
			});
			
			
			socket.on('dj:announceDJs', function(djArray) {
				for (dj in djArray) {
					$("[id="+djArray[dj].name+"]").style("border-style", "solid").style("border-color","#98bf21");
				}
			});
			

		},
		
		/* Initialize first contact */
		makeFirstContact : function(user) {	
			var socket = this.get("socket");		
			socket.emit('user:sendFBData', user);		
		}
		
		
	},{
		socket: socket_init,
		
		/* Outgoing Socket Events*/
		
		sendMsg: function(data) {
			data.name = window.SurfStreamApp.get("user").get("user").name;
			this.socket.emit("message",data);
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
														users: new RoomUsersList
													}),
								socket_manager: new SocketManager({
														socket: this.get("socket"), app: this
													}),
								search: new SearchModel({resultsList: new VideoList})
							});
			this.set({user: new UserModel({is_main_user: true, playList: new VideoList, socket_manager: this.get("socket_manager")})})
								
			this.get('user').getUserData(this.get('user'));
			//Give the chat view a reference to the room's chat collection
			this.get("mainUI").initializeTopBar();
			//initializeShareBar (this.get(sharing))
			this.get("mainUI").initializeChat(this.get("roomModel").get("chatCollection"));
			this.get("mainUI").initializeSidebar(this.get("search"), this.get("user").get("playList"));
			this.get("mainUI").initializePlayer(this.get("roomModel").get("player"));
			
			
			//this.setVideos([{video: "THIS"}, {video: "WORKS"}]);
			//this.addUserToCurRoom({userId: "ebabchick", x: 20, y:60})
			//Make sure everything gets initialized first before we start the view magic
			//This can change to render some thing before we init the models and then
			//finish here later				
							
		},
		
		curRoomHasUser : function(user) {
			if (_.indexOf(this.get("roomModel").users, user) == -1) {
				return false;
			} else {
				return true;
			}
		},
		
		addUserToCurRoom : function(user){
			this.get("roomModel").addUser(user);
		},
		
		setVideos : function(videos) {
			for (video in videos){
				this.get("user").get("playList").add({title: videos[video].video});
			}
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
			
		}
		
	});
	*/
	/*** BEGIN: PLAYLIST AND SUBCLASSES ***/
	
	window.VideoList = Backbone.Collection.extend({
		model: VideoModel,
		
		initialize: function () {
			
		}
		
	});
	


	

	/*window.PersonalHistoryList = window.Playlist.extend({
		initialize: function () {
			
		}
		
	});
	
	
	window.RoomHistoryList = window.VideoList.extend({
		initialize: function () {
			
		}
		
	});
	
	window.SuggestionsList = window.VideoList.extend({
		initialize: function () {
			
		}
		
	}); */
	
	/*** END: PLAYLIST AND SUBCLASSES ***/
	
	
	window.RoomUsersList = Backbone.Collection.extend({
		model: UserModel,
		
		initialize: function () {
			
		}
	});
	
	/*NOT IMPLEMENTING THIS WEEKEND (7/30)*/  /*
	window.RoomList = Backbone.Collection.extend({
		model: RoomModel,
		
		initialize: function () {
			
		}
	}); */

	
	
	/***************/
	/*****VIEWS*****/
	/***************/

		window.MainView = Backbone.View.extend({
		el: 'body',
		
		initialize: function () {
			
		},
		
		initializeTopBar: function () {
			this.roomInfoView = new RoomInfoView(({roomName: 'Placeholder'}));
			this.shareBarView = new ShareBarView();
		},
			
		initializeChat: function (chatCollection) {
			this.chatView = new ChatView({chatCollection: chatCollection});
		},
		
		initializeSidebar: function (search, playlist) {
			this.sidebar = new SideBar({searchModel: search, playList: playlist});
		},
		
		initializePlayer : function (player) {
			this.player = new Player({player: player});
			this.floor = new Theatre;			
		}
		
		
	});

	
	window.SideBar = Backbone.View.extend({
		el: '#sidebar',
		
		sidebarTemplate: _.template($('#sidebar-template').html()),
		
		events: {
        "click .search" : "activateSearch",
				"click .playlist" : "activatePlaylist"
    },

		initialize: function () {
			this.render();
			this.currentTab = "search";
			this.search = new SearchView({searchModel: this.options.searchModel, playList: this.options.playList});
			this.playlist = new VideoListView({playList: this.options.playList})
		},
		
		render: function() {
			$(this.el).html(this.sidebarTemplate());
			return this;
		},
		
		activatePlaylist : function() {
			if (this.currentTab == "playlist") return;
			this.currentTab = "playlist";
			this.$(".playlist").addClass("active");
			this.$(".search").removeClass("active");
			this.search.hide();
			this.playlist.show();
		},
		
		activateSearch : function() {
			if (this.currentTab == "search") return;
			this.currentTab = "search";
			this.$(".search").addClass("active");
			this.$(".playlist").removeClass("active");
			this.playlist.hide();
			this.search.show();
		}
		
		
	});
	
	window.SearchView = Backbone.View.extend({
		
		searchViewTemplate: _.template($('#searchView-template').html()),
		
		id: "search-view",
		
		initialize: function () {
			this.render();
			//Hack because of nested view bindings (events get eaten by Sidebar)
			var input = $("#searchBar .inputBox")
			input.bind("submit", {searchview: this },this.searchVideos);
			this.options.searchModel.bind("change:searchQuery", this.updateSearchQuery);
			this.options.searchModel.get("resultsList").bind("add", this.updateResults, this);
		},
		
		
		render: function() {
			$(".videoView").append($(this.el).html(this.searchViewTemplate()));
			return this;
		},
		
		hide : function() {
			$("#search-view").hide();
		},
		
		show : function() {
			$("#search-view").show();
		},
		
		searchVideos : function(event) {
			event.preventDefault();
			var query = $($('input[name=search]')[0]).val();
			$("#search-view").html($(event.data.searchview.el.innerHTML));
			event.data.searchview.options.searchModel.executeSearch(query);			
			event.data.searchview.updateSearchQuery(query);
			var input = $("#searchBar .inputBox")
			input.bind("submit", {searchview: event.data.searchview },event.data.searchview.searchVideos);
			return false;
		},
		
		updateSearchQuery : function(query) {
			$($('input[name=search]')[0]).val(query);			
		},
		
		updateResults : function (model, collection) {
				new SearchCell({video: model, playlist: this.options.playList})						
		}
		
		
		
	});
	
	window.SearchCell = Backbone.View.extend({
		
		searchCellTemplate: _.template($('#searchCell-template').html()),
		
		events: {
				"click .addToPlaylist" : "addToPlaylist"
    },
		
		initialize: function () {
			$("#searchContainer").append(this.render({thumb: this.options.video.get("image_src"), title: this.options.video.get("title"), vid_id: this.options.video.get("videoUrl")}).el);
		},
		
		addToPlaylist: function (){
			this.options.playlist.add(this.options.video);
			//HACK			
			window.SurfStreamApp.attributes.socket.emit('playlist:addVideo', {video: this.options.video.get("videoUrl").replace("http://gdata.youtube.com/feeds/api/videos/", "")});
			//ENDHACK
		},
		
		render: function(searchResult) {
			$(this.el).html(this.searchCellTemplate(searchResult));
			this.$(".thumbContainer").attr("src", searchResult.thumb);
			return this;
		}
		
	});
	
	//The Actual Video Player Presentation
	window.Player = Backbone.View.extend({
		
		el: "#funroom",
		
		roomTemplate: _.template($('#room-template').html()),
		
		
		
		initialize: function () {
			$(this.el).html(this.roomTemplate());
			if(window.playerLoaded) {
				//WUT LOL
				//ytplayer.loadVideoById(currVideo.video, currVideo.time);
			} else {
				var params = { allowScriptAccess: "always" };
				var atts = { id: "YouTubePlayer"};
				swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=YouTubePlayer",
			                       "video-container", "640", "390", "8", null, null, params, atts);
			}
		}			
		
		
		
	});
	
	window.VideoListView = Backbone.View.extend({
		id: 'video-list',
		
		videoListTemplate: _.template($('#video-list-template').html()),
		
		initialize: function () {
			this.options.playList.bind('add', this.addVideo, this);
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
		
		addVideo: function (videoModel) {
			var videoCellView = new VideoCellView({model: videoModel});
			$("#video-list .videoListContainer").append(videoCellView.el);
			console.log("yea");
		}
	});
	
	window.VideoCellView = Backbone.View.extend({
		videoCellTemplate: _.template($('#video-list-cell-template').html()),
				
		
		initialize: function () {
			//Hack because of nested view bindings part 2 (events get eaten by Sidebar)
			this.render();
			var buttonRemove = this.$(".remove")
			buttonRemove.bind("click", {videocell: this },this.removeFromPlaylist);
		},
		
		removeFromPlaylist : function() {
			alert("fuck")
			
		},
		
		toTheTop : function() {
			alert("fuck33")
			
		},
		
		render: function() {
			$(this.el).html(this.videoCellTemplate({title: this.model.get('title'), vid_id: this.model.get("vid_id")}));
			this.$(".thumbContainer").attr("src", this.model.get("image_src"));
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
			SocketManager.sendMsg({name: null, text:  userMessage });
			return false;
		},
		
		makeNewChatMsg: function (chat) {
			new ChatCell({user: chat.get("user"), msg: chat.get("message")});
		}
	});
	
	window.ChatCell = Backbone.View.extend({
		
		chatCellTemplate: _.template($('#chatcell-template').html()),
		
		className: "messageContainer",
		initialize: function () {
			$("#messages").append(this.render().el);
		},
		
		render: function() {
			$(this.el).html(this.chatCellTemplate({user: this.options.user, msg: this.options.msg }));
			return this;
		}
		
	});
	
	window.TopBarView = Backbone.View.extend({
		initialize: function () {
			
		}
	});
	
	window.RoomInfoView = Backbone.View.extend({
		el: '#roomInfo',
		
		roomInfoTemplate: _.template($('#room-info-template').html()),
		
		initialize: function () {
			$(this.el).html(this.roomInfoTemplate({roomName: this.options.roomName}));
		}
	});
	
	window.ShareBarView = Backbone.View.extend({
		el: '#shareBar',
		
		shareTemplate: _.template($('#share-template').html()),
		
		initialize: function () {
			$(this.el).html(this.shareTemplate());
			$('#shareFB').css('background-image', '/images/fb_small.png');
			$('#shareTwit').css('background-image', '/images/twitter_small.png');
			$('#shareEmail').css('background-image', '/images/email_small.png');
			$('#link').html("Link: <input type=\"text\" value=\"" + window.location + "\"/>");
			$('#copy-button-container').html("<div id=\"copy-button\">Copy</div>");
			var link = $('input:text').val();
			console.log(link);
		  var clip = new ZeroClipboard.Client();
			clip.setText(link);
			clip.glue('copy-button', 'copy-button-container');
		},
		
		events: {
        "click #shareFB" : "fbDialog",
				"click #shareTwit" : "tweetDialog",
				"click #shareEmail" : "openEmail"
    },

		fbDialog: function() {
			FB.ui(
				{
					method: 'feed',
					name: 'Just watched on SurfStream.tv',
					url: 'www.youtube.com',
					caption: 'Join your friends and watch videos online!',
					description: 'SurfStream.tv lets you explore new video content on the web. Very similar to turntable.fm'// ,
					// 					picture: '/images/logo.png'
				},
				function(response) {
					if (response && response.post_id) {
						alert('Post was published.');
					} else {
						alert('Post was not published.');
					}
				}
			);
		},
		
		tweetDialog: function() {
			var width  = 575,
			  height = 400,
			  left = ($(window).width()  - width)  / 2,
       	top = ($(window).height() - height) / 2,
       	url = "http://twitter.com/share?text=Check%20out%20this%20awesome%20brooooooom!",
       	opts = 'status=1' +
						',width='  + width  +
            ',height=' + height +
           	',top='    + top    +
            ',left='   + left;

			  window.open(url, 'twitter', opts);
			
		},
		
		openEmail: function() {
			window.open("mailto:friend@domainname.com?subject=Come%20to%20SurfStream.tv%20sometime!&body=God%20this%20shit%20is%20" + 
				"awesome!%2C%20here's%20a%20link%0A%0A" + window.location, '_parent');
		}
	});
	
	//The Avatar + Seating Area
	window.Theatre = Backbone.View.extend({
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

	/* INITIALIZATION */
	
	
	window.playerLoaded =false;
	window.SurfStreamApp = new SurfStream({socket: socket_init});
	//HACK
	$("#people-area").append("<button id='djbutton' style='position:absolute; margin-left: 359px; margin-top: 260px; width: 300px; height: 40px;' >Become DJ</button>");
	$("#djbutton").bind("click", function() {if (this.innerHTML != "Step Down") { socket_init.emit('dj:join'); this.innerHTML = "Step Down";} else { socket_init.emit('dj:quit'); this.innerHTML = "Become DJ";}});
	//ENDHACK
	console.log("started app");
	
});

function onYouTubePlayerReady(playerId) {
	if(!window.YTPlayer) {
    window.YTPlayer = document.getElementById('YouTubePlayer');
    window.YTPlayer.addEventListener('onStateChange', 'onytplayerStateChange');
		window.playerLoaded = true;
		if(window.video) {
			window.YTPlayer.loadVideoById(window.video, window.secs);
		}
	}
}

function setToTime() {
		window.YTPlayer = document.getElementById('YouTubePlayer');
		window.YTPlayer.addEventListener('onStateChange', 'onytplayerStateChange');
		window.YTPlayer.seekTo(window.secs);
}

function onytplayerStateChange(newState) {
	$('#state').html("Player state: "+newState);
	if(newState == 0 && currVideo.isLeader) { 
		console.log("Video finished, broadcasting back to server");
		socket.emit('videoFinished');
		currVideo = {};
	}
}