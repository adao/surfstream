$(function() {
 socket_init = io.connect();

 _.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
 };

 ZeroClipboard.setMoviePath('/swf/ZeroClipboard.swf');

 window.ChatMessageModel = Backbone.Model.extend({});

 window.VideoPlayerModel = Backbone.Model.extend({
  initialize: function() {

  }
 });

 window.RoomModel = Backbone.Model.extend({

  updateDisplayedUsers: function(userJSONArray) {
   var hash = {};
   var userCollection = this.get("userCollection");
   for (var user in userJSONArray) {
    if (!userCollection.get(userJSONArray[user].id)) {
     userCollection.add(userJSONArray[user]);
    }
    hash[userJSONArray[user].id] = true;
   }

   userCollection.forEach(function(userModel) {
    if (!hash[userModel.get('id')]) userModel.collection.remove(userModel);
   });

  }

 })

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

  initialize: function() {
   if (this.get("is_main_user")) {
    FB.api('/me', this.setUserData);
    FB.api('/me/friends', function(response) {
     console.log(response);
    });
   }
  },

  getUserData: function(self) {
   if (this.get("fbUserInfo")) {
    return this.get("fbUserInfo");
   }
  },

  setUserData: function(info) {
   window.SurfStreamApp.get('userModel').set({
    fbInfo: info,
    avatarImage: 'https://graph.facebook.com/' + info.id + '/picture'
   });
   window.SurfStreamApp.get('userModel').get("socketManagerModel").makeFirstContact({
    user: info
   });
  }

 });

 window.SearchResultModel = Backbone.Model.extend({
  initialize: function() {

  }

 });

 window.PlaylistItemModel = Backbone.Model.extend({
  initialize: function() {

  }
 });

 window.SurfStreamModel = Backbone.Model.extend({
  defaults: {
   sharing: new ShareModel
  },

  initialize: function() {

   this.set({
    mainView: new MainView()
   })

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
   this.set({
    userModel: new UserModel({
     is_main_user: true,
     playlistCollection: new PlaylistCollection,
     socketManagerModel: this.get("socketManagerModel")
    })
   })

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

  setPlaylist: function(videos) {
   for (var index in videos) {
    this.get("userModel").get("playlistCollection").add({
     title: videos[index].title,
     thumb: videos[index].thumb,
     vid_id: videos[index].id
    });
   }
  },
 });

 window.ChatCollection = Backbone.Collection.extend({
  model: ChatMessageModel,

  defaults: {
   "clientId": 0
  },

  initialize: function() {

  }
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
   this.render();
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
    playlistItemModel: playlistItemModel
   });
   playlistCellView.initializeView();
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
   this.options.searchBarModel.get("searchResultsCollection").bind("add", this.updateResults, this);
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
   })
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
   this.options.video.set({
    vid_id: videoID
   });
   var playlistItemModel = new PlaylistItemModel(this.options.video.attributes);
   console.log(this.options.video.attributes);
   this.options.playlistCollection.add(playlistItemModel);
   SocketManagerModel.addVideoToPlaylist(videoID, this.options.video.get("thumb"), this.options.video.get("title"), this.options.video.get("duration"), this.options.video.get("author"));
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
    // 					height: 195
    // 				}, "slow", null, function() {
    // 					window.YTPlayerTwo.loadVideoById(window.videoIdTwo);
    // 				});
    // $("#searchContainer").animate({
    // 					height: 165
    // 				}, "slow");
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
     allowScriptAccess: "always"
    };
    var atts = {
     id: "YouTubePlayer"
    };
    swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=YouTubePlayer", "video-container", "640", "390", "8", null, null, params, atts);
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
   // 	height: 0,
   // 	width: 0
   // }, "slow", null, function() {
   // 	$("#preview-container").css('display', 'none');
   // });
   $("#preview-container").css('display', 'none');
   $("#searchContainer").css('height', 360);
   // $("#searchContainer").animate({
   // 	height: 360
   // }, "slow");
  }
 });

 window.PlaylistCellView = Backbone.View.extend({
  playlistCellTemplate: _.template($('#video-list-cell-template').html()),

  initializeView: function() {
   var buttonRemove, buttonToTop, videoID;
   //Hack because of nested view bindings part 2 (events get eaten by Sidebar)
   this.render();
   $("#video-list .videoListContainer").append(this.el);
   videoID = this.options.playlistItemModel.get("vid_id");
   buttonRemove = $("#remove_video_" + videoID);
   buttonRemove.bind("click", {
    videoModel: this.options.playlistItemModel
   }, this.removeFromPlaylist);
   buttonToTop = $("#send_to_top_" + videoID);
   buttonToTop.bind("click", {
    videoModel: this.options.playlistItemModel,
    context: this
   }, this.toTheTop);
   this.options.playlistItemModel.bind("remove", this.removeFromList, this);
  },

  removeFromPlaylist: function(event) {
   event.data.videoModel.destroy();
   SocketManagerModel.deleteFromPlaylist(event.data.videoModel.get("vid_id"));
  },

  toTheTop: function(event) {
   var copyPlaylistItemModel = new PlaylistItemModel(event.data.videoModel.attributes);
   var collectionReference = event.data.videoModel.collection;
   event.data.videoModel.destroy();
   collectionReference.add(copyPlaylistItemModel, {
    at: 0,
    silent: true
   });
   SocketManagerModel.toTopOfPlaylist(event.data.videoModel.get("vid_id"));
   var playlistCellView = new PlaylistCellView({
    playlistItemModel: copyPlaylistItemModel
   });
   var buttonRemove, buttonToTop, videoID;
   playlistCellView.render();
   $("#video-list .videoListContainer").prepend(playlistCellView.el);
   videoID = copyPlaylistItemModel.get("vid_id");
   buttonRemove = $("#remove_video_" + videoID);
   buttonRemove.bind("click", {
    videoModel: copyPlaylistItemModel
   }, event.data.context.removeFromPlaylist);
   buttonToTop = $("#send_to_top_" + videoID);
   buttonToTop.bind("click", {
    videoModel: copyPlaylistItemModel,
    context: event.data.context
   }, event.data.context.toTheTop);
   copyPlaylistItemModel.bind("remove", event.data.context.removeFromList, event.data.context);
  },

  render: function() {
   $(this.el).html(this.playlistCellTemplate({
    title: this.options.playlistItemModel.get('title'),
    vid_id: this.options.playlistItemModel.get("vid_id")
   }));
   this.$(".thumbContainer").attr("src", this.options.playlistItemModel.get("thumb"));
   return this;
  },

  removeFromList: function(playlistItemModel, collection) {
   //hack because backbone sucks
   $("#vid_" + playlistItemModel.attributes.vid_id).remove();
  }
 });

 window.ChatView = Backbone.View.extend({
  el: '#chat',

  chatTemplate: _.template($('#chat-template').html()),

  initialize: function() {
   this.render();
   this.options.chatCollection.bind("add", this.makeNewChatMsg, this);
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
    name: this.options.userModel.get("fbInfo").name,
    text: userMessage,
    id: this.options.userModel.get("fbInfo").id
   });
   return false;
  },

  makeNewChatMsg: function(chat) {
   new ChatCellView({
    username: chat.get("username"),
    msg: chat.get("msg")
   });
   this.chatContainer.activeScroll();
  }
 }, {
  scrollToBottom: function() {
   this.chatContainer.activeScroll();
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
   $("#dj").bind("click", this.toggleDJStatus);
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

  toggleDJStatus: function() {
   if (this.innerHTML != "Step Down") {
    SocketManagerModel.becomeDJ();
    this.innerHTML = "Step Down";
    $("#people-area").append("<button id='skip'> Skip Video </button>");
    $("#skip").bind("click", skipVideo);
   } else {
    SocketManagerModel.stepDownFromDJ();
    this.innerHTML = "Become DJ";
    $("#skip").remove();
   }
  },

  placeUser: function(user) {
   this.$("#people-area").append("<img id='" + user.id + "' src=http://graph.facebook.com/" + user.id + "/picture style='position:absolute; margin-left:" + user.get("x") + "px; margin-top:" + user.get("y") + "px;' >");
   this.$("#" + user.id).tipsy({
    gravity: 'sw',
    fade: 'true',
    delayOut: 3000,
    trigger: 'manual',
    title: function() {
     return this.getAttribute('latest_txt')
    }
   });
  },

  removeUser: function(user) {
   this.$("#" + user.id).remove();
  }

 }, { /* Class properties */

  tipsyChat: function(text, fbid) {
   var userPic = $("#" + fbid);
   userPic.attr('latest_txt', text);
   userPic.tipsy("show");
   setTimeout(function() {
    userPic.tipsy("hide")
   }, 3000);
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
    // 					picture: '/images/logo.png'
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

  initializePlayerView: function(playerModel, userCollection) {
   this.videoPlayerView = new VideoPlayerView({
    playerModel: playerModel
   });
   this.theatreView = new TheatreView({
    userCollection: userCollection
   });
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
    //video.video = videoID, video.time = seconds into video
    if (!window.playerLoaded) {
     window.playerLoaded = true;
     var params = {
      allowScriptAccess: "always"
     };
     var atts = {
      id: "YouTubePlayer"
     };
     swfobject.embedSWF("http://www.youtube.com/apiplayer?enablejsapi=1&playerapiid=YouTubePlayer", "video-container", "640", "390", "8", null, null, params, atts);
     window.secs = video.time;
     window.video_ID = video.video;
     playerLoaded = true;

    } else {
     window.YTPlayer.loadVideoById(video.video, video.time);
     new ChatCellView({
      username: "surfstream.tv",
      msg: "Now playing " + video.title
     });
     window.SurfStreamApp.get("mainView").chatView.chatContainer.activeScroll();
    }
    //HACK
    $("#room-name").html(video.title)
    app.get("roomModel").get("userCollection").forEach(function(userModel) {
     var user = $("#" + userModel.get("id"));
     if (user.attr("isDJ") != "1") {
      user.css("border-width", "0px");
     } else {
      user.css("border-width", "2px");
      user.css("border-color", "yellow");
     }

    })
    //ENDHACK
   });

   socket.on('video:stop', function() {
    if (!window.playerLoaded) return;
    console.log('video ending!');
    window.YTPlayer.stopVideo();
    window.YTPlayer.clearVideo();
   });

   socket.on('playlist:refresh', function(videoArray) {
    app.setPlaylist(videoArray);
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
    app.get("roomModel").get("userCollection").forEach(function(userModel) {
     var user = $("#" + userModel.get("id"));
     user.attr("isDJ", "0")
    })
    for (var dj in djArray) {
     $("#" + djArray[dj].id).css("border-style", "solid").css("border-color", "yellow").css("border-width", "2px");
     $("#" + djArray[dj].id).attr("isDJ", "1")
    }
    app.get("roomModel").get("userCollection").forEach(function(userModel) {
     var user = $("#" + userModel.get("id"));
     if (user.attr("isDJ") != "1" && user.css("border-right-color") == "rgb(255, 255, 0)") {
      user.css("border-width", "0px");
     }

    })
   });

   //.upvoteset maps userids who up to true, .down, .up totals
   socket.on("meter:announce", function(meterStats) {
    for (var fbid in meterStats.upvoteSet) {
     if (meterStats.upvoteSet[fbid] === true) {
      //app.get("roomModel").get("users").get(fbid).
      //BEGIN HACK
      if ($("#" + fbid).css("border-color") != "yellow") {
       $("#" + fbid).css("border-width", $("#" + fbid).css("border-width") + 20 + "px");
       $("#" + fbid).css("border-color", "#98bf21");
       $("#" + fbid).css("border-style", "solid");
      }
      //ENDHACK
     }
    }
   });

  },

  /* Initialize first contact */
  makeFirstContact: function(user) {
   var socket = this.get("socket");
   socket.emit('user:sendFBData', user);
  }

 }, {
  socket: socket_init,

  /* Outgoing Socket Events*/

  sendMsg: function(data) {
   this.socket.emit("message", data);
  },

  becomeDJ: function() {
   this.socket.emit('dj:join');
  },

  stepDownFromDJ: function() {
   this.socket.emit('dj:quit');
  },

  addVideoToPlaylist: function(video, thumb, title) {
   this.socket.emit('playlist:addVideo', {
    video: video,
    thumb: thumb,
    title: title
   });
  },

  voteUp: function() {
   SocketManagerModel.socket.emit('meter:upvote');
  },

  voteDown: function() {
   SocketManagerModel.socket.emit('meter:downvote');
  },

  toTopOfPlaylist: function(vid_id) {
   this.socket.emit("playlist:moveVideoToTop", {
    video: vid_id
   });
  },

  deleteFromPlaylist: function(vid_id) {
   this.socket.emit("playlist:delete", {
    video: vid_id
   })
  }

 });

 window.playerLoaded = false;
 window.SurfStreamApp = new SurfStreamModel({
  socket: socket_init
 });
 console.log("started app");

});



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
  event.data.button.css("background", 'url("http://i.imgur.com/euzaw.png") 50% 50% no-repeat');
 } else {
  window.YTPlayer.mute();
  event.data.button.css("background", 'url("http://i.imgur.com/c77ZF.png") 50% 50% no-repeat');
 }
}



function onytplayerStateChange(newState) {
/*	$('#state').html("Player state: "+newState);
	if(newState == 0 && currVideo.isLeader) { 
		console.log("Video finished, broadcasting back to server");
		socket.emit('videoFinished');
		currVideo = {};
	} */
}



function skipVideo() {
 socket_init.emit("video:skip");
}
