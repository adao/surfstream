$(function() {
 
 _.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
 };

 ZeroClipboard.setMoviePath('/swf/ZeroClipboard.swf');

 window.ChatMessageModel = Backbone.Model.extend({});

 window.VideoPlayerModel = Backbone.Model.extend({});

 window.RoomModel = Backbone.Model.extend({

  updateDisplayedUsers: function(userJSONArray) {
   var hash = {};
   var userCollection = this.get("userCollection");
   _.each(userJSONArray, function(user) { 
			if (!userCollection.get(user.id)) userCollection.add(user);
	    hash[user.id] = true;
		});


   userCollection.each(function(userModel) {
    if (!hash[userModel.get('id')]) userModel.collection.remove(userModel);
   });

  }

 });

 window.SearchBarModel = Backbone.Model.extend({

  executeSearch: function(searchQuery) {
   this.set({
    searchTerm: searchQuery
   });
   $.ajax({
    url: "http://gdata.youtube.com/feeds/api/videos?max-results=10&format=5&alt=json&q=" + searchQuery,
    success: $.proxy(this.processResults, this)
   });
  },

  processResults: function(data) {
   console.log(data);
   var feed, entries, resultsCollection, buildup;
   feed = data.feed ? data.feed : jQuery.parseJSON(data).feed;
   entries = feed.entry || [];
   resultsCollection = this.get("searchResultsCollection");
   buildup = [];
   for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var videoResult = {
     title: entry.title.$t,
     thumb: entry.media$group.media$thumbnail[0].url,
     videoUrl: entry.id.$t,
     duration: entry.media$group.yt$duration.seconds,
     viewCount: entry.yt$statistics.viewCount,
     author: entry.author[0]
    };
    buildup.push(videoResult);
   }
   resultsCollection.add(buildup);
  }
 });

 window.ShareModel = Backbone.Model.extend({
  initialize: function() {

  }
 });

 window.UserModel = Backbone.Model.extend({
  //has fbInfo, avatarImage
  defaults: {
   is_main_user: false
  },

  getFBUserData: function() {
   if (this.get("is_main_user")) {
    FB.api('/me', this.setUserData);
    FB.api('/me/friends', this.sendUserFBFriends);
		this.getUserPostedVideos();
   }
  },

  setUserData: function(info) {
   window.SurfStreamApp.get('userModel').set({
    displayName: info.first_name + " " + info.last_name,
    avatarImage: 'https://graph.facebook.com/' + info.id + '/picture'
   });
   SocketManagerModel.sendFBUser(info);
  },

	sendUserFBFriends: function(info) {
		var friendIdList = _.pluck(info.data, "id");
		console.log(friendIdList);
		SocketManagerModel.sendUserFBFriends({
			fbId: window.SurfStreamApp.get('userModel').get("fbId"),
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
			author: entry.author[0].name.$t
		}
		var playlistItemModel = new PlaylistItemModel(attributes);
		this.get("playlistCollection").add(playlistItemModel);
		SocketManagerModel.addVideoToPlaylist(videoId, attributes.thumb, attributes.title, attributes.duration, attributes.author);
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
	 var roomModel, mainView;
   this.set({
    mainView: new MainView()
   })

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
   
	 mainView = this.get("mainView");
	 roomModel = this.get("roomModel");
   mainView.initializeTopBarView();
	 mainView.initializeRoomListView(roomModel.get("roomListCollection"));
	 mainView.initializeRoomHistoryView(roomModel.get("roomHistoryCollection"));
	
	//initing the user sends the initial socket event
	 this.set({
    userModel: new UserModel({
     is_main_user: true,
     playlistCollection: new PlaylistCollection(),
     socketManagerModel: this.get("socketManagerModel")
    })
   })
 
	 mainView.initializePlayerView(roomModel.get("playerModel"), roomModel.get("userCollection"), this.get("userModel"));
	 mainView.initializeSidebarView(this.get("searchBarModel"), this.get("userModel").get("playlistCollection"));
	 mainView.initializeChatView(roomModel.get("chatCollection"), this.get("userModel"));
	
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

 window.PlaylistCollection = Backbone.Collection.extend({
  model: PlaylistItemModel,

  initialize: function() {

  }

 });

 window.RoomlistCollection = Backbone.Collection.extend({
	model: RoomlistCellModel,
	
	initialize: function() {
		this.comparator = function(roomlistCellModel) {
			return (-roomlistCellModel.get("friends").length * 15 + -roomlistCellModel.get("numUsers"));
		}
	}

 });

 window.UserCollection = Backbone.Collection.extend({
  model: UserModel,

  initialize: function() {

  }
 });

 window.PlaylistView = Backbone.View.extend({
  id: 'video-list',

  videoListTemplate: _.template($('#video-list-template').html()),

  initialize: function() {
   this.options.playlistCollection.bind('add', this.addVideo, this);
   this.options.playlistCollection.bind('reset', this.resetPlaylist, this);
   this.render();
	 $("#video-list-container").sortable({
		update: function(event, ui) {
			var i;
			var videoId = $(ui.item).attr('id');
			var index;
			var playlistArray = $(this).sortable('toArray');
			for (i = 0; i < playlistArray.length; i++) {
				if (videoId == playlistArray[i])
					index = i;
			}
			var playlistCollection = window.SurfStreamApp.get("userModel").get("playlistCollection");
			var playlistItemModel = ss_modelWithAttribute(playlistCollection, "videoId", videoId);
			var copyPlaylistItemModel = new PlaylistItemModel(playlistItemModel.attributes);
			playlistCollection.remove(playlistItemModel, {silent: true});
			playlistCollection.add(copyPlaylistItemModel, {
		    at: index,
		    silent: true
		   });
		 SocketManagerModel.toIndexInPlaylist(videoId, index);
		},
		containment: "#right-side"
	 });
	 $("#video-list-container").disableSelection();
  },

  hide: function() {
   $("#video-list").hide();
  },

  show: function() {
   $("#video-list").show();
  },

  render: function() {
   $(this.el).html(this.videoListTemplate());
   $(".videoView").append(this.el);
   return this;
  },

  addVideo: function(playlistItemModel) {
   var playlistCellView = new PlaylistCellView({
    playlistItemModel: playlistItemModel,
		id: playlistItemModel.get("videoId")
   });
   playlistCellView.initializeView();
  },

	resetPlaylist : function() {
		$("#video-list .videoListContainer").empty();
		this.options.playlistCollection.each(function(playlistItemModel) {this.addVideo(playlistItemModel)}, this);
	}
 });

 window.RoomHistoryView = Backbone.View.extend({
	className: "historyContainer",
	
	roomHistoryViewTemplate: _.template($('#history-template').html()),
	
	initialize: function() {
		this.options.roomHistoryCollection.bind("reset", this.resetRoomHistory, this);
		this.options.roomHistoryCollection.bind("add", this.addToRoomHistory, this);
		$($("#history-button")[0]).bind("click", this.toggleVisibility);
		this.render();
	},
	
	render: function() {
		$(this.el).html(this.roomHistoryViewTemplate());
		$($("#people-area")[0]).append(this.el);
		$($(".historyContainer")[0]).hide();
		
	},
	
	toggleVisibility: function() {
		$($(".historyContainer")[0]).toggle();
	},
	
	resetRoomHistory: function() {
		this.render();
		this.options.roomHistoryCollection.each(function(roomHistoryItem) {new RoomHistoryItemView({room: roomHistoryItem})});
	},
	
	addToRoomHistory: function(newRoom) {
		new RoomHistoryItemView({room: newRoom});
	} 
 });

 window.RoomHistoryItemView = Backbone.View.extend({
	className: "videoLog",
	
	roomHistoryItemViewTemplate: _.template($('#historyCell-template').html()),
	
	initialize: function() {
		$($(".videoHistory")[0]).prepend(this.render().el);
	},
	
	render: function() {
		var historyItem = this.options.room;
		$(this.el).html(this.roomHistoryItemViewTemplate({title: historyItem.get("title"), length: ss_formatSeconds(historyItem.get("length")), percent: historyItem.get("percent")}));
		this.$(".thumbContainer").attr("src", ss_idToImg(historyItem.get("videoId")));
		return this;
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
   this.playlistView = new PlaylistView({
    playlistCollection: this.options.playlistCollection
   })
   this.playlistView.hide();
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
   this.playlistView.show();
  },

  activateSearch: function() {
   if (this.currentTab == "search") return;
   this.currentTab = "search";
   this.$(".search").addClass("active");
   this.$(".playlist").removeClass("active");
   this.playlistView.hide();
   this.searchView.show();
  }

 });

 window.SearchView = Backbone.View.extend({
  //has searchBarModel
  searchViewTemplate: _.template($('#searchView-template').html()),

  id: "search-view",

  initialize: function() {
   this.render();
   this.previewPlayerView = new PreviewPlayerView();
   //Hack because of nested view bindings (events get eaten by Sidebar)
   var input = $("#searchBar .inputBox")
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
		event.data.searchView.options.searchBarModel.executeSearch(ui.item.value);
	 });
	 input.bind("keyup", {searchView: this}, this.getSuggestions);
   this.options.searchBarModel.get("searchResultsCollection").bind("add", this.updateResults, this);
	 var clearSearchButton = $("#clearsearch");
	 clearSearchButton.bind("click", function() {
		$(":input", "#searchBar .inputBox").val("");
		$("#youtubeInput").autocomplete("close");
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
	 $("#youtubeInput").autocomplete("close");
   event.data.searchView.options.searchBarModel.executeSearch(query);
   return false;
  },

  updateResults: function(model, collection) {
   new SearchCellView({
    video: model,
    playlistCollection: this.options.playlistCollection
   })
  },

	getSuggestions: function(event) {
		var input = $("#searchBar .inputBox :input");
		console.log(input.val());
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
  },

  addToPlaylist: function() {
   var videoID = this.options.video.get("videoUrl").replace("http://gdata.youtube.com/feeds/api/videos/", "");
   if (ss_modelWithAttribute(this.options.playlistCollection, "videoId", videoID)) {
       return;
   }
   this.options.video.set({
    videoId: videoID
   });
   var playlistItemModel = new PlaylistItemModel(this.options.video.attributes);
   console.log(this.options.video.attributes);
   this.options.playlistCollection.add(playlistItemModel);
   SocketManagerModel.addVideoToPlaylist(videoID, this.options.video.get("thumb"), this.options.video.get("title"), this.options.video.get("duration"), this.options.video.get("author").name.$t);
  },

  previewVideo: function() {
   var videoID = this.options.video.get("videoUrl").replace("http://gdata.youtube.com/feeds/api/videos/", "");
   if (!window.playerTwoLoaded) {
    if (!window.YTPlayerTwo) {
     window.YTPlayerTwo = document.getElementById('YouTubePlayerTwo');
    }
    window.playerTwoLoaded = true;
    window.videoIdTwo = videoID;
    $("#preview-container").css('display', 'block');
    //$('#preview-container').slideDown("slow");
    //$("#searchContainer").css("height", 187);
    // $("#preview-container").animate({
    //	height: 195
    // }, "slow", null, function() {
    // window.YTPlayerTwo.loadVideoById(window.videoIdTwo);
    //});
    // $("#searchContainer").animate({
    //height: 165
    // }, "slow");
    $("#searchContainer").css('height', 133);
   } else {
    window.YTPlayerTwo.loadVideoById(videoID);
   }
  },

  render: function(searchResult) {
   $(this.el).html(this.searchCellTemplate({
    thumb: this.options.video.get("thumb"),
    title: this.options.video.get("title"),
    vid_id: this.options.video.get("videoUrl").replace("http://gdata.youtube.com/feeds/api/videos/", "")
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
			allowScriptAccess: "always"
    };                           
    var atts = {
     id: "YouTubePlayer"
    };
    swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=YouTubePlayer", "video-container", "627", "383", "8", null, null, params, atts);
   }
  }

 });

 window.PreviewPlayerView = Backbone.View.extend({

  el: "#previewContainer",

  previewTemplate: _.template($('#search-preview-template').html()),

  events: {
   "click #close-preview-player": "hidePreviewPlayer",
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
		 allowFullScreen: 'false'
    };
    var atts = {
     id: "YouTubePlayerTwo"
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
   $("#preview-container").css('display', 'none');
   $("#searchContainer").css('height', 360);
   // $("#searchContainer").animate({
   // height: 360
   // }, "slow");
  }
 });

 window.PlaylistCellView = Backbone.View.extend({
  playlistCellTemplate: _.template($('#video-list-cell-template').html()),

	className: "videoListCellContainer",

  initializeView: function() {
   var buttonRemove, buttonToTop, videoID;
   //Hack because of nested view bindings part 2 (events get eaten by Sidebar)
   this.render();
   $("#video-list .videoListContainer").append(this.el);
   videoID = this.options.playlistItemModel.get("videoId");
   buttonRemove = $("#remove_video_" + videoID);
   buttonRemove.bind("click", {
    videoModel: this.options.playlistItemModel,
		playlistCollection: this.options.playlistItemModel.collection,
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
	 var collectionReference = event.data.playlistCollection;
	 var playlistModelToRemove = ss_modelWithAttribute(collectionReference, "videoId", event.data.videoModel.get("videoId"));
   collectionReference.remove(playlistModelToRemove);
   SocketManagerModel.deleteFromPlaylist(event.data.videoModel.get("videoId"));
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
   SocketManagerModel.toTopOfPlaylist(event.data.videoModel.get("videoId"));
   var playlistCellView = new PlaylistCellView({
    playlistItemModel: copyPlaylistItemModel,
		id: event.data.videoModel.get("videoId")
   });
   var buttonRemove, buttonToTop, videoID;
   playlistCellView.render();
   $("#video-list .videoListContainer").prepend(playlistCellView.el);
   videoID = copyPlaylistItemModel.get("videoId");
   buttonRemove = $("#remove_video_" + videoID);
   buttonRemove.bind("click", {
    videoModel: copyPlaylistItemModel,
		playlistCollection: collectionReference
   }, event.data.context.removeFromPlaylist);
   buttonToTop = $("#send_to_top_" + videoID);
   buttonToTop.bind("click", {
    videoModel: copyPlaylistItemModel,
		playlistCollection: collectionReference,
    context: event.data.context
   }, event.data.context.toTheTop);
   copyPlaylistItemModel.bind("remove", event.data.context.removeFromList, event.data.context);
  },

  render: function() {
   $(this.el).html(this.playlistCellTemplate({
    title: this.options.playlistItemModel.get('title'),
    vid_id: this.options.playlistItemModel.get("videoId")
   }));
   this.$(".thumbContainer").attr("src", this.options.playlistItemModel.get("thumb"));
   return this;
  },

  removeFromList: function(playlistItemModel, collection) {
   //hack because backbone sucks
   $("#vid_" + playlistItemModel.attributes.videoId).remove();
  }
 });

 window.ChatView = Backbone.View.extend({
  el: '#chat',

  chatTemplate: _.template($('#chat-template').html()),

  initialize: function() {
   this.render();
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
   this.$('input[name=message]').val('');
   SocketManagerModel.sendMsg({
    name: this.options.userModel.get("displayName"),
    text: userMessage,
    id: this.options.userModel.get("fbId")
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

	clearChat: function() {
		$("#messages").empty();
	}
 });

 window.RoomListView = Backbone.View.extend({
		
		el: "#roomsList",
		
		roomListTemplate: _.template($('#roomlist-template').html()),

		initialize: function () {
			this.options.roomlistCollection.bind("reset", this.addRooms, this);
			this.options.roomlistCollection.bind("sort", this.addRooms, this);
			this.render();
			this.hide();
		},
		
		hide : function() {
			$("#room-modal").hide();
		},
	
		show : function() {
			$("#room-modal").show();
		},
	
		render: function() {
			$(this.el).html(this.roomListTemplate());
			return this;
		},
	
		addRooms: function (roomListCollection) {
			this.render();
			roomListCollection.each(function(roomListCellModel) { new RoomListCellView({roomListCellModel: roomListCellModel}) });
			this.show();
		}
 });
	
 window.RoomListCellView = Backbone.View.extend({
		
		tagName: "tr",
		
		className: "room-row",
		
		roomListCellTemplate: _.template($('#roomlistCell-template #celltemplate-table .room-row').html()),

		initialize: function () {
			$($("#roomsTable tbody:first")[0]).append(this.render().el);
			$(this.el).bind("click", this.clickJoinRoom);																					
		},
	
		render: function() {
			var roomListCellModel = this.options.roomListCellModel; 
			$(this.el).html(this.roomListCellTemplate({viewers: roomListCellModel.get("numUsers"), currentVideoName: roomListCellModel.get("curVidTitle"),
				roomname: roomListCellModel.get("rID"), numDJs: roomListCellModel.get("numDJs"), friends: roomListCellModel.get("friends").length}));
			return this;
		},
		
	  clickJoinRoom: function(el) {
			SocketManagerModel.joinRoom($(this).find(".listed-room-name").html(), false);
		}
		
		
 });

 window.ChatCellView = Backbone.View.extend({

  chatCellTemplate: _.template($('#chatcell-template').html()),

  className: "messageContainer",
  initialize: function() {
   $("#messages").append(this.render().el);
  },

  render: function() {
   $(this.el).html(this.chatCellTemplate({
    username: this.options.username,
    msg: this.options.msg
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
   $("#become-dj").bind("click", this.toggleDJStatus);
	 $("#become-dj").hide();
	 $("#avatarWrapper_VAL").css("margin-left", '410px');
	 $("#avatarWrapper_VAL").hide();
   $("#up-vote").bind("click", SocketManagerModel.voteUp);
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
   this.options.userCollection.bind("add", this.placeUser, this);
   this.options.userCollection.bind("remove", this.removeUser, this);
   this.chats = [];
  },

	updateDJs : function(djArray) {
		var oldPos, user;
		
		//Remove old DJs
		this.options.userCollection.each(function(userModel) {
     user = $("#avatarWrapper_" + userModel.get("id"));
		//if the user is a DJ
     if(user.data("isDJ") == "1") {
				//If there are not any DJ ID's that match the current ID of the user we're looking at
				if(!_.any(_.pluck(djArray, 'id'), function(el) {return (''+ el) == ('' + userModel.get("id"))})) {
					//take DJ off sofa
					oldPos = user.data("oldPos");
					user.css("margin-left", oldPos.x).css("margin-top", oldPos.y);
	     	  user.data("isDJ", 0);
				}
		 }
    });

		//Add new DJs
		var X_COORDS = [200,260,320]; 
		var Y_COORD = 25;
		var cur_is_dj = false;
		var numOnSofa = 0;
    for (var dj in djArray) {
		 numOnSofa = numOnSofa + 1;
		 user = $("#avatarWrapper_" + djArray[dj].id);
		 if(user.data("isDJ") == "0") {
			 user.data("oldPos", {x: user.css("margin-left"), y: user.css("margin-top")})
			 user.data("isDJ", "1")
		 }
     user.css("margin-left", X_COORDS[dj] + "px").css("margin-top", Y_COORD + "px");
		 if (djArray[dj].id == this.options.userModel.get("fbId")) {
				cur_is_dj = true;
				$('#getOff').live('click', function() {
				  $("#stepDown").remove();
					$('#getOff').remove();
					$("#skip").remove();
					SocketManagerModel.stepDownFromDJ();
					
				});
				user.append("<div id='stepDown' style='width: 80px; height: 95px; position: absolute;'></div>");
				$('#stepDown').append("<a id='getOff' class='getOff' z-index=30 style='display: none; position: absolute;'>Get Off Sofa</a>")
				$('#stepDown').hover(function() {$('#getOff').fadeIn()}, function() {$('#getOff').fadeOut();})
				
				
			}
		}
		
		$("#avatarWrapper_VAL").show();
		
		
		//NEED BOUNDS CHECK HERE TODO
		$("#become-dj").css("margin-left", X_COORDS[numOnSofa] + "px").css("margin-top", Y_COORD + "px");
    if(!cur_is_dj) $("#become-dj").show();
	},

  toggleDJStatus: function() {
   if ($(this).css("display") == "block") {
		$(this).hide();
    SocketManagerModel.becomeDJ();
    if ($("#skip").length == 0) {
			$("#people-area").append("<button id='skip'> Skip Video </button>");
			$("#skip").bind("click", skipVideo);
		} 
   } 
  },

  placeUser: function(user) {	
	 new AvatarView({user: user});	 
  },

  removeUser: function(user) {
	 var avatar = this.$("#avatarWrapper_" + user.id);
	 avatar.data("animating", false);
	 avatar.tipsy('hide');
   avatar.remove();
  }

 }, { /* Class properties */

  tipsyChat: function(text, fbid) {
   var userPic = $("#nameDiv_" + fbid);
	 var fbID = fbid;
   userPic.attr('latest_txt', text);
   userPic.tipsy("show");
   setTimeout(function() {
	  if($("#nameDiv_" + fbID).length > 0) userPic.tipsy("hide");
   }, 3000);
  }

 });

 window.AvatarView = Backbone.View.extend({
	
	initialize: function() {
		var avatarId, avatarImgSrc, avatarBody, avatarMouth, avatarSmile, user, nameDiv;
		user = this.options.user;
		this.el.id = "avatarWrapper_" + user.id;
		avatarId = user.get("avatar");
		avatarImgSrc = this.getAvatarSrc(avatarId);
		avatarBody = this.make('img', {id:'avatarBody_' + user.id, style: 'position:absolute;', src: avatarImgSrc })
		nameDiv = this.make('div', {id:'nameDiv_' + user.id, class:"nametip", style: 'position:absolute;', title: user.get('name') })
		avatarMouth = this.make('img', {class: 'defaultSmile' + avatarId + " default", src: this.defaultMouthSrc });
		avatarSmile = this.make('img', {class: 'defaultSmile'+ avatarId + " smiley", src:this.getSmileSrc(avatarId)});
		$(this.el).append(avatarBody).append(avatarMouth).append(avatarSmile).append(nameDiv);
		$(this.el).css("margin-left", user.get('x')).css("margin-top", user.get('y')).css("position", 'absolute');
		$("#people-area").prepend(this.el);
	   this.$("#avatarWrapper_" + user.id).tipsy({
	    gravity: 'sw',
	    fade: 'true',
	    delayOut: 3000,
	    trigger: 'manual',
	    title: function() {
	     return this.getAttribute('latest_txt')
	    }
	   });
			this.$("#nameDiv_" + user.id).tipsy({
		    gravity: 'n',
		    fade: 'true',
		   });
		 $("#avatarWrapper_" + user.id).data("isDJ", "0");
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
		}
	},
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
   $('#copy-button-container').html("<div id=\"copy-button\">Copy</div>");
   var link = $('input:text').val();
   console.log(link);
   var clip = new ZeroClipboard.Client();
   clip.setText(link);
   clip.glue('copy-button', 'copy-button-container');
  },

  events: {
   "click #shareFB": "fbDialog",
   "click #shareTwit": "tweetDialog",
   "click #shareEmail": "openEmail"
  },

  fbDialog: function() {
   FB.ui({
    method: 'feed',
    name: 'Just watched on SurfStream.tv',
    url: 'www.youtube.com',
    caption: 'Join your friends and watch videos online!',
    description: 'SurfStream.tv lets you explore new video content on the web. Very similar to turntable.fm' // ,
    // picture: '/images/logo.png'
   }, function(response) {
    if (response && response.post_id) {
     alert('Post was published.');
    } else {
     alert('Post was not published.');
    }
   });
  },

  tweetDialog: function() {
   var width = 575,
       height = 400,
       left = ($(window).width() - width) / 2,
       top = ($(window).height() - height) / 2,
       url = "http://twitter.com/share?text=Check%20out%20this%20awesome%20brooooooom!",
       opts = 'status=1' + ',width=' + width + ',height=' + height + ',top=' + top + ',left=' + left;

   window.open(url, 'twitter', opts);

  },

  openEmail: function() {
   window.open("mailto:friend@domainname.com?subject=Come%20to%20SurfStream.tv%20sometime!&body=God%20this%20shit%20is%20" + "awesome!%2C%20here's%20a%20link%0A%0A" + window.location, '_parent');
  }
 });

 window.MainView = Backbone.View.extend({
  el: 'body',

  initialize: function() {

  },

  initializeTopBarView: function() {
   this.roomInfoView = new RoomInfoView(({
    roomName: 'Placeholder'
   }));
   this.shareBarView = new ShareBarView();
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

  initializePlayerView: function(playerModel, userCollection, userModel) {
   this.videoPlayerView = new VideoPlayerView({
    playerModel: playerModel
   });
   this.theatreView = new TheatreView({
    userCollection: userCollection,
		userModel: userModel
   });
  },

	initializeRoomListView: function(roomListCollection) {
		//HACK
			$("#ListRooms").bind("click", SocketManagerModel.loadRoomsInfo);		
			this.roomModal = new RoomListView({roomlistCollection: roomListCollection});	
			$("#CreateRoom").bind("click", function() { 
				SocketManagerModel.joinRoom($("#CreateRoomName").val(), true) 
			});
			$("#CreateRoomName").bind("submit", function() { return false });
		//ENDHACK
	},
	
	initializeRoomHistoryView: function(roomHistoryCollection) {
		this.roomHistoryView = new RoomHistoryView({roomHistoryCollection: roomHistoryCollection});
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
		var curvid, curLen, roomModel, playerModel;
		curLen = YTPlayer.getDuration();
    if (!window.playerLoaded) {
     window.playerLoaded = true;
     var params = {
      allowScriptAccess: "always",
     	wmode: "opaque"
		 };
     var atts = {
      id: "YouTubePlayer"
     };
     swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3enablejsapi=1&playerapiid=YouTubePlayer", "video-container", "640", "390", "8", null, null, params, atts);
     window.secs = video.time;
     window.video_ID = video.id;
     playerLoaded = true;

    } else {
     window.YTPlayer.loadVideoById(video.id, video.time);
     new ChatCellView({
      username: "surfstream.tv",
      msg: "Now playing " + video.title
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
			app.get("mainView").roomHistoryView.addToRoomHistory(new RoomHistoryItemModel({title: curvid.curTitle, length: curLen, percent: curvid.percent, videoId: curvid.curID}));
		}
		//save the currently playing state
		playerModel.set({curVid: {curID: video.id, curTitle: video.title, percent: 0.5} });
		
		//put remote on appropro DJ
		//$("#avatarWrapper_" + video.dj).append($("#remote"));
   });

   socket.on('video:stop', function() {
    if (!window.playerLoaded) return;
    console.log('video ending!');
    window.YTPlayer.stopVideo();
    window.YTPlayer.clearVideo();
   });

	 socket.on("user:fbProfile", function(fbProfile) {
		if (fbProfile == null) {
			app.get("userModel").getFBUserData();
		} else {
			app.get("userModel").set({
				displayName: fbProfile.first_name + " " + fbProfile.last_name,
				avatarImage: 'https://graph.facebook.com/' + fbProfile.id + '/picture'
			});
			new RaRouter();
			Backbone.history.start({pushState: true});
		}
	 });

   socket.on('playlist:refresh', function(videoArray) {
    //app.setPlaylist(videoArray);
		_.each(videoArray, function(video) {video.id = null}); //To prevent backbone from thinking we need to sync this with the server
		app.get("userModel").get("playlistCollection").reset(videoArray);
   });

   socket.on('message', function(msg) {
    app.get("roomModel").get("chatCollection").add({
     username: msg.data.name,
     msg: msg.data.text
    });
    TheatreView.tipsyChat(msg.data.text, msg.data.id);
   });

   socket.on('users:announce', function(userJSONArray) {
    //userJSONArray is an array of users, with .userId = fbid#, .name = full name, .avatar = TBD,
    // .points = TBA, .x = top coord for room-conatiner, .y = leftmost coord for room-container
    app.get("roomModel").updateDisplayedUsers(userJSONArray);
   });

   socket.on('djs:announce', function(djArray) {
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
				var marginTop = element.css("margin-top").match(/\d+/)[0];
			    (function(){
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
	 app.get("roomModel").get("playerModel").set({percent: total / meterStats.upvoteSet.size});
   });

	socket.on("rooms:announce", function(roomList) {
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
	
	/* WE ARE OVERLOADING THIS TO CLEAR THE CHAT, ASSUMING THIS ONLY HAPPENS ON NEW ROOM JOIN */
	socket.on("room:history", function(roomHistory) {
		app.get("roomModel").get("roomHistoryCollection").reset(roomHistory);
		/* OVERLOADED RESET */
		//app.get("roomModel").get("chatCollection").reset();
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
	},
	
	sendUserFBFriends: function(friendIdList) {
		SocketManagerModel.socket.emit("user:sendUserFBFriends", friendIdList);
	},

  sendMsg: function(data) {
   SocketManagerModel.socket.emit("message", data);
  },

  becomeDJ: function() {
   SocketManagerModel.socket.emit('dj:join');
  },

  stepDownFromDJ: function() {
   SocketManagerModel.socket.emit('dj:quit');
  },

  addVideoToPlaylist: function(video, thumb, title, duration, author) {
   SocketManagerModel.socket.emit('playlist:addVideo', {
    video: video,
    thumb: thumb,
    title: title,
		duration: duration,
		author: author
   });
  },

  voteUp: function() {
   SocketManagerModel.socket.emit('meter:upvote');
  },

  voteDown: function() {
   SocketManagerModel.socket.emit('meter:downvote');
  },

  toTopOfPlaylist: function(vid_id) {
   SocketManagerModel.socket.emit("playlist:moveVideoToTop", {
    video: vid_id
   });
  },

  deleteFromPlaylist: function(vid_id) {
   SocketManagerModel.socket.emit("playlist:delete", {
    video: vid_id
   });
  },

	toIndexInPlaylist: function(vid_id, newIndex) {
		SocketManagerModel.socket.emit("playlist:moveVideo", {
			video: vid_id,
			index: newIndex
		});
	},

	loadRoomsInfo: function() {
		SocketManagerModel.socket.emit('rooms:load', {id: window.SurfStreamApp.get("userModel").get("fbId")});
		console.log(window.SurfStreamApp.get("userModel").get("fbId"));
		console.log("LOGGED");
	},
	
	joinRoom: function(rID, create) {
		var payload = {rID: rID};
		if (create) payload.create = true;
		if (SurfStreamApp.inRoom) {
			payload.currRoom = SurfStreamApp.inRoom;
		}		
		SurfStreamApp.inRoom = rID;
		payload.id = window.SurfStreamApp.get("userModel").get("fbId");
		if (window.YTPlayer) {
			window.YTPlayer.stopVideo();
			window.YTPlayer.loadVideoById(1); // hack because clearVideo FUCKING DOESNT WORK #3hourswasted
		}
		window.SurfStreamApp.get("roomModel").get("playerModel").set({curVid: null}); //dont calculate a room history cell on next vid announce
		SocketManagerModel.socket.emit('room:join', payload);
	}

 });

	window.RaRouter = Backbone.Router.extend({ 
		routes: {
			"room/:rID":	"joinRoom"
		},
		
		joinRoom: function(rID) {
			SocketManagerModel.joinRoom(rID, false);
		}
	});
 window.playerLoaded = false;

});

setSuggestions = function(suggestions) {
	var suggestionSource = _.pluck(suggestions[1], 0);
	window.SurfStreamApp.get("mainView").sideBarView.searchView.suggestionHash[suggestions[0]] = suggestionSource;
	$( "#youtubeInput" ).autocomplete( "option", "source", suggestionSource);
};

function onYouTubePlayerReady(playerId) {
 if (playerId == "YouTubePlayerTwo") {
  window.YTPlayerTwo.loadVideoById(window.videoIdTwo);
 }

 if (!window.YTPlayer) {
  window.YTPlayer = document.getElementById('YouTubePlayer');
  window.YTPlayer.addEventListener('onStateChange', 'onytplayerStateChange');
  window.playerLoaded = true;
  if (window.video_ID) {
   window.YTPlayer.loadVideoById(window.video_ID, window.secs);
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
 } else {
  window.YTPlayer.mute();
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
	result =  "" + ((hours > 0) ? (hours + ":") : "") + ((minutes > 0) ? ((minutes < 10 && hours > 0) ? "0" + minutes + ":" : minutes + ":") : "") + ( (seconds < 10) ? "0" + seconds : seconds);
	return result;
}

function ss_idToImg(id) {
	return "http://img.youtube.com/vi/"+id+"/0.jpg";
}

function ss_modelWithAttribute(collection, attribute, valueToMatch) {
	for (var i = 0; i < collection.length; i++) {
		if (collection.at(i).get(attribute) == valueToMatch) {
			return collection.at(i);
		}
	}
	return null;
}

function skipVideo() {
 socket_init.emit("video:skip");
}
