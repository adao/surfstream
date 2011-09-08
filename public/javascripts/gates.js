window.fbAsyncInit = function() {
	var fbappid = $("#fba_ss_id").html();
	FB.init({ appId: fbappid,
		status: true,
		cookie: true,
		xfbml: true,
		oauth: true});
		
	button = document.getElementById('fb-auth');
	button.onclick = function() {
		FB.login(function(response) {}, {scope:'email,read_stream,user_about_me,read_friendlists'});
	};
	
	function proceed_to_site(response) {
		console.log(response);
		FB.Event.subscribe('auth.authResponseChange', proceed_to_site);
		if (response.authResponse) {
			//user is already logged in and connected
			if (!userLoggedOut) {
				window.SurfStreamApp = new SurfStreamModel({
				  socket: socket_init
				});
				console.log("started app");
				window.SurfStreamApp.get("userModel").set({fbId: response.authResponse.userID});
				SocketManagerModel.sendFBId(response.authResponse.userID);
			}
			document.getElementById('frontdoor').style.display = 'none';
			document.getElementById('loadingScreen').style.display = 'none';
			document.getElementById('outer').style.display = 'block';
		} else {
			// yeah right
			document.getElementById('loadingScreen').style.display = 'none';
			document.getElementById('outer').style.display = 'none';
			document.getElementById('frontdoor').style.display = 'inline-block';
		}
	}
		
	// run once with current status and whenever the status changes
	FB.getLoginStatus(proceed_to_site);
};



$(function() {
 _.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
 };

 ZeroClipboard.setMoviePath('/swf/ZeroClipboard.swf');
 socket_init = io.connect();
 window.ChatMessageModel = Backbone.Model.extend({});
 window.VideoPlayerModel = Backbone.Model.extend({});
 window.RoomModel = Backbone.Model.extend({
	
	initialize : function() {
		this.get("userCollection").bind("reset", this.roomJoin, this);
	},

  updateDisplayedUsers: function(userJSONArray) {
   var hash = {};
   var userCollection = this.get("userCollection");
	 var remove = [];
   _.each(userJSONArray, function(user) { 
			if (!userCollection.get(user.id)) userCollection.add(user);
	    hash[user.id] = true;
		});


   userCollection.each(function(userModel) {
	
		console.log('lookin at id '+ userModel.get('id'))
    if (!hash[userModel.get('id')]) remove.push(userModel);
   });

	for (var userModel in remove) {
		userCollection.remove(remove[userModel]);
	}

  },

	roomJoin : function() {
		$("#avatarWrapper_VAL").css('margin-top', -120);
		$("#avatarWrapper_VAL").animate({ 'margin-top': 0 }, 900, "bounceout");
	}

 });

 window.SearchBarModel = Backbone.Model.extend({
	
	initialize: function() {
		this.startIndex = 1;
		this.maxResults = 10;
	},

  executeSearch: function(searchQuery) {
	 this.get("searchResultsCollection").reset();
	 if (typeof(mpq) !== 'undefined') mpq.track("Search", {mp_note: "Searched for " + searchQuery});
   this.set({
    searchTerm: searchQuery
   });
	 this.startIndex = 1;
	 this.divToRemove = null;
   $.ajax({
    url: "http://gdata.youtube.com/feeds/api/videos?max-results=" + this.maxResults + "&start-index=" + this.startIndex + "&v=2&format=5&alt=jsonc&q=" + searchQuery,
    success: $.proxy(this.processResults, this)
   });
  },

  processResults: function(data) {
   console.log(data);
   var ytData, items, resultsCollection, buildup;
   ytData = data.data ? data.data : jQuery.parseJSON(data).data;
	 if (ytData.totalItems == 0) {
		new NoResultsView();
		return;
	 }
	 items = ytData.items;
   resultsCollection = this.get("searchResultsCollection");
   buildup = [];
   for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var videoResult = {
     title: item.title,
     thumb: ss_idToImg(item.id),
		 videoId: item.id,
     duration: item.duration,
     viewCount: item.viewCount ? item.viewCount : 0,
     author: item.uploader
    };
    buildup.push(videoResult);
   }
   resultsCollection.add(buildup);
	 if (this.divToRemove) {
		$(this.divToRemove).remove();
	 }
  },
	
	executeSearchMoreResults: function(selector) {
		this.divToRemove = selector;
		var searchQuery = this.get("searchTerm");
		this.startIndex += 10;
		$.ajax({
			url: "http://gdata.youtube.com/feeds/api/videos?max-results=" + this.maxResults + "&start-index=" + this.startIndex + "&v=2&format=5&alt=jsonc&q=" + searchQuery,
			success: $.proxy(this.processResults, this)
   });
	}
 });

 window.ShareModel = Backbone.Model.extend({
  initialize: function() {

  }
 });

 window.UserModel = Backbone.Model.extend({
  //has fbInfo, avatarImage, is_main_user, activePlaylist, playlistCollection
  defaults: {
   is_main_user: false
  },

  getFBUserData: function() {
   if (this.get("is_main_user")) {
    FB.api('/me', this.setUserData);
		this.getUserPostedVideos();
   }
  },

  setUserData: function(info) {
   SocketManagerModel.sendFBUser(info);
  },

	sendUserFBFriends: function(info) {
		var friendIdList = _.pluck(info.data, "id");
		SocketManagerModel.sendUserFBFriends({
			ssId: window.SurfStreamApp.get('userModel').get("ssId"),
			fbFriends: friendIdList
		});
	},
	
	getUserPostedVideos: function() {
		FB.api('/me/feed?fields=from,link', 
			{
				since: 1133308800,
				limit: 50
			}, this.addUserPostedVideos);
	},
	
	addUserPostedVideos: function(info) {
		console.log(info);
		if (info.paging) {
			if (info.paging.next) {
				FB.api('/me/feed?fields=from,link', 
					{
						until: info.paging.next.substr(info.paging.next.indexOf('until') + 6),
						limit: 50
				}, window.SurfStreamApp.get("userModel").addUserPostedVideos);
			}
		} else {
			window.SurfStreamApp.get("userModel").sendFacebookPlaylistBatchToYoutube();
		}
		for (var index in info.data) {
			if (info.data[index]['link']) {
				if (info.data[index]['link'].indexOf("youtube") != -1) {
					window.SurfStreamApp.get("userModel").addToFacebookPlaylist(info.data[index]['link']);
				}
			}
		}
	},
	
	addToFacebookPlaylist: function(videoUrl) {
		// if (this.get("facebookPlaylist").length == 10) {
		// 	this.sendFacebookPlaylistBatchToYoutube();
		// }
		var videoUrlEnding = videoUrl.substr(videoUrl.indexOf("v=") + 2);
		var length = videoUrlEnding.indexOf("&") < 11 && videoUrlEnding.indexOf("&") != -1 ? videoUrlEnding.indexOf("&") : 11;
		var videoId = videoUrl.substr(videoUrl.indexOf("v=") + 2, length);
		$.ajax({
	    url: "http://gdata.youtube.com/feeds/api/videos?max-results=1&format=5&alt=json&q=" + videoId,
	    success: $.proxy(this.processYoutubeResult, this)
	   });
	},
	
	sendFacebookPlaylistBatchToYoutube: function() {
		// var facebookPlaylistString = this.get("facebookPlaylist").join("%7C");
		// console.log(facebookPlaylistString);
		// $.ajax({
		// 	url:"http://gdata.youtube.com/feeds/api/videos?format=5&alt=json&q=" + facebookPlaylistString,
		//   success: $.proxy(this.processYoutubeResults, this)
		// });
		// var batch =
		// 	"<feed "
		// 	+ "xmlns='http://www.w3.org/2005/Atom' "
		// 	+ "xmlns:media='http://search.yahoo.com/mrss/' "
		// 	+ "xmlns:batch='http://schemas.google.com/gdata/batch'>"
		// 	+ "<batch:operation type='query'/>";
		// //for (var index in this.get("facebookPlaylist")) {
		// var arrayza = ['h5jKcDH9s64','elzqvWXG1Y'];
		// for (var index in arrayza) {
		// 	batch += '<entry><id>http://gdata.youtube.com/feeds/api/videos/';
		// 	batch += arrayza[index];
		// 	batch += '</id></entry>';
		// }
		// batch += '</feed>';
		// $.ajax({
		// 	url:"https://gdata.youtube.com/feeds/api/videos/batch",
		// 	type: "POST",
		// 	contentType: "text/xml",
		//   success: $.proxy(this.processYoutubeResults, this),
		// 	contents: batch
		// });
		// var feed = {};
		// feed['xmlns'] = 'http://www.w3.org/2005/Atom';
		// feed['xmlns:media'] = 'http://search.yahoo.com/mrss/';
		// feed['xmlns:batch'] = 'http://www.w3.org/2005/Atom';
		// feed['xmlns:'] = 'http://schemas.google.com/gdata/batch';
		// feed['batch:operation'] = {type: 'query'};
		// feed['entry'] = [];
		// // for (var index in this.get("facebookPlaylist")) {
		// 	feed['entry'].push({id: 'http://gdata.youtube.com/feeds/api/videos/h5jKcDH9s64'});
		// // }
		// 
		// $.post({
		// 	url:"http://gdata.youtube.com/feeds/api/videos/batch?v=2&alt=json",
		//   success: $.proxy(this.processYoutubeResults, this),
		// 	data: {feed: feed},
		// 	datatype: 'json'
		// });
	},
	
	processYoutubeResult: function(data) {
		console.log('wow made it here');
		console.log(data);
		
		
		console.log(data);
	  var feed = data.feed ? data.feed : jQuery.parseJSON(data).feed;
	  var entries = feed.entry;
		if (!entries) return;
	  var entry = entries[0];
		var videoId = entry.id.$t.replace("http://gdata.youtube.com/feeds/api/videos/", "");
		if (ss_modelWithAttribute(this.get("playlistCollection"), "videoId", videoId)) {
	       return;
	  }
		var attributes = {
			title: entry.title.$t,
			thumb: entry.media$group.media$thumbnail[0].url,
			videoId: videoId,
			duration: entry.media$group.yt$duration.seconds,
			viewCount: entry.yt$statistics.viewCount,
			author: entry.author[0].name.$t
		}
		var playlistItemModel = new PlaylistItemModel(attributes);
		
		playlistItemModel.set({playlistId: facebookPlaylistId});
		this.get("playlistCollection").getPlaylistById(facebookPlaylistId).get("videos").add(playlistItemModel);
		SocketManagerModel.addVideoToPlaylist(facebookPlaylistId, playlistItemModel.get("videoId"), playlistItemModel.get("thumb"), playlistItemModel.get("title"), playlistItemModel.get("duration"), playlistItemModel.get("author"), true);
		if (facebookPlaylistId == this.get("playlistCollection").get("activePlaylist").get("playlistId")) {
			var playlistCellView = new PlaylistCellView({
				playlistItemModel: playlistItemModel,
				playlistId: playlistItemModel.get("playlistId"),
				id: playlistItemModel.get("videoId")
			});
			playlistCellView.initializeViewToTop(false);
		}
	},
	
	logout: function() {
		FB.logout();
	}
	
 });

 window.SearchResultModel = Backbone.Model.extend({});
 window.PlaylistItemModel = Backbone.Model.extend({});
 window.RoomHistoryItemModel = Backbone.Model.extend({});
 window.SurfStreamModel = Backbone.Model.extend({
  defaults: {
   sharing: new ShareModel()
  },

  initialize: function() {
	 this.vidsPlayed = 0;
	 this.fullscreen = false;
	 this.onSofa = false;
	 this.curDJ = "__none__";
	 this.sofaUsers = [];
	 this.rotateRemoteSign = true;
	 this.gotRoomList = false;
	 $("#feedbackSpan").click(function() {feedback_widget.show();})
	 var roomModel, mainView;
	
	this.set({
		mainRouter: new RaRouter({})
	});

   this.set({
    roomModel: new RoomModel({
     playerModel: new VideoPlayerModel(),
     chatCollection: new ChatCollection(),
     userCollection: new UserCollection(),
		 roomListCollection: new RoomlistCollection(),
		 roomHistoryCollection: new RoomHistoryCollection()
    }),
    socketManagerModel: new SocketManagerModel({
     socket: this.get("socket"),
     app: this
    }),
    searchBarModel: new SearchBarModel({
     searchResultsCollection: new SearchResultsCollection()
    })
   });
	
	//initing the user sends the initial socket event
	 this.set({
    userModel: new UserModel({
     is_main_user: true,
     playlistCollection: new PlaylistCollection(),
		 activePlaylist: null,
     socketManagerModel: this.get("socketManagerModel")
    })
   });
	 
	 this.set({
    mainView: new MainView({userModel: this.get("userModel")})
   });
   
	 mainView = this.get("mainView");
	 roomModel = this.get("roomModel");
   mainView.initializeTopBarView();
	 mainView.initializeRoomListView(roomModel.get("roomListCollection"));
	
 
	 mainView.initializePlayerView(roomModel.get("playerModel"), roomModel.get("userCollection"), this.get("userModel"), mainView.roomModal);
	 mainView.initializeRoomHistoryView(roomModel.get("roomHistoryCollection"));
	 mainView.initializeSidebarView(this.get("searchBarModel"), this.get("userModel").get("playlistCollection"));
	 mainView.initializeChatView(roomModel.get("chatCollection"), this.get("userModel"));
	 mainView.initializeSounds();
  }
 });

 window.RoomlistCellModel = Backbone.Model.extend({
	initialize: function() {
		this.set({friends: []});
	}
 });
 
 window.ChatCollection = Backbone.Collection.extend({
  model: ChatMessageModel,

  defaults: {
   "clientId": 0
  },

  initialize: function() {

  }
 });

 window.RoomHistoryCollection = Backbone.Collection.extend({
	model: RoomHistoryItemModel
 });

 window.SearchResultsCollection = Backbone.Collection.extend({
  model: SearchResultModel,

  initialize: function() {

  }

 });

 window.PlaylistItemCollection = Backbone.Collection.extend({
	model: PlaylistItemModel
 });

 window.PlaylistModel = Backbone.Model.extend({
	//has a name(name), a playlistId(playlistId), and list of videos(videos)
	
	initialize: function() {
		console.log("herezzzzzzzzzzzzzz");
	},
	
	addToPlaylist: function(playlistItemModel) {
		this.get("videos").add(playlistItemModel, {
			at: 0
		});
	},
	
	removeFromPlaylist: function(videoId) {
		var playlistItemModel = ss_modelWithAttribute(this.get("videos"), "videoId", videoId);
	 	var copyPlaylistItemModel = new PlaylistItemModel(playlistItemModel.attributes);
	 	this.get("videos").remove(playlistItemModel);
		window.SurfStreamApp.get("mainView").sideBarView.playlistCollectionView.playlistView.setNotificationText();
		SocketManagerModel.deleteFromPlaylist(this.get("playlistId"), videoId);
	},
	
	moveToIndexInPlaylist: function() {
		
	},
	
	hasVideo: function(videoId) {
		if (ss_modelWithAttribute(this.get("videos"), "videoId", videoId)) {
			return true;
		} else {
			return false;
		}
	}
 });

 window.PlaylistCollection = Backbone.Model.extend({

  initialize: function() {
		this.playlists = [];
		this.idToPlaylist = {};
		this.idToPlaylistNameholder = {};
		this.idToPlaylistDropdown = {};
		this.idToPlaylistViews = {};
  },

	setActivePlaylist: function(playlistId) {
		var playlistCollection = window.SurfStreamApp.get("userModel").get("playlistCollection");
		var previouslySelected = playlistCollection.get("activePlaylist");
		if (previouslySelected) {
			$(playlistCollection.idToPlaylistNameholder[previouslySelected.get("playlistId")].el).removeClass("selected-playlist-nameholder").addClass("unselected-playlist-nameholder");
		}
		SocketManagerModel.choosePlaylist(playlistId);
		playlistCollection.set({activePlaylist: playlistCollection.getPlaylistById(playlistId)});
		window.SurfStreamApp.get("mainView").sideBarView.playlistCollectionView.playlistView.setPlaylist(playlistCollection.get("activePlaylist"));
		window.SurfStreamApp.get("mainView").sideBarView.playlistCollectionView.playlistView.resetPlaylist();
		playlistNameholderView = playlistCollection.idToPlaylistNameholder[playlistId];
		$(playlistNameholderView.el).removeClass("unselected-playlist-nameholder").addClass("selected-playlist-nameholder");
		$("#playlist-dropdown").val(playlistId);
	},
	
	deletePlaylist: function(playlistId) {
		if (playlistId == this.get("activePlaylist").get("playlistId")) {
			var randomId = this.randomPlaylistId(playlistId);
			if (!randomId)
				return;
			this.setActivePlaylist(randomId);
		}
		$(this.idToPlaylistDropdown[playlistId].el).remove();
		for (var i = 0; i < this.idToPlaylistViews[playlistId].length; i++) {
			$(this.idToPlaylistViews[playlistId][i]).remove();
		}
		for (var j = 0; j < this.playlists.length; j++) {
			if (this.playlists[j].get("playlistId") == playlistId) {
				this.playlists.splice(j, 1);
			}
		}
		delete this.idToPlaylist[playlistId];
		delete this.idToPlaylistNameholder[playlistId];
		delete this.idToPlaylistDropdown[playlistId];
		SocketManagerModel.deletePlaylist(playlistId);
	},

	getPlaylistById: function(playlistId) {
		return this.idToPlaylist[playlistId];
	},
	
	addPlaylist: function(playlistId, name, videos) {
		if (!name || name == "" || this.hasPlaylistName(name)) {
			return;
		}
		var playlistModel = new PlaylistModel();
		playlistModel.set({playlistId: playlistId, name: name, videos: videos});
		this.idToPlaylist[playlistId] = playlistModel;
		
		this.idToPlaylistViews[playlistId] = [];
		
		if (playlistId != recentlyWatchedPlaylistId) {
			var playlistDropdownCellView = new PlaylistDropdownCellView({dropdown_value: playlistId, dropdown_name: name});
			$("#playlistDropdown .playlistDropdownContainer").append(playlistDropdownCellView.el);
			this.idToPlaylistDropdown[playlistId] = playlistDropdownCellView;
			this.playlists.push(playlistModel);
		}
		var playlistNameholderView = new PlaylistNameholderView({playlist_nameholder_value: playlistId, playlist_nameholder_name: name, playlistCollection: this});
		this.idToPlaylistNameholder[playlistId] = playlistNameholderView;
		console.log(playlistModel);
		playlistNameholderView.setActivePlaylist();
	},
	
	removePlaylist: function() {
		//send socket event
	},
	
	length: function() {
		return Object.size(this.idToPlaylist);
	},
	
	hasPlaylistName: function(playlistName) {
		for (var id in this.idToPlaylist) {
			if (this.idToPlaylist.hasOwnProperty(id)) {
				if (this.idToPlaylist[id].get("name") == playlistName) {
					return true;
				}
			}
		}
		return false;
	},
	
	randomPlaylistId: function(playlistId) {
		for (var id in this.idToPlaylist) {
			if( this.idToPlaylist.hasOwnProperty(id) && id != playlistId) {
				return id;
			}
		}
		return null;
	},
	
	newPlaylistId: function() {
		var largestPlaylistId = 0;
		for (var id in this.idToPlaylist) {
			if( this.idToPlaylist.hasOwnProperty(id) && parseInt(id) > largestPlaylistId) {
				largestPlaylistId = parseInt(id);
			}
		}
		return largestPlaylistId + 1;
	},
	
	addVideoToPlaylist: function(playlistId, playlistItemModel) {
		playlistItemModel.set({playlistId: playlistId});
		this.getPlaylistById(playlistId).addToPlaylist(playlistItemModel);
		SocketManagerModel.addVideoToPlaylist(playlistId, playlistItemModel.get("videoId"), playlistItemModel.get("thumb"), playlistItemModel.get("title"), playlistItemModel.get("duration"), playlistItemModel.get("author"), false);
		if (playlistId == this.get("activePlaylist").get("playlistId")) {
			window.SurfStreamApp.get("mainView").sideBarView.playlistCollectionView.playlistView.addVideo(playlistItemModel, playlistId);
		}
	}
 });

 window.RoomlistCollection = Backbone.Collection.extend({
	model: RoomlistCellModel,
	
	initialize: function() {
		this.comparator = function(roomlistCellModel) {
			return (roomlistCellModel.get("friends").length * 15 + roomlistCellModel.get("numUsers"));
		}
	}

 });

 window.UserCollection = Backbone.Collection.extend({
  model: UserModel,

  initialize: function() {

  }
 });

 window.PlaylistCollectionView = Backbone.View.extend({
	id: "playlist-collection",
	
	playlistCollectionTemplate: _.template($("#playlist-collection-template").html()),
	
	initialize: function() {
		this.render();
		this.playlistView = new PlaylistView();
		$("#playlist-collection-input").bind("keyup", {playlistCollectionView: this}, this.addPlaylist);
	},
	
	addPlaylist: function(event) {
		if (event.keyCode != 13) {
			return;
		}
		
		var playlistName = $("#playlist-collection-input").val();
		if (event.data.playlistCollectionView.options.playlistCollection.hasPlaylistName(playlistName)) {
			return;
		}
		if (playlistName.length == 0)
			return;
		var playlistId = event.data.playlistCollectionView.options.playlistCollection.newPlaylistId();
		SocketManagerModel.addPlaylist(playlistId, playlistName);
		event.data.playlistCollectionView.options.playlistCollection.addPlaylist(playlistId, playlistName, new PlaylistItemCollection());
		$("#playlist-collection-input").val("");
	},
	
	hide: function() {
   $("#playlist-collection").hide();
  },

  show: function() {
   $("#playlist-collection").show();
  },

  render: function() {
   $(this.el).html(this.playlistCollectionTemplate());
   $(".videoView").append(this.el);
   return this;
  }
 });

 window.PlaylistNameholderView = Backbone.View.extend({
	className: "unselected-playlist-nameholder playlist-nameholder",
	
	tagName: "li",
	
	playlistNameholderTemplate: _.template($("#playlist-nameholder-template").html()),
	
	events: {
		"click .delete-nameholder": "presentDialog",
		"click .playlist-nameholder-name": "setActivePlaylist"
	},
	
	initialize: function() {
		this.render();
		$(this.el).droppable({
			accept: "#video-list-container div",
			hoverClass: "playlist-hover-highlight",
			drop: function(event, ui) {
				var fromVideoId = $(ui.draggable).attr('id');
				var playlistCollection = window.SurfStreamApp.get("userModel").get("playlistCollection");
				var toPlaylist = playlistCollection.getPlaylistById($(this).val());
				if (toPlaylist.hasVideo(fromVideoId)) {
					window.SurfStreamApp.get("mainView").theatreView.valChat("Sorry, but that playlist already has that video.");
					return;
				}
	 			var fromPlaylist = playlistCollection.get("activePlaylist");
				if (fromPlaylist.get("playlistId") == $(this).val()) {
					return;
				}
	 			var playlistItemModel = ss_modelWithAttribute(fromPlaylist.get("videos"), "videoId", fromVideoId);
	 			var copyPlaylistItemModel = new PlaylistItemModel(playlistItemModel.attributes);
				fromPlaylist.removeFromPlaylist(fromVideoId);
				
				playlistCollection.addVideoToPlaylist($(this).val(), copyPlaylistItemModel);
				ui.draggable.remove();
			}
		});
		if (this.options.playlist_nameholder_value == recentlyWatchedPlaylistId || this.options.playlist_nameholder_value == facebookPlaylistId || this.options.playlist_nameholder_value == thumbsUpPlaylistId) {
			$(this.el).find(".delete-nameholder").remove();
		}
		this.calculatePlaylistHeight();
	},
	
	render: function() {
		$(this.el).prepend(this.playlistNameholderTemplate({playlist_name: this.options.playlist_nameholder_name}));
		$(this.el).val(this.options.playlist_nameholder_value);
	  //$("#playlist-collection-display").prepend(this.el);
		var length = $("#playlist-collection-display").children().length;
		$(this.el).insertBefore($("#playlist-collection-display").children()[length - 1]);
	  return this;
	},
	
	printSomething: function() {
		console.log("works");
	},
	
	setActivePlaylist: function() {
		if (window.SurfStreamApp.onSofa && this.options.playlistCollection.getPlaylistById(this.options.playlist_nameholder_value).get("videos").length == 0) {
			window.SurfStreamApp.get("mainView").theatreView.valChat("Add videos to your playlist, or else you'll get skipped!");
		}
		this.options.playlistCollection.setActivePlaylist(this.options.playlist_nameholder_value);
	},
	
	presentDialog: function() {
		new DeleteConfirmationView({
			playlistTitle: this.options.playlist_nameholder_name,
			nameholderView: this
		});
	},
	
	removeNameholder: function() {
		$(this.el).remove();
		this.calculatePlaylistHeight();
		this.options.playlistCollection.deletePlaylist(this.options.playlist_nameholder_value);
	},
	
	calculatePlaylistHeight: function() {
		var pcHeight = $("#playlist-collection").outerHeight(true);
		var viewHeight = $("#myplaylist").outerHeight(true);
		$("#playlist-view").css('height', viewHeight - pcHeight);
	},
	
	highlightView: function() {
		
	}
	
 });
 
 window.DeleteConfirmationView = Backbone.View.extend({
	id: "playlist-delete-modal",
	
	deleteConfirmTemplate: _.template($('#playlist-delete-confirmation-template').html()),
	
	events: {
		"click .cancelDelete": "cancelDelete",
		"click .deletePlaylist": "deletePlaylist"
	},
	
	initialize: function() {
		$("#modalBG").show();
		$("#modalBG").click({modal: this.el}, function(e) {
				console.log("FUCK")
				$(e.data.modal).hide();
			});
		this.render();
		$(this.el).show();
	},
	
	render: function() {
		$(this.el).html(this.deleteConfirmTemplate({playlist_title: this.options.playlistTitle}));
		document.body.appendChild(this.el);
	},
	
	cancelDelete: function() {
		this.remove();
		$("#modalBG").hide();
	},
	
	deletePlaylist: function() {
		this.options.nameholderView.removeNameholder();
		this.remove();
		$("#modalBG").hide();
	}
 });

 window.PlaylistView = Backbone.View.extend({
  id: 'playlist-view',

  playlistTemplate: _.template($('#playlist-template').html()),
	
	playlistNotificationTemplate: _.template($("#playlist-notification-template").html()),

  initialize: function() {
	 this.render();
	 $("#video-list-container").sortable({
	 		update: function(event, ui) {
				var yThreshold = $("#playlist-collection").offset().top + $("#playlist-collection").outerHeight() - ui.item.height() * 3 / 4;
				var yPosition = ui.position.top;
				if (yPosition < yThreshold) {
					$("#video-list-container").sortable("cancel");
				}
	 			var i;
	 			var videoId = $(ui.item).attr('id');
	 			var index;
	 			var playlistArray = $(this).sortable('toArray');
	 			for (i = 0; i < playlistArray.length; i++) {
	 				if (videoId == playlistArray[i])
	 					index = i;
	 			}
	 			var playlistCollection = window.SurfStreamApp.get("userModel").get("playlistCollection").get("activePlaylist");
	 			var playlistItemModel = ss_modelWithAttribute(playlistCollection.get("videos"), "videoId", videoId);
				if (playlistItemModel == null) {
					ui.item.remove();
					return;
				}
	 			var copyPlaylistItemModel = new PlaylistItemModel(playlistItemModel.attributes);
	 			playlistCollection.get("videos").remove(playlistItemModel, {silent: true});
	 			playlistCollection.get("videos").add(copyPlaylistItemModel, {
	 		    at: index,
	 		    silent: true
	 		   });
				window.SurfStreamApp.get("mainView").sideBarView.playlistCollectionView.playlistView.setNotificationText();
	 		 SocketManagerModel.toIndexInPlaylist(playlistCollection.get("playlistId"), videoId, index);
	 		},
			cursorAt: {bottom: 30, left: 142},
			axis: "y",
			helper: "clone",
			forceHelperSize: true,
			alreadyShrunk: false,
			opacity: 0.6,
			start: function (event, ui) {
				
			},
			sort: function(event, ui) {
				var yThreshold = $("#playlist-collection").offset().top + $("#playlist-collection").outerHeight() - ui.item.height() * 3 / 4;
				var yPosition = ui.position.top;
				if (yPosition < yThreshold && !$("#video-list-container").sortable("option", "alreadyShrunk")) {
					var videoId = $(ui.item).attr('id');
					$("#video-list-container").sortable("option", "axis", false);
					$(ui.helper).addClass("shrunken-playlist-cell");
					$(ui.helper).css("margin-left", 100).css("margin-top", -45);
					$(ui.helper).stop().animate({rotate: -70, "height": 30, "width": 142}, 500, function() {
					});
					$("#video-list-container").sortable("option", "alreadyShrunk", true);
				} else if (yPosition > yThreshold && $("#video-list-container").sortable("option", "alreadyShrunk")) {
					$("#video-list-container").sortable("option", "appendTo", "parent");
					$(ui.helper).stop().animate({rotate: 0, "height": 60, "width": 285, "margin-top" : 0}, 500, function() {
						var playlistOffset = $("#video-list-container").offset();
						$(ui.helper).removeClass("shrunken-playlist-cell");
						$(ui.helper).offset({top: playlistOffset.top, left: playlistOffset.left});
						$("#video-list-container").sortable("option", "axis", "y");
						$("#video-list-container").sortable("option", "alreadyShrunk", false);
					});
					$("#video-list-container").sortable("option", "alreadyShrunk", false);
				}
			},
			stop: function(event, ui) {
				var playlistOffset = $("#video-list-container").offset();
				$(ui.helper).css("height", 60).css("width", 285);
				$(ui.helper).removeClass("shrunken-playlist-cell");
				$(ui.helper).offset({top: playlistOffset.top, left: playlistOffset.left});
				$(ui.helper).css("margin-top", 0);
				$("#video-list-container").sortable("option", "axis", "y");
				$("#video-list-container").sortable("option", "alreadyShrunk", false);
			},
			
			beforeStop: function(event, ui) {
			}
	 });
	 $("#video-list-container").disableSelection();
  },

  render: function() {
		$(this.el).html(this.playlistTemplate());
		$(this.el).prepend(this.playlistNotificationTemplate());
	  $(".videoView").append(this.el);
		return this;
  },

  addVideo: function(playlistItemModel, playlistId) {
   var playlistCellView = new PlaylistCellView({
    playlistItemModel: playlistItemModel,
		playlistId: playlistId,
		id: playlistItemModel.get("videoId")
   });
   playlistCellView.initializeViewToTop(true);
  },

	resetPlaylist : function() {
		$("#video-list-container.videoListContainer").empty();
		//this.playlist.get("videos").each(function(playlistItemModel) {this.addVideo(playlistItemModel, this.playlist.get("playlistId"))}, this);
		for (var i = this.playlist.get("videos").length - 1; i >= 0; i--) {
			this.addVideo(this.playlist.get("videos").at(i), this.playlist.get("playlistId"));
		}
	},
	
	setPlaylist: function(playlistModel) {
		this.playlist = playlistModel;
		this.setNotificationText();
	},
	
	setNotificationText: function(text) {
		if (this.playlist.get("videos").length == 0) {
			$("#playlist-notification-text").text("Add videos to your playlist or your turn will be skipped");
		} else {
			$("#playlist-notification-text").text("Up next: " + this.playlist.get("videos").at(0).get("title"));
		}
	}
 });

 window.RoomHistoryView = Backbone.View.extend({
	className: "historyContainer",
	
	roomHistoryViewTemplate: _.template($('#history-template').html()),
	
	initialize: function() {
		this.options.roomHistoryCollection.bind("reset", this.resetRoomHistory, this);
		this.options.roomHistoryCollection.bind("add", this.addToRoomHistory, this);
		this.render();
	},
	
	render: function() {
		$(this.el).html(this.roomHistoryViewTemplate());
		$($("#people-area")[0]).append(this.el);
		$($(".historyContainer")[0]).hide();
		$($("#history-button")[0]).bind("click", this.toggleVisibility);
	},
	
	toggleVisibility: function() {
		var history = $($(".historyContainer")[0]);
		history.toggle();
		if (typeof(mpq) !== 'undefined') mpq.track("History Toggled", {mp_note: "History was toggled " + (history.css("display") == "none" ? "off" : "on")});
	},
	
	resetRoomHistory: function() {
		this.options.roomHistoryCollection.each(function(roomHistoryItem) {new RoomHistoryItemView({room: roomHistoryItem})});
	},
	
	addToRoomHistory: function(newRoom) {
		new RoomHistoryItemView({room: newRoom});
	} 
 });

 window.RoomHistoryItemView = Backbone.View.extend({
	className: "videoLog",
	
	roomHistoryItemViewTemplate: _.template($('#historyCell-template').html()),
	
	events: {
		"mousedown": "addPlaylistDropdown"
	},

	initialize: function() {
		$($(".videoHistory")[0]).prepend(this.render().el);
		this.populatedDropdown = false;
	},
	
	render: function() {
		var historyItem = this.options.room;
		$(this.el).html(this.roomHistoryItemViewTemplate({
			title: historyItem.get("title"),
			duration: ss_formatSeconds(historyItem.get("duration")),
			percent: historyItem.get("percent")
		}));
		this.$(".thumbContainer > img").attr("src", ss_idToHDImg(historyItem.get("videoId")));
		return this;
	},
	
	addPlaylistDropdown: function() {
		if (this.populatedDropdown)
			return;
		var playlistCollection = window.SurfStreamApp.get("userModel").get("playlistCollection");
		var playlists = playlistCollection.playlists;
		for (var i = 0; i < playlists.length; i++) {
			var playlistDropdownView = new PlaylistDropdownCellView({dropdown_value: playlists[i].get("playlistId"), dropdown_name: playlists[i].get("name")});
			$(this.el).find(".addToPlaylistFromHistory").append(playlistDropdownView.el);
			playlistCollection.idToPlaylistViews[playlists[i].get("playlistId")].push(playlistDropdownView.el);
		}
		$(this.el).find(".addToPlaylistFromHistory:first").bind("change", {playlistCollection: window.SurfStreamApp.get("userModel").get("playlistCollection"), historyItem: this}, this.addToPlaylist);
		this.populatedDropdown = true;
	},
	
	addToPlaylist: function(event) {
		var selectedPlaylistId = $(event.data.historyItem.el).find(".addToPlaylistFromHistory").val();
		if (selectedPlaylistId == 0)
			return;
		$(this).addClass("added");
		var historyItem = event.data.historyItem.options.room;
		var attributes = {
			title: historyItem.get("title"),
			thumb: ss_idToImg(historyItem.get("videoId")),
			videoId: historyItem.get("videoId"),
			duration: historyItem.get("duration")
		}
		var playlistItemModel = new PlaylistItemModel(attributes);
		event.data.playlistCollection.addVideoToPlaylist(selectedPlaylistId, playlistItemModel);
	}
 });

 window.SideBarView = Backbone.View.extend({
  el: '#sidebar',

  sidebarTemplate: _.template($('#sidebar-template').html()),

  events: {
   "click .search": "activateSearch",
   "click .playlist": "activatePlaylist"
  },

  initialize: function() {
   this.render();
   this.currentTab = "search";
   this.searchView = new SearchView({
    searchBarModel: this.options.searchBarModel,
    playlistCollection: this.options.playlistCollection
   });
	 this.playlistCollectionView = new PlaylistCollectionView({
		playlistCollection: this.options.playlistCollection
 	 });
	 this.playlistCollectionView.hide();
   // this.playlistView = new PlaylistView({
   //  playlistCollection: this.options.playlistCollection
   // })
   // this.playlistView.hide();
  },

  render: function() {
   $(this.el).html(this.sidebarTemplate());
   return this;
  },

  activatePlaylist: function() {
   if (this.currentTab == "playlist") return;
   this.currentTab = "playlist";
   this.$(".playlist").addClass("active");
   this.$(".search").removeClass("active");
   this.searchView.hide();
	 this.playlistCollectionView.show();
	 this.searchView.previewPlayerView.hidePreviewPlayer();  
  },

  activateSearch: function() {
   if (this.currentTab == "search") return;
   this.currentTab = "search";
   this.$(".search").addClass("active");
   this.$(".playlist").removeClass("active");
   this.playlistCollectionView.hide();
   this.searchView.show();
  }

 });

 window.SearchView = Backbone.View.extend({
  //has searchBarModel
  searchViewTemplate: _.template($('#searchView-template').html()),
	
	viewMoreTemplate: _.template($('#view-more-cell-template').html()),

  id: "search-view",

  initialize: function() {
   this.render();
   this.previewPlayerView = new PreviewPlayerView();
	 this.playlistDropdownView = new PlaylistDropdownView();
   //Hack because of nested view bindings (events get eaten by Sidebar)
   var input = $("#searchBar .inputBox");
   input.bind("submit", {
    searchView: this
   }, this.searchVideos);
	 this.suggestionHash = {};
	 $("#youtubeInput").autocomplete({
		source: this.suggestionList,
		select: function(event, ui) {
		 console.log(ui.item.value);
		 
		}
	});
	 $("#youtubeInput").bind( "autocompleteselect", {searchView: this}, function(event, ui) {
		$("#searchContainer").empty();
		event.data.searchView.options.searchBarModel.executeSearch(ui.item.value);
	 });
	 input.bind("keyup", {searchView: this}, this.getSuggestions);
   this.options.searchBarModel.get("searchResultsCollection").bind("add", this.updateResults, this);
	 var clearSearchButton = $("#clearsearch");
	 clearSearchButton.bind("click", function() {
		$(":input", "#searchBar .inputBox").val("");
		$("#youtubeInput").autocomplete("close");
	 });

	 $(".searchCellContainer .videoInfo,.searchCellContainer .thumbContainer").live("mouseover mouseout", function(cell) {
	  if ( event.type == "mouseover" ) {
			if(cell.currentTarget.className == "videoInfo") {
				$(cell.currentTarget.parentNode.parentNode.children[1]).show();
			} else {
				$(cell.currentTarget.nextSibling).show();
			}
	    	
	  } else {
	    if(cell.currentTarget.className == "videoInfo") {
				$(cell.currentTarget.parentNode.parentNode.children[1]).hide();
			} else {
				$(cell.currentTarget.nextSibling).hide();
			}
	  }
	 });
  },

  render: function() {
   $(".videoView").append($(this.el).html(this.searchViewTemplate()));
   return this;
  },

  hide: function() {
   $("#search-view").hide();
  },

  show: function() {
   $("#search-view").show();
  },

  searchVideos: function(event) {
   event.preventDefault();
   var query = $($('input[name=search]')[0]).val();
   $("#searchContainer").empty();
   event.data.searchView.options.searchBarModel.executeSearch(query);
   return false;
  },

  updateResults: function(model, collection) {
   new SearchCellView({
    video: model,
    playlistCollection: this.options.playlistCollection
   });
	 if (model.collection.length % this.options.searchBarModel.maxResults == 0) {
		new ViewMoreCellView({searchBarModel: this.options.searchBarModel});
	 }
  },

	getSuggestions: function(event) {
		if (event.keyCode == 13) {
			$("#youtubeInput").autocomplete("option", "disabled", true);
			$("#youtubeInput").autocomplete("close");
			return;
		}
		$("#youtubeInput").autocomplete( "option", "disabled", false);
		var input = $("#searchBar .inputBox :input");
		var query = input.val();
		if (event.data.searchView.suggestionHash[query]) {
			$("#youtubeInput").autocomplete( "option", "source", event.data.searchView.suggestionHash[query]);
		} else {
			var length = query.length;
			var the_url = 'http://suggestqueries.google.com/complete/search?hl=en&ds=yt&client=youtube&hjson=t&jsonp=window.setSuggestions&q=' + encodeURIComponent(query) + '&cp=' + length;
	    $.ajax({
	        type: "GET",
	        url: the_url,
					dataType: "script"
	    });
		}
	},
	
	suggestions: function() {
		return this.suggestionList;
	}
 });

 window.SearchCellView = Backbone.View.extend({

  searchCellTemplate: _.template($('#searchCell-template').html()),

  className: "searchCellContainer",

  events: {
   "click .addToPlaylist": "addToPlaylist",
   "click .previewVideo": "previewVideo"
  },

  initialize: function() {
   $("#searchContainer").append(this.render().el);
	 this.$(".thumbContainer").click({cell: this.options}, this.previewVideo);
  },

  addToPlaylist: function() {
	 var selectedPlaylist = $("#playlistDropdown .playlistDropdownContainer").val();
   var videoID = this.options.video.get("videoId");
   if (ss_modelWithAttribute(this.options.playlistCollection.getPlaylistById(selectedPlaylist).get("videos"), "videoId", videoID)) {
	  return;
   }
   this.options.video.set({
    videoId: videoID
   });
   var playlistItemModel = new PlaylistItemModel(this.options.video.attributes);
   console.log(this.options.video.attributes);
   this.options.playlistCollection.addVideoToPlaylist(selectedPlaylist, playlistItemModel);
	 var cellId = "#search_result_" + videoID;
	 $(cellId).addClass("added");
  },  

  previewVideo: function(e) {
   var videoID = e.data.cell.video.get("videoId");
   $(window.YTPlayerTwo).css({'height': 187});
   $("#previewContainer").css({'height': 213});
   $("#previewContainer").animate({'top': 64});
   if ($("#searchContainer").css("height") != "125px"){
	    //wait for search to resize before setting scrollTop
			var cell = this;
	 		$("#searchContainer").animate({'height': 125, "margin-top":187}, function() {
				$("#searchContainer").animate({"scrollTop": cell.offsetTop - 340});
			});
  } else {
		$("#searchContainer").animate({"scrollTop": this.offsetTop - 340});
	}
  
   window.YTPlayerTwo.loadVideoById(videoID);
  },

  render: function(searchResult) {
   $(this.el).html(this.searchCellTemplate({
    thumb: this.options.video.get("thumb"),
    title: this.options.video.get("title"),
    vid_id: this.options.video.get("videoId"),
		duration: ss_formatSeconds(this.options.video.get("duration")),
		viewCount: (this.options.video.get("viewCount") > 0) ? (ss_formatViews(this.options.video.get("viewCount")) + " views" ) : "",
		author: this.options.video.get("author")
   }));
   $(this.el).find(".thumbContainer").attr("src", this.options.video.get("thumb"));
   return this;
  }

 });

 window.VideoPlayerView = Backbone.View.extend({

  el: "#funroom",

  roomTemplate: _.template($('#room-template').html()),

  initialize: function() {
   $(this.el).html(this.roomTemplate());
   if (window.playerLoaded) {
    //WUT LOL
    //ytplayer.loadVideoById(currVideo.video, currVideo.time);
   } else {
    var params = {
      wmode: "opaque",
			allowScriptAccess: "always",
			modestbranding: 1,
			iv_load_policy: 3
    };                           
    var atts = {
     id: "YouTubePlayer"
    };
    swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=YouTubePlayer", "video-container", "640", "390", "8", null, null, params, atts);
   	setInterval(updateTime, 300);
		}
  }

 });
 
 window.ViewMoreCellView = Backbone.View.extend({
	viewMoreCellTemplate: _.template($('#view-more-cell-template').html()),

  id: "viewMoreCellContainer",
	
	events: {
		"click": "moreResults"
	},

  initialize: function() {
   $("#searchContainer").append(this.render());
  },

  render: function() {
	 $(this.el).html(this.viewMoreCellTemplate());
   return this.el;
  },
	
	moreResults: function(event) {
		this.options.searchBarModel.executeSearchMoreResults("#viewMoreCellContainer");
		//$("#viewMoreCellContainer").remove();
	}
 });
 
 window.NoResultsView = Backbone.View.extend({
	noResultsTemplate: _.template($('#no-results-template').html()),

  id: "noResultsContainer",

  initialize: function() {
   $("#searchContainer").append(this.render());
  },

  render: function() {
	 $(this.el).html(this.noResultsTemplate());
   return this.el;
  }
 });

 window.PreviewPlayerView = Backbone.View.extend({

  el: "#previewContainer",

  previewTemplate: _.template($('#search-preview-template').html()),

  events: {
   "click .hidePlayer": "hidePreviewPlayer"
  },

  initialize: function() {
   $(this.el).html(this.previewTemplate());
   if (false) {
    //WUT LOL
    //ytplayer.loadVideoById(currVideo.video, currVideo.time);
   } else {
    var params = {
     allowScriptAccess: "always",
     wmode: "opaque",
		 allowFullScreen: 'false',
		 autohide: 1,
		 iv_load_policy: 3
    };
    var atts = {
     id: "YouTubePlayerTwo",
    };
    swfobject.embedSWF("http://www.youtube.com/v/9jIhNOrVG58?version=3&enablejsapi=1&playerapiid=YouTubePlayerTwo", "preview-player", "299", "183", "8", null, null, params, atts);
   }
  },

  hidePreviewPlayer: function() {
   window.playerTwoLoaded = false;
   // $("#preview-container").animate({
   // height: 0,
   // width: 0
   // }, "slow", null, function() {
   // $("#preview-container").css('display', 'none');
   // });
		if(typeof(window.YTPlayerTwo.stopVideo) != "undefined") {
	          window.YTPlayerTwo.stopVideo();
	      }
	
   $("#searchContainer").animate({'height': 320, "margin-top":0}, 500);
	 $("#previewContainer").animate({'top': -187}, 500);
   // $("#searchContainer").animate({
   // height: 360
   // }, "slow");
  }
 });

 window.PlaylistCellView = Backbone.View.extend({
  playlistCellTemplate: _.template($('#video-list-cell-template').html()),

	className: "videoListCellContainer",

  initializeViewToTop: function(top) {
   var buttonRemove, buttonToTop, videoID;
   //Hack because of nested view bindings part 2 (events get eaten by Sidebar)
   this.render();
	 if (top) {
		$("#video-list-container").prepend(this.el);
	 } else {
		$("#video-list-container").append(this.el);
	 }
	 videoID = this.options.playlistItemModel.get("videoId");
   buttonRemove = $("#remove_video_" + videoID);
   buttonRemove.bind("click", {
    videoModel: this.options.playlistItemModel,
		playlistCollection: this.options.playlistItemModel.collection
   }, this.removeFromPlaylist);
   buttonToTop = $("#send_to_top_" + videoID);
   buttonToTop.bind("click", {
    videoModel: this.options.playlistItemModel,
		playlistCollection: this.options.playlistItemModel.collection,
    context: this
   }, this.toTheTop);
   this.options.playlistItemModel.bind("remove", this.removeFromList, this);
  },

  removeFromPlaylist: function(event) {
	 $(this).parent().parent().parent().remove();
	 var playlistFrom = window.SurfStreamApp.get("userModel").get("playlistCollection").idToPlaylist[event.data.videoModel.get("playlistId")];
	 playlistFrom.removeFromPlaylist(event.data.videoModel.get("videoId"));
  },

  toTheTop: function(event) {
   var copyPlaylistItemModel = new PlaylistItemModel(event.data.videoModel.attributes);
   var collectionReference = event.data.playlistCollection;
	 if (collectionReference.at(0).get("videoId") == event.data.videoModel.get("videoId")) {
		return;
	 }
   $(this).parent().parent().parent().remove();
	 var playlistModelToRemove = ss_modelWithAttribute(collectionReference, "videoId", event.data.videoModel.get("videoId"));
   collectionReference.remove(playlistModelToRemove);
   collectionReference.add(copyPlaylistItemModel, {
    at: 0,
    silent: true
   });
   SocketManagerModel.toTopOfPlaylist(event.data.videoModel.get("playlistId"), event.data.videoModel.get("videoId"));
   var playlistCellView = new PlaylistCellView({
    playlistItemModel: copyPlaylistItemModel,
		playlistId: event.data.videoModel.get("playlistId"),
		id: event.data.videoModel.get("videoId")
   });
   playlistCellView.initializeViewToTop(true);
	 window.SurfStreamApp.get("mainView").sideBarView.playlistCollectionView.playlistView.setNotificationText();
  },

  render: function() {
   $(this.el).html(this.playlistCellTemplate({
    title: this.options.playlistItemModel.get('title'),
    vid_id: this.options.playlistItemModel.get("videoId"),
		duration: ss_formatSeconds(this.options.playlistItemModel.get("duration"))
   }));
   this.$(".thumbContainer").attr("src", this.options.playlistItemModel.get("thumb"));
   return this;
  },

  removeFromList: function(playlistItemModel, collection) {
   //hack because backbone sucks
   $("#vid_" + playlistItemModel.attributes.videoId).remove();
  }
 });

 window.PlaylistDropdownView = Backbone.View.extend({
	el: "#playlistDropdown",
	
	playlistDropdownTemplate: _.template($('#playlist-dropdown-template').html()),
	
	initialize: function() {
		$(this.el).html(this.playlistDropdownTemplate());
		
	}
 });

 window.PlaylistDropdownCellView = Backbone.View.extend({
	
	className: "playlistDropdownCellContainer",
	
	tagName: "option",
	
	initialize: function(options) {
		this.render();
		//$("#playlistDropdown .playlistDropdownContainer").append(this.el);
	},
	
	render: function() {
		$(this.el).val(this.options.dropdown_value);
		$(this.el).html(this.options.dropdown_name);
		return this;
	}
 });

 window.ChatView = Backbone.View.extend({
  el: '#chat',

  chatTemplate: _.template($('#chat-template').html()),

  initialize: function() {
   this.render();
	 $(this.el).find(".soundToggler").live("click", {"this": this}, this.toggleSound);
   this.options.chatCollection.bind("add", this.makeNewChatMsg, this);
	 this.options.chatCollection.bind("reset", this.clearChat);
   this.chatContainer = new AutoScroll({
    bottomThreshold: 215,
    scrollContainerId: 'messages'
   });

   console.log(this.chatContainer);
  },

  render: function() {
   $(this.el).html(this.chatTemplate());
   return this;
  },

  events: {
   "submit .inputBox": "sendMessage"
  },

  sendMessage: function(event) {
   var userMessage = this.$('input[name=message]').val();
	 if (userMessage == "") return false;
   this.$('input[name=message]').val('');
   SocketManagerModel.sendMsg({
    name: this.options.userModel.get("displayName"),
    text: userMessage,
    id: this.options.userModel.get("ssId")
   });
   return false;
  },

  makeNewChatMsg: function(chat) {
   new ChatCellView({
    username: chat.get("username"),
    msg: chat.get("msg")
   });
   this.chatContainer.activeScroll();
  },
	
	toggleSound: function(event) {
		if (window.SurfStreamApp.get("mainView").soundOn) {
			$(event.data.this.el).find(".soundToggler").text("Sound Off");
			window.SurfStreamApp.get("mainView").soundOn = false;
		} else {
			$(event.data.this.el).find(".soundToggler").text("Sound On");
			window.SurfStreamApp.get("mainView").soundOn = true;
		}
	},

	clearChat: function() {
		$("#messages").empty();
	}
 });

 window.RoomListView = Backbone.View.extend({
		
		el: "#roomsList",
		
		roomListTemplate: _.template($('#roomlist-template').html()),

		
		initialize: function () {
			var modal;
			this.options.roomlistCollection.bind("reset", this.addRooms, this);
			this.options.roomlistCollection.bind("sort", this.addRooms, this);
			this.render();			
			this.hide();
			$("#modalBG").hide();
		},
		
		hide : function() {
			$("#room-modal").hide();
			$("#modalBG").hide();
		},
	
		show : function() {
			$("#room-modal").show();
			$("#modalBG").show();
			SurfStreamApp.showModalOnLoad = true;
			SocketManagerModel.loadRoomsInfo();
		},
	
		render: function() {
			$(this.el).html(this.roomListTemplate());
			this.bindButtonEvents();
			return this;
		},
	
	  bindButtonEvents : function() {
			$("#CreateRoom").bind("click", {modal: this}, this.submitNewRoom);
			$("#CreateRoomName").bind("submit", this.submitNewRoom);
			$("#CreateRoomName").keypress({modal: this}, function(press){
				if (press.which == 13) {
					press.data.modal.submitNewRoom(press);
				}
			});
			$("#hideRoomsList").bind("click", this.hide);
			$("#modalBG").click({modal: this}, function(e) {
				console.log("FUCK")
				e.data.modal.hide();
			});
		},
		
		submitNewRoom: function(e) {
			var roomName = $("#CreateRoomName").val();
			if (roomName == "") return false;
			var rID = $.trim(roomName).replace(/\s+/g, '-');
			SocketManagerModel.joinRoom(rID, true, roomName);
			window.SurfStreamApp.get("mainRouter").navigate("/" + rID, false);
			e.data.modal.hide();
			return false;
		},
	
		addRooms: function (roomListCollection) {
			this.render();
			roomListCollection.each(function(roomListCellModel) { new RoomListCellView({roomListCellModel: roomListCellModel}) });
			if (!SurfStreamApp.showModalOnLoad) {
				SurfStreamApp.get("mainView").roomModal.hide();
			}
		}
 });
	
 window.RoomListCellView = Backbone.View.extend({
		
		tagName: "tr",
		
		className: "room-row",
		
		roomListCellTemplate: _.template($('#roomlistCell-template #celltemplate-table .room-row').html()),
		
		videoThumbnailTemplate: _.template($("#video-thumbnail-template").html()),
		
		events: {
			"mouseover .room-friends-container": "displayFriends",
			"mouseout .room-friends-container": "hideFriends"
		},

		initialize: function () {
			this.friendsHoverHidden = true;
			this.render();
			$(this.el).bind("click", this.clickJoinRoom);																					
		},
	
		render: function() {
			//this.options.roomListCellModel.set({friends: [1389848266057, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314]});
			var roomModel = this.options.roomListCellModel;
			var curVidTitle = roomModel.get("curVidTitle");
			var partialFriendsHTML = this.renderFriends(2, "friendInRoomPic");
			var fullFriendsHTML = this.renderFriends(0, "friendInRoomPicHover");
			var rName = roomModel.get("roomName");
			if (roomModel.get("rID") == SurfStreamApp.inRoom) {
				rName = rName + "<span style='color: #34C8FF;'> (You Are Here)</span>";
			}
			$(this.el).html(this.roomListCellTemplate({viewers: roomModel.get("numUsers"), currentVideoName: (curVidTitle && curVidTitle.length > 0) ? "► " + curVidTitle : "" , roomname: rName, numDJs: roomModel.get("numDJs"), partial_friends: partialFriendsHTML, full_friends: fullFriendsHTML, truename: roomModel.get("rID")}));
			if (!roomModel.get("valstream")) {
				$(this.el).find(".valstream-icon").hide();
			}
			
			//$(this.el).find(".room-friends-container").bind("mouseover", {friends: this.options.roomListCellModel.get("friends")}, this.displayFriends);
			
			var recentVids = roomModel.get("recentVids");
			$($("#roomsTable tbody:first")[0]).append(this.el);
			var recentVidLimit = 4;
			if (!curVidTitle)
				recentVidLimit = 5;
			if (recentVids) {
				var numRecentVids = recentVids.length;
				for (var i = 0; i < numRecentVids && i < recentVidLimit; i++) {
					var videoThumbnail = this.videoThumbnailTemplate();
					$(this.el).find(".room-history-container").prepend(videoThumbnail);
					$(this.el).find(".room-history-container").find(".videoThumbnail:first").attr("src", ss_idToHDImg(recentVids[i].videoId));
					$(this.el).find(".room-history-container").find(".videoThumbnail:first").bind("mouseover", {videoTitle: recentVids[i].title}, this.displayVideoTitle);
				}
			}
			
			if (curVidTitle) {
				var videoThumbnail = this.videoThumbnailTemplate();
				$(this.el).find(".room-history-container").prepend(videoThumbnail);
				$(this.el).find(".room-history-container").find(".videoThumbnail:first").attr("src", ss_idToHDImg(roomModel.get("curVidId")));
				$(this.el).find(".room-history-container").find(".videoThumbnail:first").bind("mouseover", {videoTitle: curVidTitle}, this.displayVideoTitle);
				$(this.el).find(".room-history-container .videoThumbnailContainer:first .videoThumbnail").addClass("lastPlayedVideo");
				$(this.el).find(".room-history .lastPlayedVideoTitle").text(curVidTitle);
			}
			
			if (!curVidTitle && !recentVids)
				$(this.el).find(".room-history-container").prepend("No videos have been played yet. Be the first!");
			return this;
		},
		
		renderFriends: function(count, className) {
			var result = "";
			var friends = this.options.roomListCellModel.get("friends");
			if (friends.length == 0)
				return "0";
			if (count == 0) {
				for (var i = 0; i < friends.length; i++) {
					result += "<li class='" + className + "'</li><img src='http://graph.facebook.com/"+ friends[i] + "/picture' style='width:45px; height:45px;' /></li>"
				}
			} else {
				for (var i = 0; i < friends.length && i < count; i++) {
					result += "<img class='" + className + "' src='http://graph.facebook.com/"+ friends[i] + "/picture' style='width:45px; height:45px;'>"
				}
			}
			return result;
		},
		
	  clickJoinRoom: function(el) {
			var rID = $(this).find(".true-room-name").html();
			if (rID == SurfStreamApp.inRoom) return;
			SocketManagerModel.joinRoom(rID, false, $(this).find(".listed-room-name").html());
			window.SurfStreamApp.get("mainRouter").navigate("/" + rID, false);
			window.SurfStreamApp.get("mainView").roomModal.hide();
		},
		
		displayVideoTitle: function(event) {
			console.log("HRM!");
			$(event.toElement.parentElement.parentElement).find(".lastPlayedVideo").removeClass("lastPlayedVideo");
			$(event.toElement).addClass("lastPlayedVideo");
			$(event.toElement.parentElement.parentElement.parentElement).find(".lastPlayedVideoTitle").text(event.data.videoTitle);
		},
		
		displayFriends: function(event) {
			if (this.options.roomListCellModel.get("friends").length == 0)
				return;
			var friendsHover = $(event.toElement.parentElement).find(".friends-hover-container");
			if (friendsHover.length == 0) {
				friendsHover = $(event.toElement.parentElement.parentElement).find(".friends-hover-container");
				if (this.friendsHoverHidden) {
					friendsHover.show()
					this.friendsHoverHidden = false;
					var parentOffset = $(event.toElement.parentElement).offset();
					var friendsHoverTop = parentOffset.top + $(event.toElement.parentElement).height() / 2 - friendsHover.height() / 2;
					var friendsHoverLeft = parentOffset.left - friendsHover.width();
					friendsHover.offset({top: friendsHoverTop, left: friendsHoverLeft});
				}
			} else {
				if (this.friendsHoverHidden) {
					friendsHover.show()
					this.friendsHoverHidden = false;
					var parentOffset = $(event.toElement).offset();
					var friendsHoverTop = parentOffset.top + $(event.toElement).height() / 2 - friendsHover.height() / 2;
					var friendsHoverLeft = parentOffset.left - friendsHover.width();
					friendsHover.offset({top: friendsHoverTop, left: friendsHoverLeft});
				}
			}
		},
		
		hideFriends: function(event) {
			console.log("from and to");
			console.log(event.fromElement);
			console.log(event.toElement);
			if (event.toElement) {
				if (event.toElement.className == "room-friends") {
					console.log("something");
				}
				console.log($(event.toElement.parentElement));
				console.log($(this.el).find(".room-friends-container"));
				if (event.toElement.className == "room-friends-container" ||
						(event.toElement.className == "friendInRoomPic" && $(event.toElement.parentElement).data() == $(this.el).find(".room-friends-container").data())) {
					return;
				}
			}
			var friendsHover = $(event.fromElement.parentElement.parentElement).find(".friends-hover-container");
			friendsHover.hide();
			this.friendsHoverHidden = true;
		}
		
		
 });

 window.ChatCellView = Backbone.View.extend({

  chatCellTemplate: _.template($('#chatcell-template').html()),

  className: "messageContainer",
  initialize: function() {
   $("#messages").append(this.render().el);
		window.SurfStreamApp.get("mainView").playSound("chat_message_sound");	 
  },

  render: function(nowPlayingMsg) {
		$(this.el).html(this.chatCellTemplate({
	    username: this.options.username,
	    msg: this.options.msg
	   }));
		return this;
  }
 });

 window.ChatCellVideoView = Backbone.View.extend({

  chatCellVideoTemplate: _.template($('#chatcellVideo-template').html()),

  className: "messageContainer",
  initialize: function() {
   $("#messages").append(this.render().el);
		window.SurfStreamApp.get("mainView").playSound("chat_video_sound");	 
  },

  render: function(nowPlayingMsg) {
		$(this.el).html(this.chatCellVideoTemplate({
			videoSrc: ss_idToImg(this.options.videoID),
			title: this.options.videoTitle
		}));
		return this;
  }
 });

 window.RoomInfoView = Backbone.View.extend({
  el: '#roomInfo',

  roomInfoTemplate: _.template($('#room-info-template').html()),

  initialize: function() {
   $(this.el).html(this.roomInfoTemplate({
    roomName: this.options.roomName
   }));
  }
 });

 window.TheatreView = Backbone.View.extend({

  el: '#room-container',

  initialize: function() {
	 var becomeDJ = $("#become-dj"), remotePullup = $("#remote-pullup"), avatarVAL = $("#avatarWrapper_VAL");
   becomeDJ.bind("click", {theatreView: this, playlistCollection: this.options.userModel.get("playlistCollection")}, this.toggleDJStatus);
	 becomeDJ.hide();
	 $("#nowPlayingFull").hide();
	 $("#fullscreen").bind("click", {theatre: this}, this.fullscreenToggle);
	 $("#fullscreenIcon").bind("click", {theatre: this}, this.fullscreenToggle);
	 $(".video-div-proxy").hover(
		//onmousein
		function(e){
			console.log("in at " + e.layerX + ", " + e.layerY);
			$("#fullscreenIcon").stop()
			$("#now-playing-tv").stop()
			$("#time-elapsed-bar").stop()
			
			 $("#fullscreenIcon, #now-playing-tv, #time-elapsed-bar").css({display:"block"});
			$("#fullscreenIcon").animate({opacity: 1});
			$("#now-playing-tv").animate({opacity: .85});
			$("#time-elapsed-bar").animate({opacity: .85});
		
			
		}, 	
		
		//onmouseout
		function(e){
			if (e.toElement.id == "fullscreenIcon" || e.toElement.className == '.video-div-proxy') {
				console.log("on full or other proxy")
				return;
			}
			console.log("out at " + e.layerX + ", " + e.layerY);
			$("#fullscreenIcon").stop()
			$("#now-playing-tv").stop()
			$("#time-elapsed-bar").stop()
			var hide =  function(){ $(this).css({display:"none"}) };
			
		$("#fullscreenIcon").animate({opacity: 0},600, "swing", hide)
		$("#now-playing-tv").animate({opacity: 0},600, "swing", hide)
		$("#time-elapsed-bar").animate({opacity: 0},600, "swing", hide)
	
		});
	 $("#slider-line-container").bind('drag',function( event ){
									if (event.target.id == "slider-line" || event.target.id == "slider-line-container" || event.target.id == "slider-line-full"){
											console.log(event.layerX)
										if (event.layerX >= 98) {
												$( "#slider-ball" ).css({"margin-left": 89});
										} else {
											$( "#slider-ball" ).css({"margin-left": event.layerX + 10});
										}
									}
									var volume = Math.floor((($("#slider-ball").css("margin-left").replace("px", "") - 10) / 82) * 100);
										window.YTPlayer.setVolume(volume);
										$("#slider-line-full").css({width: (volume * .8) });		              
		                });
										
		
		
		$("#slider-line-container").bind('draginit',function( event ){
			if (event.layerX <= 98) {
			$( "#slider-ball" ).css({"margin-left": event.layerX + 10});
			var volume = Math.floor((($("#slider-ball").css("margin-left").replace("px", "") - 10) / 82) * 100);
				window.YTPlayer.setVolume(volume);
				$("#slider-line-full").css({width: (volume * .8) });		      
		}
		});
		
		
		
		
	 //$(".remote-top").bind("click", {remote: this}, this.pullRemoteUp);
	 //remotePullup.bind("click", {remote: this}, this.pullRemoteUp);
	 //remotePullup.attr("title", "Pull Up")
	 //remotePullup.tipsy({
	 //   gravity: 's',
	 //  });
	 
	 avatarVAL.css("margin-left", '410px');
	 avatarVAL.hide();
	 avatarVAL.data({"sofaML": 410});
	 avatarVAL.data({"sofaMT": 0});
	 avatarVAL.append(this.make('div', {id:'valtipsy', title: "<div style='color: #CAEDFA; font-family: \"Courier New\", Courier, monospace' >VAL, the Video Robot</div>", style:"z-index: 2; width: 70px; height: 40px; margin-top: 50px; position: absolute;" }));
	 this.valChatTipsy = this.make('div', {id:'avatarChat_VAL', "class": "chattip" });
	 avatarVAL.append(this.valChatTipsy);
	 $(this.valChatTipsy).css("margin-top", "15px");
	 $(this.valChatTipsy).tipsy({
		gravity: 'sw',
	  fade: 'true',
	  delayOut: 3000,
	  trigger: 'manual',
	  title: function() {
	  return this.getAttribute('latest_txt')
	  }
	 });
	 $("#valtipsy").tipsy({
	    gravity: 'n',
	    fade: 'true',
			html: true
	   });
   $("#up-vote").bind("click", this.voteUp);
   $("#down-vote").bind("click", SocketManagerModel.voteDown);
   $("#vol-up").bind("click", {
    offset: 10
   }, setVideoVolume);
   $("#vol-down").bind("click", {
    offset: -10
   }, setVideoVolume);
   $("#mute").bind("click", {
    button: $("#mute")
   }, mute);
	 $("#rooms").bind("click", {modal: this.options.modal}, function(e) { $("#room-modal").css("display") == "none" ? e.data.modal.show() : e.data.modal.hide() });
   this.options.userCollection.bind("add", this.placeUser, this);
   this.options.userCollection.bind("remove", this.removeUser, this);
   this.chats = [];
	 this.full = false;
	
		$("#ch-up").click({theatre: this}, function(e){
			var curRoom = SurfStreamApp.inRoom;
			e.data.theatre.flipChannel(curRoom, true);
		});
		
		$("#ch-down").click({theatre: this},function(e){
			var curRoom = SurfStreamApp.inRoom;
			e.data.theatre.flipChannel(curRoom, false);
		});
  },
	
	voteUp: function() {
		var nowPlaying = window.SurfStreamApp.get("roomModel").get("playerModel").get("curVid");
		var attributes = {
			title: nowPlaying.title,
			thumb: ss_idToImg(nowPlaying.videoId),
			videoId: nowPlaying.videoId,
			duration: nowPlaying.duration
		}
		var playlistItemModel = new PlaylistItemModel(attributes);
		window.SurfStreamApp.get("userModel").get("playlistCollection").addVideoToPlaylist(thumbsUpPlaylistId, playlistItemModel);
		SocketManagerModel.voteUp();
	},

	flipChannel: function(rID, up) {
		var roomArray = SurfStreamApp.get("roomModel").get("roomListCollection").toArray();
		var rIDArray = _.map(roomArray, function(room) {return room.get("rID")})
		var curIndex = _.indexOf(rIDArray, rID);
		if (up) {
			curIndex = curIndex + 1;
		} else {
			curIndex = curIndex - 1;
		}
		
		if (curIndex < 0) curIndex = rIDArray.length - 1;
		if (curIndex == rIDArray.length) curIndex = 0;
		
		SocketManagerModel.joinRoom(rIDArray[curIndex], false, rID.replace(/-+/g, ' '));
	},

	pullRemoteUp : function (e) {
		
		if((e.srcElement && (e.srcElement.localName != "button" || e.srcElement.id == "remote-pullup")) || (e.target && (e.target.localName != "button" || e.target.id == "remote-pullup")) )	{
			  
				$("#remote-container").animate({"margin-top": -17}, 300, function() {
					var remotePullup ,remoteTop, remote;
					
					remotePullup = $("#remote-pullup");
					//if(e.srcElement.id == "remote-pullup") remotePullup.tipsy("hide");
					
					remoteTop = $(".remote-top"); 
					remote = $("#remote");
					remotePullup.unbind("click");
					remoteTop.unbind("click");
					remote.bind("click", {remote: e.data.remote}, e.data.remote.pullRemoteDown);
					remotePullup.bind("click", {remote: e.data.remote}, e.data.remote.pullRemoteDown);
					remoteTop.addClass("up");
					remote.addClass("up");
					remotePullup.addClass("up");
					remotePullup.attr("title", "Pull Down")
				});
				
			}
	},
	
	pullRemoteDown: function(e) {
		
		if((e.srcElement && (e.srcElement.localName != "button" || e.srcElement.id == "remote-pullup")) || (e.target && (e.target.localName != "button" || e.target.id == "remote-pullup")) )	{			
			
			$("#remote-container").animate({"margin-top": 130}, 300, function() { 
				var remotePullup ,remoteTop, remote;			
				remotePullup = $("#remote-pullup");
				remotePullup.attr("title", "Pull Up")
				remoteTop = $(".remote-top"); 
				remote = $("#remote");
				remotePullup.unbind("click");
				remote.unbind("click");
				remoteTop.bind("click", {remote: e.data.remote}, e.data.remote.pullRemoteUp);
				remotePullup.bind("click", {remote: e.data.remote}, e.data.remote.pullRemoteUp);
				remoteTop.removeClass("up");
				remote.removeClass("up");
				remotePullup.removeClass("up");
			});
			
		}
	},

	fullscreenToggle: function(e) {
		e.data.theatre.full = !e.data.theatre.full;
		if (e.data.theatre.full) {
			SurfStreamApp.fullscreen = true;
			if (typeof(mpq) !== 'undefined') mpq.track("Fullscreen on", {mp_note:"Fullscreen open (onsofa: __)"});
			$("#YouTubePlayer").addClass("fully");
			$("#fullscreenIcon").addClass("fully");
			window.onmousemove = (function() {
				console.log("movin");
				if(window.mmTimeoutID) {
					window.clearTimeout(window.mmTimeoutID);
				}
				$("#nowPlayingFull").fadeIn(300);
				$("#fullscreenIcon").fadeIn(300);
				
				window.mmTimeoutID = setTimeout(function() {$("#nowPlayingFull").fadeOut(300); $("#fullscreenIcon").fadeOut(300);}, 100000)
			});
		} else {
			SurfStreamApp.fullscreen = false;
			if (typeof(mpq) !== 'undefined') mpq.track("Fullscreen off", {mp_note:"Fullscreen closed (onsofa: __)"});
			$("#YouTubePlayer").removeClass("fully");
			$("#fullscreenIcon").removeClass("fully");
			$("#nowPlayingFull").hide();
			if(window.mmTimeoutID) {
				window.clearTimeout(window.mmTimeoutID);
			}
			$("#fullscreenIcon").css("display", "none");
			window.onmousemove = null;
			window.mmTimeoutID = null;
		}
	},

	updateDJs : function(djArray) {
		var oldPosX, oldPosY, user;
		var X_COORDS = [200,275,348]; 
		var Y_COORD = 25;
		var cur_is_dj = false;
		var numOnSofa = 0;
		var newDJ;
		
		SurfStreamApp.sofaUsers = djArray;
		//Remove old DJs
		this.options.userCollection.each(function(userModel) {
     user = $("#avatarWrapper_" + userModel.get("id"));
		//if the user is a DJ
     if(user.data("isDJ") == "1") {
				//If there are not any DJ ID's that match the current ID of the user we're looking at
				if(!_.any(_.pluck(djArray, 'id'), function(el) {return (''+ el) == ('' + userModel.get("id"))})) {
					//take DJ off sofa
					oldPosX = user.data("roomX");
					oldPosY = user.data("roomY");
					user.animate({"margin-top": Y_COORD + 70}, 500, "bounceout").animate({"margin-left": oldPosX, "margin-top": oldPosY}, 600);
					user.data({"trueY": oldPosY});
	     	  user.data("isDJ", 0);
				}
		 }	
    });

		//Add new DJs
		
    for (var dj in djArray) {
		 numOnSofa = numOnSofa + 1;
		 user = $("#avatarWrapper_" + djArray[dj].id);
     
		 	if (djArray[dj].id == this.options.userModel.get("ssId")) {
				  cur_is_dj = true;
			}
			
			if(user.data("isDJ") == "0") {				
				user.data("isDJ", "1");
				newDJ = true;
				if (djArray[dj].id == this.options.userModel.get("ssId"))  {
					user.append("<div id='stepDown' style='width: 80px; height: 95px; position: absolute;'></div>");
					$('#stepDown').append("<a id='getOff' class='getOff' z-index=30 style='display: none; position: absolute;'>Step Down</a>");
					$('#stepDown').hover(function() {$('#getOff').fadeIn()}, function() {$('#getOff').fadeOut(); });
				}
			} else {
				newDJ = false;
				//if this dj has remote, slide their shit down as well
				if (SurfStreamApp.curDJ == djArray[dj].id){
					$("#sofa-remote").animate({"left": X_COORDS[dj] + 50, "top": Y_COORD[dj] + 50 });
					$("#skipContainer").animate({"margin-left": X_COORDS[dj], "margin-top":  Y_COORD + 100});
				}
			}
		console.log("Zindex: " + user.css("z-index"))
		//set the z index so the skip video doesn't cover it
		user.css("z-index", 1000);
		if (newDJ) {
			user.animate({"margin-left": X_COORDS[dj], "margin-top": Y_COORD + 70}, 400);
		} 
			
		user.animate({"margin-top": Y_COORD, "margin-left": X_COORDS[dj]}, 500, "bouncein", function() {$(this).css("z-index", "auto");}); /*restore auto z-index if hopped on couch and became current vj */
		
		user.data({"sofaMT": Y_COORD, "sofaML": X_COORDS[dj]});
		user.data({"trueY": Y_COORD});
		 
		}
		
		$("#avatarWrapper_VAL").show();
		
		if (cur_is_dj) {
			SurfStreamApp.onSofa = true;
		} else {
			SurfStreamApp.onSofa = false;
		}
		
		//NEED BOUNDS CHECK HERE TODO
		$("#become-dj").css("margin-left", X_COORDS[numOnSofa] + "px").css("margin-top", Y_COORD + "px");
    if(!cur_is_dj) { 
			$("#become-dj").show();
		} else {
			$("#become-dj").hide();
		}
	}, 

  toggleDJStatus: function(event) {
		if (event.data.playlistCollection.get("activePlaylist").get("videos").length == 0) {
			event.data.theatreView.valChat("You can't VJ without any videos!  >:-/ ");
			return;
		}
		$("#playlist-notification-container").slideToggle();
    SocketManagerModel.becomeDJ();
  },

  placeUser: function(user) {	
	 new AvatarView({user: user});	 
  },

	valChat: function(text) {
   $(this.valChatTipsy).attr('latest_txt', text);
   $(this.valChatTipsy).tipsy("show");
   setTimeout(function() {
	  if($("#avatarChat_VAL").length > 0)
			$("#avatarChat_VAL").tipsy("hide");
   }, 3000);
  },
  
	removeUser: function(user) {
	 var avatar = this.$("#avatarWrapper_" + user.id);
   var chat = $("#avatarChat_" + user.id);
	 avatar.data("animating", false);
	 chat.tipsy('hide');
   avatar.remove();
	}

 }, { /* Class properties */

  tipsyChat: function(text, fbid) {
   var userPic = $("#avatarChat_" + fbid);
	 var fbID = fbid;
   userPic.attr('latest_txt', text);
   userPic.tipsy("show");
   setTimeout(function() {
	  if($("#avatarChat_" + fbID).length > 0) userPic.tipsy("hide");
   }, 3000);
  }
 });

 window.AvatarView = Backbone.View.extend({
	
	initialize: function() {
		var avatarId, avatarImgSrc, avatarBody, avatarMouth, avatarSmile, user, nameDiv, stageX;
		user = this.options.user;
		this.el.id = "avatarWrapper_" + user.id;
		avatarId = user.get("avatar");
		avatarImgSrc = this.getAvatarSrc(avatarId);
		avatarBody = this.make('img', {id:'avatarBody_' + user.id, style: 'position:absolute;', src: avatarImgSrc });
		nameDiv = this.make('div', {id:'nameDiv_' + user.id, "class":"nametip", style: 'position:absolute;', title: user.get('name') });
		chatDiv = this.make('div', {id:'avatarChat_' + user.id, "class": "chattip" });
		avatarMouth = this.make('img', {"class": 'defaultSmile' + avatarId + " default", src: this.defaultMouthSrc });
		avatarSmile = this.make('img', {"class": 'defaultSmile'+ avatarId + " smiley", src:this.getSmileSrc(avatarId)});
		$(this.el).append(avatarBody).append(avatarMouth).append(avatarSmile).append(nameDiv).append(chatDiv);
		//put off stage
		if (user.get('x') < 290) {
			stageX = -80;
		} else {
			stageX = 680;
		}
		
		$(this.el).css("margin-left", stageX).css("margin-top", 280).css("position", 'absolute').css("z-index", 2);
		$("#people-area").prepend(this.el);
	  $("#avatarChat_" + user.id).tipsy({
	    gravity: 'sw',
	    fade: 'true',
	    delayOut: 3000,
	    trigger: 'manual',
	    title: function() {
	     return this.getAttribute('latest_txt')
	    }
	   });
		$("#nameDiv_" + user.id).tipsy({
		    gravity: 'n',
		    fade: 'true'
		   });
		$("#avatarWrapper_" + user.id).data("isDJ", "0");
		console.log("margintop stored, value: "+ user.get('y'))
		$(this.el).data({"roomX": user.get('x'), "roomY": user.get('y'), "trueY": user.get('y') });
		$(this.el).animate({"margin-top": user.get('y'), "margin-left": user.get('x'), "z-index": Math.floor(user.get('y')) }, 900, 'expoout');
	},
	
	putOnSofa : function() {
		
	},
	
	defaultMouthSrc: "/images/room/monsters/smiles/line.png",
	
	getAvatarSrc: function(avatarID) {
		switch(parseInt(avatarID, 10))
		{
		case 1:
		  return "/images/room/monsters/blue.PNG";
		case 2:
		  return "/images/room/monsters/green.png";
		case 3:
			return "/images/room/monsters/purple.png";
		case 4:
			return "/images/room/monsters/red.png";
		case 5:
			return "/images/room/monsters/yellow.png";
		default:
		  console.log("RUH-ROH!");
			return null;
		}
	},
	
	getSmileSrc: function(avatarID) {
		switch(parseInt(avatarID))
		{
		case 1:
		  return "/images/room/monsters/smiles/cucumberteeth.png";
		case 2:
		  return "/images/room/monsters/smiles/jankyteeth.png";
		case 3:
			return "/images/room/monsters/smiles/openteeth.png";
		case 4:
			return "/images/room/monsters/smiles/openmouth.png";
		case 5:
			return "/images/room/monsters/smiles/openteeth.png";
		default:
		  console.log("RUH-ROH!");
			return null;
		}
	}
 });
	
 window.ShareBarView = Backbone.View.extend({
  el: '#shareBar',

  shareTemplate: _.template($('#share-template').html()),

  initialize: function() {
   $(this.el).html(this.shareTemplate());
   $('#shareFB').css('background-image', '/images/fb_small.png');
   $('#shareTwit').css('background-image', '/images/twitter_small.png');
   $('#shareEmail').css('background-image', '/images/email_small.png');
   $('#link').html("Link: <input type=\"text\" value=\"" + window.location + "\"/>");
   $('#copy-button-container').html("<div id=\"copy-button\" style=\"position:relative\"></div>");
   this.link = document.URL;
   var clip = new ZeroClipboard.Client();
	 clip.setHandCursor(true);
   clip.setText(this.link);
   clip.glue('copy-button', 'copy-button-container');
  },

  events: {
   "click #shareFB": "fbDialog",
   "click #shareTwit": "tweetDialog",
   "click #shareEmail": "openEmail"
  },

  fbDialog: function() {
   FB.ui(
  {
    method: 'feed',
		display: 'popup',
    name: 'Surfstreaming',
		link: this.link,
    caption: 'StreamSurfin all day',
    description: 'Streamsurfin'
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
   var width = 575,
       height = 400,
       left = ($(window).width() - width) / 2,
       top = ($(window).height() - height) / 2,
       url = "http://twitter.com/share?text=Check%20out%20this%20awesome%20room!",
       opts = 'status=1' + ',width=' + width + ',height=' + height + ',top=' + top + ',left=' + left;

   window.open(url, 'twitter', opts);

  },

  openEmail: function() {
   window.open("mailto:friend@domainname.com?subject=Come%20to%20SurfStream.tv%20sometime!&body=God%20this%20shit%20is%20" + "awesome!%2C%20here's%20a%20link%0A%0A" + window.location, '_parent');
  }
 });
 
 window.SettingsView = Backbone.View.extend({
	//className: "settingsButton",
	
	el: "#settings",
	
	settingsTemplate: _.template($("#settings-template").html()),
	
	events: {
		"mouseover #settings-text": "showSettings",
		"mouseout": "hideSettings",
		"click #logout-button": "logout"
	},
	
	initialize: function() {
		this.showingDropdown = false;
		this.render();
		this.userModel = this.options.userModel;
	},
	
	render: function() {
		$(this.el).html(this.settingsTemplate());
	},
	
	showSettings: function(event) {
		if (!this.showingDropdown) {
			if (event.fromElement) {
				if (event.fromElement.id == "settings-dropdown" && event.fromElement.id == "settings-arrow")
					return;
			}
			console.log("Showing settings");
			$("#settings-dropdown").show();
			this.showingDropdown = true;
		}
	},
	
	hideSettings: function(event) {
		console.log("HERERERE");
		console.log(event);
		if (event.toElement) {
			if (event.toElement.id == "settings-arrow" || event.toElement.id == "settings-dropdown" || event.toElement.id == "settings" || event.fromElement.id == "settings-arrow" || event.toElement.id == "logout-button") {
				console.log(event.toElement.id);
				return;
			}
		}
		console.log("Hiding settings");
		$("#settings-dropdown").hide();
		this.showingDropdown = false;
	},
	
	logout: function() {
		console.log("logoutttt");
		window.YTPlayer = null;
		userLoggedOut = true;
		this.userModel.logout();
	}
 });

 window.MainView = Backbone.View.extend({
  el: 'body',
	
	soundTemplate: _.template($('#audio-tag-template').html()),

  initialize: function() {
		this.soundOn = true;
		$('#getOff').live('click', function() {
			$("#playlist-notification-container").slideToggle();
		  $("#stepDown").remove();
			$('#getOff').remove();
			$("#skipContainer").remove();
			SocketManagerModel.stepDownFromDJ();
		});
		
	 	$("img").live('mousedown', function(){
		    return false;
		});
		
		$("#contactButton").click(function() {
			window.open("mailto:contact@surfstream.tv", '_parent');
		});
		
		this.maxAudioChannels = 15;
  },

  initializeTopBarView: function() {
   this.roomInfoView = new RoomInfoView(({
    roomName: 'Placeholder'
   }));
   this.shareBarView = new ShareBarView();
	 this.settingsView = new SettingsView({userModel: this.options.userModel});
  },

  initializeChatView: function(chatCollection, userModel) {
   this.chatView = new ChatView({
    chatCollection: chatCollection,
    userModel: userModel
   });
  },

  initializeSidebarView: function(searchBarModel, playlistCollection) {
   this.sideBarView = new SideBarView({
    searchBarModel: searchBarModel,
    playlistCollection: playlistCollection
   });
  },

  initializePlayerView: function(playerModel, userCollection, userModel, modalPop) {
   this.videoPlayerView = new VideoPlayerView({
    playerModel: playerModel
   });
   this.theatreView = new TheatreView({
    userCollection: userCollection,
		userModel: userModel,
		modal: modalPop
   });
  },

	initializeRoomListView: function(roomListCollection) {
		//HACK
			$("#ListRooms").bind("click", SocketManagerModel.loadRoomsInfo);		
			this.roomModal = new RoomListView({roomlistCollection: roomListCollection});		
		//ENDHACK
	},
	
	initializeRoomHistoryView: function(roomHistoryCollection) {
		this.roomHistoryView = new RoomHistoryView({roomHistoryCollection: roomHistoryCollection});
	},
	
	initializeSounds: function() {
		this.audioChannels = new Array();
		for (var i = 0; i < this.maxAudioChannels; i++) {
			this.audioChannels[i] = new Array();
			this.audioChannels[i]['channel'] = new Audio();
			this.audioChannels[i]['finished'] = -1;
			
		}
		$(document.body).append(this.soundTemplate({audio_tag_id: "chat_message_sound", audio_src: "/sounds/chat.wav"}));
		$(document.body).append(this.soundTemplate({audio_tag_id: "chat_video_sound", audio_src: "/sounds/click1.wav"}));
	},
	
	playSound: function(audioTagId) {
		if (this.soundOn) {
			for (var i = 0; i < this.maxAudioChannels; i++) {
				var currentTime = new Date();
				if (this.audioChannels[i]['finished'] < currentTime.getTime()) {
					this.audioChannels[i]['finished'] = currentTime.getTime() + document.getElementById(audioTagId).duration * 1000;
					this.audioChannels[i]['channel'].src = document.getElementById(audioTagId).src;
					this.audioChannels[i]['channel'].load();
					this.audioChannels[i]['channel'].play();
					break;
				}
			}
		}
	}

 });

 window.SocketManagerModel = Backbone.Model.extend({
  initialize: function() {
   var socket, app;
   socket = this.get("socket");
   app = this.get("app");
   if (!socket) {
    throw "No Socket Passed to SocketManager!";
   } else {
    console.log("Got socket. " + socket);
   }

   if (!app) {
    throw "No App Passed to SocketManager!";
   } else {
    console.log("Got app. " + app);
  }

   /* First set up all listeners */
   //Chat -- msg received
   socket.on("video:sendInfo", function(video) {
		console.log('video announced');
		var remoteX, remoteY,curX, curY, djRemote, rotationDegs, isdj, skipX, skipY;
		var lastDJ = SurfStreamApp.curDJ;
		SurfStreamApp.curDJ = video.dj;
		if (typeof(mpq) !== 'undefined') mpq.track("Video Started", {DJ: video.dj, fullscreen: SurfStreamApp.fullscreen, mp_note: "Video '" + video.title + "' played by " + video.dj + "(fullscreen: " + SurfStreamApp.fullscreen +")"});
		SurfStreamApp.vidsPlayed = SurfStreamApp.vidsPlayed + 1;
		console.log('received video, the DJ is: '+video.dj+' and has videoid: '+video.id+' and title: '+video.title+' and time start: '+video.time);	//debugging
		$("#fullTitle").html(video.title);
		$("#cur-video-name").html(video.title);
		var curvid, roomModel, playerModel;
		if (video.dj == app.get("userModel").get("ssId")) {
			$("#video-list-container .videoListCellContainer:first").remove();
			var playlistModel = app.get("userModel").get("playlistCollection").get("activePlaylist");
			var playlistItemModel = playlistModel.get("videos").at(0);
			var copyPlaylistItemModel = new PlaylistItemModel(playlistItemModel.attributes);
			playlistModel.get("videos").add(copyPlaylistItemModel, {
				at: playlistModel.get("videos").length
			});
			
			var playlistCellView = new PlaylistCellView({
				playlistItemModel: copyPlaylistItemModel,
				playlistId: copyPlaylistItemModel.get("playlistId"),
				id: copyPlaylistItemModel.get("videoId")
			});
			playlistCellView.initializeViewToTop(false);
			window.SurfStreamApp.get("mainView").sideBarView.playlistCollectionView.playlistView.setNotificationText();
		}
    if (!window.playerLoaded) {
     var params = {
      allowScriptAccess: "always",
     	wmode: "opaque",
			modestbranding: 1,
			iv_load_policy: 3
		 };
     var atts = {
      id: "YouTubePlayer"
     };
     swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3enablejsapi=1&playerapiid=YouTubePlayer", "video-container", "640", "390", "8", null, null, params, atts);
     window.video_ID = video.id;
		 window.secs = video.time;
		 window.video_title = video.title;
		 setInterval(updateTime, 1000);
    } else {
     window.YTPlayer.loadVideoById(video.id, video.time);
     new ChatCellVideoView({
      username: "Now Playing: ",
			videoID: video.id,
			videoTitle: video.title
     });
     app.get("mainView").chatView.chatContainer.activeScroll();
    }
    //HACK
    $("#room-name").html(video.title)
    app.get("roomModel").get("userCollection").forEach(function(userModel) {
	  	$("#avatarWrapper_" + userModel.get("id")).data("animating", false);
     	$("#avatarWrapper_" + userModel.get("id")+ " .smiley").hide();
     	$("#avatarWrapper_" + userModel.get("id")+ " .default").show();
    });
    //ENDHACK
		roomModel = app.get("roomModel")
		playerModel = roomModel.get("playerModel");
		curvid =  playerModel.get("curVid");
		if (curvid) {
			app.get("mainView").roomHistoryView.addToRoomHistory(new RoomHistoryItemModel({title: curvid.title, duration: curvid.duration, percent: curvid.percent, videoId: curvid.videoId}));
			var playlistCollection = window.SurfStreamApp.get("userModel").get("playlistCollection");
			if (lastDJ != app.get("userModel").get("ssId") && !playlistCollection.getPlaylistById(recentlyWatchedPlaylistId).hasVideo(curvid.videoId)) {
				var playlistItemModel = new PlaylistItemModel({
					title: curvid.title,
					thumb: ss_idToImg(curvid.videoId),
					videoId: curvid.videoId,
					duration: curvid.duration
				});
				playlistCollection.addVideoToPlaylist(recentlyWatchedPlaylistId, playlistItemModel);
			}
		}
		//save the currently playing state
		playerModel.set({curVid: {videoId: video.id, title: video.title, duration: video.duration, percent:50} });
		$("#clock").show(); 
		$("#cur-video-name").show(); 
		$("#cur-video-time").show(); 
		var isdj = (SurfStreamApp.curDJ == SurfStreamApp.get("userModel").get("ssId"));
		if (isdj && $("#skip").length == 0) {
			$("#people-area").append("<div id='skipContainer' class='bottombuttonContainerwide'><button id='skip'> Skip Video </button></div>");
			skipX = $("#avatarWrapper_" + video.dj).data("sofaML");
			skipY = $("#avatarWrapper_" + video.dj).data("sofaMT") + 100;
			$("#skipContainer").css({"margin-left": skipX, "margin-top": skipY});
			$("#skip").bind("click", skipVideo);
		} else {
			$("#skipContainer").remove();
		}
		//put remote on appropro DJ
		djRemote = $("#sofa-remote");
		curX = parseInt(djRemote.css("left").replace("px", ""));
		curY = parseInt(djRemote.css("top").replace("px", ""));
		remoteX = $("#avatarWrapper_" + video.dj).data("sofaML") + 50;
		remoteY = $("#avatarWrapper_" + video.dj).data("sofaMT") + 50;
		var bezier_params = {
		    start: { 
		      x: curX, 
		      y: curY, 
		      angle: (curX > remoteX) ? 50: -50,
					length: .8
		    },  
		    end: { 
		      x:remoteX,
		      y:remoteY, 
		      angle: (curX > remoteX) ? -50: 50
		    }
		  }

		this.rotateRemoteSign = !this.rotateRemoteSign
		rotationDegs = "=1800deg"
		if (this.rotateRemoteSign) {
			rotationDegs = "+" + rotationDegs;
		} else {
			rotationDegs = "-" + rotationDegs;
		}
		djRemote.animate({rotate: rotationDegs, path : new $.path.bezier(bezier_params)}, 1000);
   });

   socket.on('video:stop', function() {
    if (!window.playerLoaded) return;
    console.log('video ending!');
    window.YTPlayer.stopVideo();
    window.YTPlayer.clearVideo();
   });

	 socket.on("user:profile", function(profile) {
		if (profile == null) {
			app.get("userModel").getFBUserData();
		} else {
			app.get("userModel").set({
				displayName: profile.first_name + " " + profile.last_name,
				avatarImage: 'https://graph.facebook.com/' + profile.id + '/picture',
				ssId: profile.ssId
			});
			FB.api('/me/friends', app.get("userModel").sendUserFBFriends);
		}
	 });

   socket.on('playlist:initialize', function(data) {
		if (userLoggedOut)
			return;
		var userPlaylists = data.userPlaylists;
		var playlistCollection = app.get("userModel").get("playlistCollection");
		for (var playlistId in userPlaylists) {
			if (userPlaylists.hasOwnProperty(playlistId)) {
				playlistCollection.addPlaylist(playlistId, userPlaylists[playlistId].name, new PlaylistItemCollection(userPlaylists[playlistId].videos));
			}
		}
		playlistCollection.setActivePlaylist(data.activePlaylistId);
		var getPath = function(href) {
		    var l = document.createElement("a");
		    l.href = href;
		    return l.pathname;
		}
		console.log("ROUTING ON " + getPath(window.location));
		
		SurfStreamApp.showModalOnLoad = (getPath(window.location) == "/");
		Backbone.history.start({pushState: true, silent: SurfStreamApp.showModalOnLoad});
		if (!SurfStreamApp.showModalOnLoad && SurfStreamApp.gotRoomList) {
			app.get("mainView").roomModal.hide();
		}
   });

   socket.on('message', function(msg) {
    app.get("roomModel").get("chatCollection").add({
     username: strip(msg.data.name),
     msg: strip(msg.data.text)
    });
    
   });

   socket.on('users:announce', function(userJSONArray) {
    //userJSONArray is an array of users, with .userId = fbid#, .name = full name, .avatar = TBD,
    // .points = TBA, .x = top coord for room-conatiner, .y = leftmost coord for room-container
    app.get("roomModel").updateDisplayedUsers(userJSONArray);
   });

   socket.on('djs:announce', function(djArray) {
		console.log('djs announced');
		app.get("mainView").theatreView.updateDJs(djArray);
   });

	

   //.upvoteset maps userids who up to true, .down, .up totals
   socket.on("meter:announce", function(meterStats) {
		var total = 0;
    for (var fbid in meterStats.upvoteSet) {
     if (meterStats.upvoteSet[fbid] === true) {
			total = total + 1;
      //app.get("roomModel").get("users").get(fbid).
      //BEGIN HACK
			$("#avatarWrapper_" + fbid + " .smiley").show();
			$("#avatarWrapper_" + fbid + " .default").hide();
			(function() {
				var element = $("#avatarWrapper_" + fbid);
				element.data("animating", true);				
			    (function(){
						  var marginTop = element.data("trueY");
							if (element.data("animating") == true) {
			        element
			            .animate({ marginTop: marginTop - 6 }, 500)
			            .animate({ marginTop: marginTop },   500, arguments.callee);
							}
			    }());
			}())
      //ENDHACK
     } else { //FOR UPVOTE, THEN DOWNVOTE
			$("#avatarWrapper_" + fbid).data("animating", false);
			$("#avatarWrapper_" + fbid + " .smiley").hide();
			$("#avatarWrapper_" + fbid + " .default").show();
		 }
    }
		if (app.get("roomModel").get("playerModel").get("curVid") && meterStats.videoId != 0) {
			if (app.get("roomModel").get("playerModel").get("curVid").videoId == meterStats.videoId)
				app.get("roomModel").get("playerModel").get("curVid").percent = meterStats.videoPercent;
		}
   });

	socket.on("rooms:announce", function(roomList) {
		SurfStreamApp.gotRoomList = true;
		var roomlistCollection = app.get("roomModel").get("roomListCollection");
		roomlistCollection.reset();
		for (var i = 0; i < roomList.rooms.length; i++) {
			roomlistCollection.add(new RoomlistCellModel(roomList.rooms[i]));
		}
		for(var friendId in roomList.friendsRooms) {
			if(roomList.friendsRooms.hasOwnProperty(friendId)) {
				var roomModel = ss_modelWithAttribute(roomlistCollection, "rID", roomList.friendsRooms[friendId]);
				roomModel.get("friends").push(friendId);
			}
		}
		roomlistCollection.sort();
	});

	socket.on("room:history", function(roomHistory) {
		app.get("roomModel").get("roomHistoryCollection").reset(roomHistory);
	});
	
	socket.on("val:sendRecs", function(recs) {
		console.log('got recs '+ recs);
		var resultsCollection = app.get("searchBarModel").get("searchResultsCollection");
	  var buildup = [];
	   for (var i = 0; i < recs.length; i++) {
	    var item = JSON.parse(recs[i]);
	    var videoResult = {
	     title: item.title,
	     thumb: ss_idToImg(item.id),
			 videoId: item.id,
	     duration: item.duration,
	     viewCount: 0,
	     author: item.uploader
	    };
	    buildup.push(videoResult);
	   }
		resultsCollection.reset();
		$("#searchContainer").empty();
		if (buildup.length > 0) {
			$("#searchContainer").append('<div style="text-align: center">Recommended Videos</div>');
		} else {
			$("#searchContainer").append('<div style="font-size: 13px; text-align: center">The more videos you play and like/dislike, the better the videos VAL will play</div>');
		}
		
	   resultsCollection.add(buildup);
	});
	
 }

 }, {
  socket: socket_init,

  /* Outgoing Socket Events*/
  sendFBId: function(id) {
		SocketManagerModel.socket.emit("user:sendFBId", id);
  },

	sendFBUser: function(user) {
		SocketManagerModel.socket.emit("user:sendFBData", user);
		if (typeof(mpq) !== 'undefined') mpq.name_tag(user.name);
	},
	
	sendUserFBFriends: function(friendIdList) {
		SocketManagerModel.socket.emit("user:sendUserFBFriends", friendIdList);
	},

  sendMsg: function(data) {
   SocketManagerModel.socket.emit("message", data);
  },

  becomeDJ: function() {
	 var valplay = (SurfStreamApp.curDJ == "VAL" ? true : false );
	 var numOnSofa = SurfStreamApp.sofaUsers.length;
	 if (typeof(mpq) !== 'undefined') mpq.track("Sofa Join", {VAL_Playing: valplay, mp_note: "Stepped onto sofa ("+ numOnSofa +" people on sofa, __ friends in room, val playing: " + valplay + ")"});
   SocketManagerModel.socket.emit('dj:join');
  },

  stepDownFromDJ: function() {
	 var valplay = (SurfStreamApp.curDJ == "VAL" ? true : false );
	 var isdj = (SurfStreamApp.curDJ == SurfStreamApp.get("userModel").get("fbId"));
	 var numOnSofa = SurfStreamApp.sofaUsers.length
	 if (typeof(mpq) !== 'undefined') mpq.track("Sofa Leave", {VAL_playing: valplay, mid_play: isdj,mp_note: "Stepped off of sofa ("+ numOnSofa +" people on sofa, __ friends in room, val playing: "+ valplay  +", midPlay: "+ isdj +")"});
   SocketManagerModel.socket.emit('dj:quit');
  },

  addVideoToPlaylist: function(playlistId, videoId, thumb, title, duration, author, append) {
   SocketManagerModel.socket.emit('playlist:addVideo', {
		playlistId: playlistId,
    videoId: videoId,
    thumb: thumb,
    title: title,
		duration: duration,
		author: author,
		append: append
   });
  },

  voteUp: function() {
	 if (typeof(mpq) !== 'undefined') mpq.track("Vote up", {mp_note: "Video was voted up (fronthalf: ___)"});
   SocketManagerModel.socket.emit('meter:upvote');
  },

  voteDown: function() {
	 if (typeof(mpq) !== 'undefined') mpq.track("Vote down", {mp_note: "Video was voted down (fronthalf: ___)"});
   SocketManagerModel.socket.emit('meter:downvote');
  },

  toTopOfPlaylist: function(playlistId, vid_id) {
   SocketManagerModel.socket.emit("playlist:moveVideoToTop", {
		playlistId: playlistId,
    videoId: vid_id
   });
  },

  deleteFromPlaylist: function(playlistId, vid_id) {
   SocketManagerModel.socket.emit("playlist:delete", {
		playlistId: playlistId,
    videoId: vid_id
   });
  },

	toIndexInPlaylist: function(playlistId, vid_id, newIndex) {
		SocketManagerModel.socket.emit("playlist:moveVideo", {
			playlistId: playlistId,
			videoId: vid_id,
			index: newIndex
		});
	},
	
	choosePlaylist: function(playlistId) {
		SocketManagerModel.socket.emit("playlists:choosePlaylist", {
			playlistId: playlistId
		});
	},
	
	addPlaylist: function(playlistId, playlistName) {
		SocketManagerModel.socket.emit("playlists:addPlaylist", {
			playlistId: playlistId,
			playlistName: playlistName
		});
	},
	
	deletePlaylist: function(playlistId) {
		console.log(playlistId);
		SocketManagerModel.socket.emit("playlists:deletePlaylist", {
			playlistId: playlistId
		});
	},

	loadRoomsInfo: function() {
		SocketManagerModel.socket.emit('rooms:load', {id: window.SurfStreamApp.get("userModel").get("ssId")});
		console.log(window.SurfStreamApp.get("userModel").get("ssId"));
		console.log("LOGGED");
	},
	
	joinRoom: function(rID, create, roomName) {
		var vidsPlayed = SurfStreamApp.vidsPlayed;
		var isDJ = (SurfStreamApp.curDJ == SurfStreamApp.get("userModel").get("ssId"));
		SurfStreamApp.vidsPlayed = 0;
		$("#cur-room-name").html("<span style='font-weight:normal'>Channel:</span> " + roomName);
		$("#cur-video-name").hide();
		$("#cur-video-time").hide();
		
		$("#cur-video-info").css("max-width", 415 - $("#cur-room-name").css("width").replace("px",''));
		
		$("#clock").hide(); 
		if (typeof(mpq) !== 'undefined'){
			mpq.track("Room Joined", {wasDJ: isDJ, rID:rID, mp_note: "Joined room " + rID + " (Left Room: " + (SurfStreamApp.inRoom ? SurfStreamApp.inRoom : "") + ", watched " + vidsPlayed + " vids there"}); 
		}
		var payload = {rID: rID};
		if (create) {
			payload.create = true;
			payload.roomName = roomName;
		}
		if (SurfStreamApp.inRoom) {
			payload.currRoom = SurfStreamApp.inRoom;
		}		
		SurfStreamApp.inRoom = rID;
		payload.fbId = window.SurfStreamApp.get("userModel").get("fbId");
		payload.ssId = window.SurfStreamApp.get("userModel").get("ssId");
		SurfStreamApp.get("roomModel").get("chatCollection").reset();
		$("#sofa-remote").css({left: "170px", top: "140px", "z-index": 1});
		$("#skipContainer").remove();
		window.SurfStreamApp.get("roomModel").updateDisplayedUsers([]);
		window.SurfStreamApp.get("roomModel").get("userCollection").reset();
		if (window.YTPlayer) {
			window.YTPlayer.stopVideo();
			window.YTPlayer.loadVideoById(1); // hack because clearVideo FUCKING DOESNT WORK #3hourswasted
		}
		window.SurfStreamApp.get("roomModel").get("playerModel").set({curVid: null}); //dont calculate a room history cell on next vid announce
		SocketManagerModel.socket.emit('room:join', payload);
		SocketManagerModel.socket.emit("val:requestRecs");
		SurfStreamApp.curDJ = "__none__";
	}

 });

 window.RaRouter = Backbone.Router.extend({ 
	routes: {
		":rID":	"joinRoom"
	},
		
	joinRoom: function(rID) {
		SocketManagerModel.joinRoom(rID, false, rID.replace(/-+/g, ' '));
	}
 });
	
 window.playerLoaded = false;

 	var e = document.createElement('script'); e.async = true;
	e.src = document.location.protocol + '//connect.facebook.net/en_US/all.js';
	document.getElementById('fb-root').appendChild(e);
});

function setSuggestions(suggestions) {
	var suggestionSource = _.pluck(suggestions[1], 0);
	window.SurfStreamApp.get("mainView").sideBarView.searchView.suggestionHash[suggestions[0]] = suggestionSource;
	$( "#youtubeInput" ).autocomplete( "option", "source", suggestionSource);
};

function onYouTubePlayerReady(playerId) {
 if (playerId == "YouTubePlayerTwo") {
	window.YTPlayerTwo = document.getElementById('YouTubePlayerTwo');
	return;
 }

 if (!window.YTPlayer) {
  window.YTPlayer = document.getElementById('YouTubePlayer');
  window.YTPlayer.addEventListener('onStateChange', 'onytplayerStateChange');
  window.playerLoaded = true;
  if (window.video_ID) {
   window.YTPlayer.loadVideoById(window.video_ID, window.secs);
	 	new ChatCellVideoView({
     username: "Now Playing: ",
			videoID: window.video_ID,
			videoTitle: window.video_title
    });
  }
 }
}

function setToTime() {
 window.YTPlayer = document.getElementById('YouTubePlayer');
 window.YTPlayer.addEventListener('onStateChange', 'onytplayerStateChange');
 window.YTPlayer.seekTo(window.secs);
}

function setVideoVolume(event) {
 var volume = window.YTPlayer.getVolume();
 if (volume + event.data.offset >= 0 && volume + event.data.offset <= 100) {
  window.YTPlayer.setVolume(volume + event.data.offset);
 }
}

function mute(event) {
 if (window.YTPlayer.isMuted()) {
  window.YTPlayer.unMute();
	if (typeof(mpq) !== 'undefined') mpq.track("Mute toggled", {mp_note: "Volume was toggled on"}); 
 } else {
  window.YTPlayer.mute();
 	if (typeof(mpq) !== 'undefined') mpq.track("Mute toggled", {mp_note: "Volume was toggled off"});
 }
}

function onytplayerStateChange(newState) {

}

function ss_formatSeconds(time) {
	var hours = null, minutes = null, seconds = null, result;
	time = Math.floor(time);
	hours = Math.floor(time / 3600);
	time = time - hours * 3600;
	minutes = Math.floor(time / 60);
	seconds = time - minutes * 60;
	result =  "" + ((hours > 0) ? (hours + ":") : "") + ((minutes > 0) ? ((minutes < 10 && hours > 0) ? "0" + minutes + ":" : minutes + ":") : "0:") + ( (seconds < 10) ? "0" + seconds : seconds);
	return result;
}

function ss_idToImg(id) {
	return "http://img.youtube.com/vi/"+id+"/0.jpg";
}

function ss_idToHDImg(id) {
	return "http://i1.ytimg.com/vi/" + id + "/hqdefault.jpg"
}

function ss_modelWithAttribute(collection, attribute, valueToMatch) {
	for (var i = 0; i < collection.length; i++) {
		if (collection.at(i).get(attribute) == valueToMatch) {
			return collection.at(i);
		}
	}
	return null;
}

function updateTime() {
	if(window.YTPlayer){
		$("#countdownFull").html(ss_formatSeconds(window.YTPlayer.getCurrentTime()) + "/" + ss_formatSeconds(window.YTPlayer.getDuration()));
		if(window.YTPlayer.getDuration() - window.YTPlayer.getCurrentTime() != 0){
		 $("#cur-video-time").html(ss_formatSeconds(window.YTPlayer.getDuration() - window.YTPlayer.getCurrentTime()));
		 $("#time-elapsed-bar").css({"width": 635*(window.YTPlayer.getCurrentTime()/window.YTPlayer.getDuration()) + "px"});
		}
	}	
}

function skipVideo() {
 socket_init.emit("video:skip");
}

var soundEmbed = null;

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function strip(html) {
   var tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent||tmp.innerText;
}


function ss_formatViews(n) {
   var s = ""+n, abs = Math.abs(n), _, i;

   if (abs >= 1000) {
       _  = (""+abs).split(/\./);
       i  = _[0].length % 3 || 3;

       _[0] = s.slice(0,i + (n < 0)) +
              _[0].slice(i).replace(/(\d{3})/g,',$1');

       s = _.join('.');
   }

   return s;
}

var recentlyWatchedPlaylistId = 1;
var thumbsUpPlaylistId = 2;
var facebookPlaylistId = 3;
var userLoggedOut = false;

/******************** FB_INITONE ***********************/


function login(response, info) {
	if (response.authResponse) {
		var accessToken = response.authResponse.accessToken;
		userInfo.innerHTML = '<img src="https://graph.facebook.com/' + info.id + '/picture">' + info.name
			+ "<br /> Your Access Token: " + accessToken;
		showLoader(false);
		document.getElementById('other').style.display = "block";
	}
}
		

//stream publish method
function streamPublish(name, description, hrefTitle, hrefLink, userPrompt) {
	showLoader(true);
	FB.ui(
		{
			method: 'stream.publish',
			message: '',
			attachment: {
				name: name,
				caption: '',
				description: (description),
				href: hrefLink
			},
			action_links: [
				{ text: hrefTitle, href: hrefLink }
			],
			user_prompt_message: userPrompt
		},
		function(response) {
			showLoader(false);
		}
	);
}
			
function showStream() {
	FB.api('/me', function(response) {
		//console.log(response.id);
		streamPublish(response.name, 'I like the articles of Thinkdiff.net', 'hrefTitle', 'http://thinkdiff.net', "Share thinkdiff.net");
		}
	);
}

function share() {
	showLoader(true);
	var share = {
		method: 'stream.share',
		u: 'http://thinkdiff.net/'
	};
		
	FB.ui(share, function(response) {
		showLoader(false);
		console.log(response);
	});
}
			
function graphStreamPublish(){
	showLoader(true);
				
	FB.api('/me/feed', 'post',
		{
			message     : "I love thinkdiff.net for facebook app development tutorials",
			link        : 'http://ithinkdiff.net',
			picture     : 'http://thinkdiff.net/iphone/lucky7_ios.jpg',
			name        : 'iOS Apps & Games',
			description : 'Checkout iOS apps and games from iThinkdiff.net. I found some of them are just awesome!'
		},
	
		function(response) {
			showLoader(false);
			if (!response || response.error) {
				alert('Error occured');
			} else {
				alert('Post ID: ' + response.id);
			}
		}
	);
}

function fqlQuery(){
	showLoader(true);
	
	FB.api('/me', function(response) {
		showLoader(false);
		
		//http://developers.facebook.com/docs/reference/fql/user/
		var query       =  FB.Data.query('select name, profile_url, sex, pic_small from user where uid={0}', response.id);
		query.wait(function(rows) {
			document.getElementById('debug').innerHTML =
				'FQL Information: '+  "<br />" +
				'Your name: '      +  rows[0].name
				'Your Sex: '       +  (rows[0].sex!= undefined ? rows[0].sex : "")                            + "<br />" +
				'Your Profile: '   +  "<a href='" + rows[0].profile_url + "'>" + rows[0].profile_url + "</a>" + "<br />" +
				'<img src="'       +  rows[0].pic_small + '" alt="" />' + "<br />";
		});
	});
}

function setStatus(){
	showLoader(true);
	status1 = document.getElementById('status').value;
	FB.api({
		method: 'status.set',
		status: status1
	},
	function(response) {
		if (response == 0){
			alert('Your facebook status not updated. Give Status Update Permission.');
		} else {
			alert('Your facebook status updated');
		}
		showLoader(false);
	});
}

function showLoader(status) {
	if (status) {
		document.getElementById('loader').style.display = 'block';
	}	else {
		document.getElementById('loader').style.display = 'none';}
	}