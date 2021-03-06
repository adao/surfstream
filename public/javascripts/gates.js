window.fbAsyncInit = function() {
 var fbappid = $("#fba_ss_id").html();
 FB.init({
  appId: fbappid,
  status: true,
  cookie: true,
  xfbml: true,
  oauth: true
 });

 $('#fb-auth').click(function() {
  FB.login(send_fb_login_status, {
   scope: 'email,read_stream'
  });
	if (typeof(mpq) !== 'undefined') mpq.track("Beta Sign In Clicked", {});
	window.beta_sign_in_clicked = true;
 });

 $('#fb-auth-new').click(function() {
	if (window.promoApproved) {
		FB.login(send_fb_login_status, {
	   scope: 'email,read_stream'
	  });
	}
	if (typeof(mpq) !== 'undefined') mpq.track("Promo Sign In Clicked", {});
	window.promo_sign_in_clicked = true;
  return false;
 });
 
 var input = $("#promoBox");
 input.keyup(function(e){
	
	if(window.promoLoop) {
	 clearTimeout(window.promoLoop);	 
	}
	console.log("New setTimout...")
	window.promoLoop = setTimeout(function() {
		console.log("validating promo"); 
		socket_init.emit('promo:validate', {promo: $("#promoBox").val()})
		}, 800);
 });
 
 	$("#submitEmail").bind("click", function() {
		console.log("supppppp")
	  var mail = $("#emailBox").val();
		var validEmail = validateEmail(mail);
		if(validEmail){
			$("#emailBox").css("background", "white")
			if (window.logged_in_user){
				var fbID = window.logged_in_user.userID;
					socket_init.emit("surfstream:requestPromo", {email: mail, fbId: fbID});
			} else {
					socket_init.emit("surfstream:requestPromo", {email: mail});
			}
			if (typeof(mpq) !== 'undefined') mpq.track("Email Promo Request Submitted", {});
		} else {
			$("#emailBox").css("background", "#FAAFAF")
		}
		return false;
  });

	function validateEmail(email) { 
	 var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/ 
	 return email.match(re) 
	}

	socket_init.on("promo:valid", function(){
		console.log("GOOD PROMO!");
		window.promoApproved = true;
		input.keyup(function(){});
		$("#promoBox").css("background", "#A5F2AA")
		setTimeout(function(){$("#promoBox").fadeOut(function(){setTimeout(function(){$("#fb-auth-new").fadeIn()}, 300)})}, 600); 
	});
	socket_init.on("promo:bad", function() {
		console.log("BAD PROMO!");
		window.promoApproved = false;
		$("#promoBox").css("background", "#FAAFAF");
	});
	socket_init.on("email:received", function() {
		$("#email-form-text").fadeOut();
		$("#email-form-text").css("font-size", "14px");
		$("#email-form").fadeOut(function(){$("#email-form-text").html("<div style='margin-top:4px;'>Thanks for your interest,<br> we will send a promo code <br> to you as soon as we can!</div>"); $("#email-form-text").fadeIn()});
		
	});
	socket_init.on("email:receivedWithFBID", function() {
		initFDPlayer();
		showSplash();
		var name =  window.logged_in_fb_user.name;
		$("#email-form-text").html("<img src=\'http://graph.facebook.com/" + window.logged_in_fb_user.id + "/picture\', id='fd-fb-photo' > <div id='email-message'> <span id='hi-message' >Hi " + window.logged_in_fb_user.name + "!</span> <span id='email-message-text'>" + "We'll send a promo code to</span> <span id='user-email'>" + window.logged_in_fb_user.email + "</span> <span id='email-message-text-2'> as soon as we can!</span> <span id='sig'> --Surfstream Team </sig></div>");
		console.log(name);
		$("#email-form-text").css("font-size", "14px");
		$("#submit-email").css("height", "110px");
		$("#email-form").hide();
		var original = $("#submit-email");
		var clone = original.clone();
		clone.css({display: "inline-block", margin: "6px"})
		$("#beta-users").before(clone);
		original.hide();
		$("#beta-users").hide()
	}); 
	
	socket_init.on("surfstream:gate", function(response) {		
		switch(response.details) {
			case "approved":
				if(window.ss_fdLoop){
				 	clearTimeout(window.ss_fdLoop);
				 }
				if (!userLoggedOut) {
				  window.SurfStreamApp = new SurfStreamModel({
				   socket: socket_init,
				   firstTime: response.firstTime
				  });
					//trigger first communication
					if (!response.firstTime) {
						SocketManagerModel.startApp(response.fbId);
					} else {
						if (typeof(mpq) !== 'undefined') mpq.track("New User", {});
						window.SurfStreamApp.get("userModel").getFBUserDataForRegistration();
						hideSplash();						
					}
				}
			  break;
			default:
				mpq.track("error", {mp_note: "Gate problem: response was " + response + ", details were " + response.details});
				break;
		}
	});

 var form = $("#promoForm, #email-form");
 form.submit(function(){
	return false;
 });
 
 function initFDPlayer() {
	if (!window.fdPlayerLoading){ 
		var params = {
	  wmode: "opaque",
	  allowScriptAccess: "always",
	  iv_load_policy: 3
	 	};
	 	var atts = {
		  id: "YouTubePlayer-fd"
		 };
	 	swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=YouTubePlayer-fd", "ytfd", "640", "390", "8", null, null, params, atts);
    window.fdPlayerLoading = true;
	}
 }

 function hideSplash() {
	document.getElementById('frontdoor').style.display = 'none';
	document.getElementById('loadingScreen').style.display = 'none';
	document.getElementById('outer').style.display = 'block';
 }

 function showSplash() {
	document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('outer').style.display = 'none';
  document.getElementById('frontdoor').style.display = 'inline-block';
 }

 function send_fb_login_status(response) {
  if (response.authResponse) {
   //user is already logged in and connected
   var auth = response;
   
	 FB.api('/me', function(profile) {
		var year;
		socket_init.emit("surfstream:login", {fbId: auth.authResponse.userID, promo: $("#promoBox").val(), email: profile.email});
		 window.logged_in_fb_user = profile;
		 if (auth.authResponse.userID == "1242030518" || auth.authResponse.userID == "1303680127" || auth.authResponse.userID == "1146079013" ||auth.authResponse.userID == "1103340019" ){
		 	mpq = undefined;
		 }
		 if (typeof(mpq) !== 'undefined'){
			 mpq.name_tag(profile.name);
			 mpq.identify(auth.authResponse.userID);
			 var super_props = {};
			 if (profile.gender) super_props.gender = profile.gender;
			 if (profile.locale) super_props.locale = profile.locale;
			 mpq.register(super_props);
		 }
		
	 });
 
  } else {
	 initFDPlayer();
   showSplash();
	 if (typeof(mpq) !== 'undefined') {
		if (window.beta_sign_in_clicked) {
			mpq.track("Beta Sign-In Connect Rejected", {});
	  }  
	  if(window.promo_sign_in_clicked) {
			mpq.track("Promo Sign-In Connect Rejected", {});
	  }
	 }
  }
 }
 // run once with current status and whenever the status changes
 FB.getLoginStatus(send_fb_login_status);
 var BrowserDetect = {
	init: function () {
		this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
		this.version = this.searchVersion(navigator.userAgent)
			|| this.searchVersion(navigator.appVersion)
			|| "an unknown version";
		this.OS = this.searchString(this.dataOS) || "an unknown OS";
	},
	searchString: function (data) {
		for (var i=0;i<data.length;i++)	{
			var dataString = data[i].string;
			var dataProp = data[i].prop;
			this.versionSearchString = data[i].versionSearch || data[i].identity;
			if (dataString) {
				if (dataString.indexOf(data[i].subString) != -1)
					return data[i].identity;
			}
			else if (dataProp)
				return data[i].identity;
		}
	},
	searchVersion: function (dataString) {
		var index = dataString.indexOf(this.versionSearchString);
		if (index == -1) return;
		return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
	},
	dataBrowser: [
		{
			string: navigator.userAgent,
			subString: "Chrome",
			identity: "Chrome"
		},
		{ 	string: navigator.userAgent,
			subString: "OmniWeb",
			versionSearch: "OmniWeb/",
			identity: "OmniWeb"
		},
		{
			string: navigator.vendor,
			subString: "Apple",
			identity: "Safari",
			versionSearch: "Version"
		},
		{
			prop: window.opera,
			identity: "Opera",
			versionSearch: "Version"
		},
		{
			string: navigator.vendor,
			subString: "iCab",
			identity: "iCab"
		},
		{
			string: navigator.vendor,
			subString: "KDE",
			identity: "Konqueror"
		},
		{
			string: navigator.userAgent,
			subString: "Firefox",
			identity: "Firefox"
		},
		{
			string: navigator.vendor,
			subString: "Camino",
			identity: "Camino"
		},
		{		// for newer Netscapes (6+)
			string: navigator.userAgent,
			subString: "Netscape",
			identity: "Netscape"
		},
		{
			string: navigator.userAgent,
			subString: "MSIE",
			identity: "Explorer",
			versionSearch: "MSIE"
		},
		{
			string: navigator.userAgent,
			subString: "Gecko",
			identity: "Mozilla",
			versionSearch: "rv"
		},
		{ 		// for older Netscapes (4-)
			string: navigator.userAgent,
			subString: "Mozilla",
			identity: "Netscape",
			versionSearch: "Mozilla"
		}
	],
	dataOS : [
		{
			string: navigator.platform,
			subString: "Win",
			identity: "Windows"
		},
		{
			string: navigator.platform,
			subString: "Mac",
			identity: "Mac"
		},
		{
			   string: navigator.userAgent,
			   subString: "iPhone",
			   identity: "iPhone/iPod"
	    },
		{
			string: navigator.platform,
			subString: "Linux",
			identity: "Linux"
		}
	]

};
BrowserDetect.init();
 if (typeof(mpq) !== 'undefined') mpq.track("Page Loaded", {mp_note: "Browser is " + BrowserDetect.browser + ", "+ BrowserDetect.version + ", " + BrowserDetect.OS});
 window.time_at_load = new Date().getTime();
 window.vidsWatched = 0;
 window.onbeforeunload = function() {
	if (typeof(mpq) !== 'undefined') mpq.track("Page Closing", {timeSpent: Math.floor(((new Date().getTime()) - window.time_at_load) / 1000), videos_consumed: window.vidsWatched });
 }
	
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

  initialize: function() {
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

    if (!hash[userModel.get('id')]) remove.push(userModel);
   });

   for (var userModel in remove) {
    userCollection.remove(remove[userModel]);
   }

  },

  roomJoin: function() {
   
		var check = $("#avatarWrapper_VAL");
		check.css('margin-top', -120);
		check.data("animating", false);
		if (SurfStreamApp.reelLoop) {
			clearInterval(SurfStreamApp.reelLoop);
			SurfStreamApp.reelLoop = false;
		}
		$("#val_filmreel_right").stop();
		$("#val_filmreel_left").stop();
   check.animate({
    'margin-top': 0
   }, 900, "bounceout");
  }

 });

 window.SearchBarModel = Backbone.Model.extend({

  initialize: function() {
   this.startIndex = 1;
   this.maxResults = 10;
  },

  executeSearch: function(searchQuery) {
   this.get("searchResultsCollection").reset();
   if (typeof(mpq) !== 'undefined') mpq.track("Search", {
    mp_note: "Searched for " + searchQuery
   });
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
   var ytData, items, resultsCollection, buildup;
   ytData = data.data ? data.data : jQuery.parseJSON(data).data;
   if (ytData.totalItems === 0) {
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
	
	initialize: function() {
		//this.showFBButton = false;
	},

  getFBUserDataForRegistration: function() {
   if (this.get("is_main_user")) {
    FB.api('/me', this.setUserData);
   }
	 //this.getUserPostedVideos();
  },

  setUserData: function(info) {
		SurfStreamApp.get("userModel").set({profile: info});
		SurfStreamApp.get("userModel").set({fbId: info.id});
		SurfStreamApp.get("mainView").roomModal.hide();
		SurfStreamApp.get("userModel").set({displayName: info.name})
	  new AvatarPickerView({isFirstVisit: true});
		if (typeof(mpq) !== 'undefined') mpq.track("Avatar Picker Registration", {});
		window.avatar_picker_open_start_time = new Date().getTime();
  },
	
	initializePlaylists: function(userPlaylists, activePlaylistId) {
		for (var playlistId in userPlaylists) {
			if (userPlaylists.hasOwnProperty(playlistId)) {
				this.get("playlistCollection").addPlaylist(playlistId, userPlaylists[playlistId].name, new PlaylistItemCollection(userPlaylists[playlistId].videos));
			}
		}
		$(".active-playlist-nameholder").removeClass("active-playlist-nameholder");
		this.get("playlistCollection").setActivePlaylist(activePlaylistId);
		$(this.get("playlistCollection").idToPlaylistNameholder[activePlaylistId].el).addClass("active-playlist-nameholder");
		if (this.importFacebook)
			this.getUserPostedVideos();
	},

	sendUserFBFriends: function(info) {
		var friendIdList = _.pluck(info.data, "id");
		SocketManagerModel.sendUserFBFriends({
			ssId: window.SurfStreamApp.get('userModel').get("ssId"),
			fbFriends: friendIdList
		});
	},
	
	getUserPostedVideos: function() {
		var today = new Date();
		SocketManagerModel.sendFBImportDate({
			date: today,
			ssId: this.get("ssId")
		});
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
		var videoUrlEnding = videoUrl.substr(videoUrl.indexOf("v=") + 2);
		var length = videoUrlEnding.indexOf("&") < 11 && videoUrlEnding.indexOf("&") != -1 ? videoUrlEnding.indexOf("&") : 11;
		var videoId = videoUrl.substr(videoUrl.indexOf("v=") + 2, length);
		$.ajax({
	    url: "http://gdata.youtube.com/feeds/api/videos?max-results=1&format=5&alt=json&q=" + videoId,
	    success: $.proxy(this.processYoutubeResult, this)
	   });
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
		SocketManagerModel.addVideoToPlaylist(facebookPlaylistId, playlistItemModel.get("videoId"), playlistItemModel.get("thumb"), playlistItemModel.get("title"), playlistItemModel.get("duration"), playlistItemModel.get("viewCount"), playlistItemModel.get("author"), true);
		if (facebookPlaylistId == this.get("playlistCollection").get("activePlaylist").get("playlistId")) {
			var playlistCellView = new PlaylistCellViewTwo({
				playlistItemModel: playlistItemModel,
				playlistId: playlistItemModel.get("playlistId"),
				id: playlistItemModel.get("videoId")
			});
			playlistCellView.initializeViewToTop(false);
		}
	},
	
	logout: function() {
		FB.logout();
		showLoggedOut();
		if (typeof(mpq) !== 'undefined') mpq.track("Logout", {});
	}
	
});
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
	 this.chatMap = {};
   $("#feedbackSpan").click(function() {
    feedback_widget.show();
		if (typeof(mpq) !== 'undefined') mpq.track("Feedback Clicked", {});
   })
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
     channelHistoryCollection: new ChannelHistoryCollection(),
		 fbId: this.get("fbId")
    }),
    socketManagerModel: new SocketManagerModel({
     socket: this.get("socket"),
     app: this
    }),
    searchBarModel: new SearchBarModel({
     searchResultsCollection: new SearchResultsCollection()
    })
   });

	this.set({
    userModel: new UserModel({
     is_main_user: true,
     playlistCollection: new PlaylistCollection(),
		 likesCollection: new LikesCollection(),
     activePlaylist: null,
     socketManagerModel: this.get("socketManagerModel"),
		 fbId: this.get("fbId")
    })
   });

	this.set({
    mainView: new MainView({userModel: this.get("userModel")})
   });

   mainView = this.get("mainView");
   roomModel = this.get("roomModel");
   mainView.initializeTopBarView();

	 this.stickRoomModal = (ss_getPath(window.location) == "/");
   mainView.initializeRoomListView(roomModel.get("roomListCollection"), this);
   mainView.initializePlayerView(roomModel.get("playerModel"), roomModel.get("userCollection"), this.get("userModel"), mainView.roomModal);
   mainView.initializeSidebarView(this.get("searchBarModel"), this.get("userModel").get("playlistCollection"), roomModel.get("channelHistoryCollection"), this.get("userModel").get("likesCollection"), roomModel.get("chatCollection"), this.get("userModel"));
   mainView.initializeSounds();
  }
 });

 window.RoomlistCellModel = Backbone.Model.extend({
  initialize: function() {
   this.set({
    friends: []
   });
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

 window.ChannelHistoryModel = Backbone.Model.extend({});
 window.ChannelHistoryCollection = Backbone.Collection.extend({
  model: ChannelHistoryModel
 });

 window.LikesModel = Backbone.Model.extend({});
 window.LikesCollection = Backbone.Collection.extend({
	model: LikesModel
 });
 window.SearchResultModel = Backbone.Model.extend({});
 window.SearchResultsCollection = Backbone.Collection.extend({
  model: SearchResultModel,

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

 window.AvatarPickerView = Backbone.View.extend({

	el: "#avatar-picker-modal",

	avatarPickerTemplate: _.template($("#avatar-picker-template").html()),

	events: {
   "click #saveChanges": "saveAvatar",
   "click #cancelPicker": "closePicker"
  },

	initialize: function() {
   $("#modalBG").show();
	 if(this.options.justTutorial) {
		$(this.el).html(this.make('img', {id:'tutorial', src:"/images/room/val-info.png"}));
		$(this.el).fadeIn();
		$("#tutorial").fadeIn();
		$("#closeTutorial").fadeIn();
		if (typeof(mpq) !== 'undefined') mpq.track("Tutorial Opened", {});
		$("#closeTutorial").bind("click", function(){
			if (typeof(mpq) !== 'undefined') mpq.track("Tutorial Closed", {timeSpent: Math.floor(((new Date().getTime()) - window.avatar_picker_open_start_time) / 1000) });
			$('#avatar-picker-modal').hide();
			$("#roomsList").after("<div id=avatar-picker-modal></div>")
			$("#change-avatar").hide();	
			$("#modalBG").hide();	
			$("#logout").hide();
			$("#closeTutorial").hide();
		});
		$("#modalBG").click({
	    modal: this
	   }, function(e) {
		  if (e.data.modal.options.isFirstVisit) return;
			e.data.modal.remove();
			if (typeof(mpq) !== 'undefined') mpq.track("Tutorial Closed", {timeSpent: Math.floor(((new Date().getTime()) - window.avatar_picker_open_start_time) / 1000) });
			$("#roomsList").after("<div id=avatar-picker-modal></div>")
			$("#change-avatar").hide();	
			$("#modalBG").hide();	
			$("#logout").hide();
			$("#closeTutorial").hide();
	  });
		return;
	 }
   $("#modalBG").click({
    modal: this
   }, function(e) {
	  if (e.data.modal.options.isFirstVisit) return;
		if (typeof(mpq) !== 'undefined') mpq.track("Avatar Picker Closed", {timeSpent: Math.floor(((new Date().getTime()) - window.avatar_picker_open_start_time) / 1000) });
		e.data.modal.remove();
		$("#roomsList").after("<div id=avatar-picker-modal></div>")
		$("#change-avatar").hide();	
		$("#edit-profile").hide();	
		$("#logout").hide();
		$("#modalBG").hide();	
   });
	 
   this.render();
 	 $("#name-change-input").val(SurfStreamApp.get("userModel").get("displayName"))
	 $(".picker-el").click({picker: this}, this.handlePickerElClick);
	 this.previewWrapper = $($(".picker-preview-avatar-wrapper")[0])
	 this.previewWrapper.css({"margin-left": 52, "margin-top": 60});
	 if (this.options.isFirstVisit){
		 SurfStreamApp.currentAvatarSettings = [Math.ceil(Math.random() * 5), Math.ceil(Math.random() * 3), Math.ceil(Math.random() * 2), Math.ceil(Math.random() * 6) - 1, Math.ceil(Math.random() * 5), Math.ceil(Math.random() * 5) - 1];
	 	 $("#cancelPicker").hide();
		 $("#saveChanges").css({"margin-left":27, "width":139})
		 $("#saveChanges").html("Start Surfing")
	 }
	this.setSelected("body", SurfStreamApp.currentAvatarSettings[0]);
	this.setSelected("eye", SurfStreamApp.currentAvatarSettings[1]);
	this.setSelected("eyesize", SurfStreamApp.currentAvatarSettings[2]);
	this.setSelected("glasses", SurfStreamApp.currentAvatarSettings[3]);
	this.setSelected("smile", SurfStreamApp.currentAvatarSettings[4]);
	this.setSelected("hat", SurfStreamApp.currentAvatarSettings[5]);
	 
	 
		$(this.el).show();
	 this.highlightCurrents(SurfStreamApp.currentAvatarSettings);
	 this.idMapper = {
		"blue": 1,
		"green": 2,
		"purple" : 3,
		"red" : 4,
		"yellow": 5,
		"cute" : 1,
		"cartoon": 2, 
		"blueeyes": 3,
		"small" : 1,
		"large" : 2,
		"dark" : 1,
		"thick" : 2,
		"redshades" : 3,
		"shiny" : 4,
		"monocole" : 5,
		"cucumber" : 1,
		"openmouth" : 2,
		"modest" : 3,
		"vampire" : 4,
		"openteeth" : 5,
		"headphone" : 1,
		"bow" : 2,
		"brown" : 3,
		"horns" : 4,
		"none": 0
	};

  },
	
	highlightCurrents: function(currents) {

		//highlight relevant ones
		var style = "4px solid orange";
		var parent;
		switch(parseInt(currents[0])) {
			case 1:
				parent = $("#ap_body_blue").parent()
				parent.css({border: style});
				break;
			case 2:
				parent = $("#ap_body_green").parent()
				parent.css({border: style});
				break;
			case 3:
				parent = $("#ap_body_purple").parent()
				parent.css({border: style});
				break;
			case 4:
				parent = $("#ap_body_red").parent()
				parent.css({border: style});
				break;
			case 5:
				parent = $("#ap_body_yellow").parent()
				parent.css({border: style});
				break;
		}
		switch(parseInt(currents[1])){
			case 1:
				parent = $("#ap_eye_cute").parent().css({border: style});
				break;
			case 2:
				parent = $("#ap_eye_cartoon").parent().css({border: style});
				break;
			case 3:
			 	parent = $("#ap_eye_blueeyes").parent().css({border: style});
				break;	
		}
		switch(parseInt(currents[2])){
			case 1:
				parent = $("#ap_eyesize_small").parent().css({border: style});
				break;
			case 2:
				parent = $("#ap_eyesize_large").parent().css({border: style});
				break;
		}
		switch(parseInt(currents[3])){
			case 0:
				parent = $("#ap_glasses_none").parent().css({border: style});
				break;
			case 1:
				parent = $("#ap_glasses_dark").parent().css({border: style});
				break;
			case 2:
				parent = $("#ap_glasses_thick").parent().css({border: style});
				break;
			case 3:
				parent = $("#ap_glasses_redshades").parent().css({border: style});
				break;
			case 4:
				parent = $("#ap_glasses_shiny").parent().css({border: style});
				break;
			case 5:
			  parent = $("#ap_glasses_monocole").parent().css({border: style});
				break;
		}
		switch(parseInt(currents[4])){
			case 1:
				parent = $("#ap_smile_cucumber").parent().css({border: style});
				break;
			case 2:
				parent = $("#ap_smile_openmouth").parent().css({border: style});
				break;
			case 3:
				parent = $("#ap_smile_modest").parent().css({border: style});
				break;
			case 4:
				parent = $("#ap_smile_vampire").parent().css({border: style});
				break;
			case 5:
				parent = $("#ap_smile_openteeth").parent().css({border: style});
				break;
		}
		switch(parseInt(currents[5])) {
			case 1:
				$("#ap_hat_headphone").parent().css({border: style});
				break;
			case 2:
				$("#ap_hat_bow").parent().css({border: style});				
				break;
			case 3:
				$("#ap_hat_brown").parent().css({border: style});				
				break;
			case 4:
				$("#ap_hat_horns").parent().css({border: style});
				break;
		}
	},


	render: function() {
   $(this.el).html(this.avatarPickerTemplate());
  },

	saveAvatar: function() {
		if ($("#name-change-input").val() == "") {
			$("#name-change-input").css({"border-color": "red"});
			$("#name-change-text").append('<span style="color: red"> !</span>');
			return;
		}
		var newAvatarSettings = [];
		newAvatarSettings.push(this.bodyID);
		newAvatarSettings.push(this.eyeID);
		newAvatarSettings.push(this.eyesizeID);
		newAvatarSettings.push(this.glassesID);
		newAvatarSettings.push(this.smileID);
		newAvatarSettings.push(this.hatID);
		SurfStreamApp.currentAvatarSettings = newAvatarSettings;
		SurfStreamApp.get("userModel").set({displayName: $("#name-change-input").val()});

		if(this.options.isFirstVisit) {
			var info = SurfStreamApp.get("userModel").get("profile");
			info.ss_name = SurfStreamApp.get("userModel").get("displayName");
			info.avatarSettings = newAvatarSettings;
			SocketManagerModel.initializeProfile(info);
			SurfStreamApp.waitForTutorialEnd = true;
			$("#picker-title, #pickerselection, #name-change-text, #name-change-input, #picker-preview, .dialog-buttons").hide();
			$("#tutorial").fadeIn();
			$("#tutorialStart").fadeIn();
			this.showModal = window.SurfStreamApp.stickRoomModal;
			$("#tutorialStart").click({picker: this}, function(e){
				e.data.picker.closePicker();
				Backbone.history.start({
			   	pushState: true,
			   	silent: e.data.picker.showModal
			   });
				if (e.data.picker.showModal) {
					
					SurfStreamApp.get("mainView").roomModal.show();
				}
				
			});
			if (typeof(mpq) !== 'undefined') mpq.track("Avatar Picker Registration Done", {timeSpent: Math.floor(((new Date().getTime()) - window.avatar_picker_open_start_time) / 1000) });
		} else {
			if (typeof(mpq) !== 'undefined') mpq.track("Avatar Picker Save", {timeSpent: Math.floor(((new Date().getTime()) - window.avatar_picker_open_start_time) / 1000)  });
			SocketManagerModel.updateAvatar();
			this.closePicker();		
		}
		
	},

	closePicker: function() {
		this.remove();
		$("#roomsList").after("<div id=avatar-picker-modal></div>")
	  $("#modalBG").hide();
		$("#change-avatar").hide();	
		$("#edit-profile").hide();	
		$("#logout").hide();
		if (typeof(mpq) !== 'undefined') mpq.track("Avatar Picker Closed", {timeSpent: Math.floor(((new Date().getTime()) - window.avatar_picker_open_start_time) / 1000) });
	},

	handlePickerElClick: function(e) {
		var pickerID = e.currentTarget.firstChild.id;
		var parser = /ap_(.+)_(.+)/;
		var match = parser.exec(pickerID);

		//neutralize all
		$("#picker-"+match[1] + " > .picker-el").css({border: "1px solid white"});
		//highlight relevant one
		$(e.currentTarget).css({border: "4px solid orange"});

		console.log("body part: " + match[1]);
		console.log('id: ' + match[2]);

		e.data.picker.setSelected(match[1], e.data.picker.idMapper[match[2]]);
	},

	setSelected: function(bodyPart, toPartID) {
		var bodyPartDiv;
		switch (bodyPart) {
			case "body":
				this.bodyID = toPartID;
				$(".body-preview").remove()
				this.previewWrapper.removeClass()
				this.previewWrapper.addClass("avt_" + toPartID);	
				this.previewWrapper.prepend(this.buildBodyPart("body", toPartID))
				break;
			case "eye":
		    this.eyeID = toPartID;
				$(".eye-preview-left").remove();
				$(".eye-preview-right").remove();
				this.buildEyes(this.eyeID, this.eyesizeID);
				break;
			case "eyesize":
				this.eyesizeID = toPartID;
				$(".eye-preview-left").remove();
				$(".eye-preview-right").remove();
				this.buildEyes(this.eyeID, this.eyesizeID);
				break;
			case "glasses":
				$(".glasses-preview").remove()
				if (toPartID != 0) this.previewWrapper.append(this.buildBodyPart("glasses", toPartID))
				this.glassesID = toPartID;
				break;
			case "smile":
				$(".smile-preview").remove()
				this.previewWrapper.append(this.buildBodyPart("smile", toPartID))
				this.smileID = toPartID;
				break;
			case "hat":
				$(".hat-preview").remove()
				if (toPartID != 0) this.previewWrapper.append(this.buildBodyPart("hat", toPartID))
				this.hatID = toPartID;
				break;
			default:
				alert("fuuu")
		} 
	},

	buildBodyPart: function (bodyPart, toPartID, large) {
			return this.make("img", {src: this.bodyPartToPath(bodyPart, toPartID), style: "position: absolute;", "class":  this.bodyPartToClass(bodyPart, toPartID)})
	},

	buildEyes: function (eyeID, eyesizeID) {
		var path = this.bodyPartToPath("eye", eyeID);
		//render left eye first, then right
		this.previewWrapper.append(this.make("img", {src: path, style: "position: absolute;", "class" : this.getEyeClass(eyeID, eyesizeID, true)}));
		this.previewWrapper.append(this.make("img", {src: path, style: "position: absolute;", "class" : this.getEyeClass(eyeID, eyesizeID, false)}));		
	},

	getEyeClass : function (eyeID, eyesizeID, left) {
		var result = "eye_" + (left ? "left" : "right") + "_";
		switch(parseInt(eyeID)){
			case 1:
				result = result + "cute_";
				break;
			case 2:
				result = result + "cartoon_";
				break;
			case 3:
			 	result = result + "blue_"
				break;
		}
		switch(parseInt(eyesizeID)){
			case 1:
				result = result + "medium";
				break;
			case 2:
				result = result + "large";
				break;
		}
		return result + " eye-preview-" + (left ? "left" : "right");
	},

	bodyPartToPath : function (bodyPart, toPartID) {
		var result = "/images/room/monsters/";
		switch (bodyPart) {
			case "body":
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "blue.png";
						break;
					case 2:
						result = result + "green.png";
						break;
					case 3:
						result = result + "purple.png";
						break;
					case 4:
						result = result + "red.png";
						break;
					case 5:
						result = result + "yellow.png";					
						break;
				}
				break;
			case "eye":
				result = result + "eyes/";
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "cute-medium.png";
						break;
					case 2:
						result = result + "cartoon-medium.png";
						break;
					case 3:
						result = result + "blue-medium.png";
						break;
				}
				break;
			case "glasses":
				result = result + "accessories/";
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "glasses-dark.png";
						break;
					case 2:
						result = result + "glasses-thick.png";
						break;
					case 3:
						result = result + "glasses-red.png";
						break;
					case 4:
						result = result + "glasses-shiny.png";
						break;
					case 5:
						result = result + "glasses-monocole.png";
						break;
				}
				break;
			case "smile":
				result = result + "smiles/";
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "cucumberteeth.png";
						break;
					case 2:
						result = result + "openmouth.png";
						break;
					case 3:
						result = result + "modest.png";
						break;
					case 4:
						result = result + "vampireteeth.png";
						break;
					case 5:
						result = result + "openteeth.png";
						break;
				}
				break;
			case "hat":
				result = result + "accessories/";
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "hat-headphones.png";
						break;
					case 2:
						result = result + "hat-bow.png";
						break;
					case 3:
						result = result + "hat-brown.png";
						break;
					case 4:
						result = result + "hat-horns.png";
						break;
				}
				break;
			default:
				alert("fuuu")
		}
		return result;
	},

	bodyPartToClass : function (bodyPart, toPartID) {
		var result = "-preview ";
		switch (bodyPart) {
			case "body":
				return "body-preview";
				break;
			case "glasses":
				result = "glasses" + result;
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "glasses_dark";
						break;
					case 2:
						result = result + "glasses_thick";
						break;
					case 3:
						result = result + "glasses_red";
						break;
					case 4:
						result = result + "glasses_shiny";
						break;
					case 5:
						result = result + "glasses_monocole";
						break;
				}
				break;
			case "smile":
				result = "smile" + result;
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "smile_cucumber";
						break;
					case 2:
						result = result + "smile_openmouth";
						break;
					case 3:
						result = result + "smile_modest";
						break;
					case 4:
						result = result + "smile_vampire";
						break;
					case 5:
						result = result + "smile_openteeth";
						break;
				}
				break;
			case "hat":
				result = "hat" + result;
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "hat-headphones";
						break;
					case 2:
						result = result + "hat-bow";
						break;
					case 3:
						result = result + "hat-brown";
						break;
					case 4:
						result = result + "hat-horns";
						break;
				}
				break;
			default:
				alert("fuuu")
		}
		return result;
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
 window.SideBarView = Backbone.View.extend({
  el: '#sidebar',

  sidebarTemplate: _.template($('#sidebar-template').html()),

  initialize: function() {
   this.render();
	// this.valVoteView = new ValVoteView({
	//	sideBarView: this
	// });
	 this.videoManagerView = new VideoManagerView({
		sideBarView: this,
		searchBarModel: this.options.searchBarModel,
		likesCollection: this.options.likesCollection,
		channelHistoryCollection: this.options.channelHistoryCollection,
		playlistCollection: this.options.playlistCollection
	 });
	 this.chatView = new ChatView({
		chatCollection: this.options.chatCollection,
		userModel: this.options.userModel,
		expandSize: 537,
		shrinkSize: 154
	 });
	 this.chatExpanded = true;
	 this.valVoteExpanded = false;
	 this.videoManagerExpanded = false;
	 this.sideBarHeight = 633;
  },

  render: function() {
   $(this.el).html(this.sidebarTemplate());
   return this;
  },
	
	showValVoteView: function() {
		if (this.chatExpanded) {
			this.shrinkChatView();
		}
		if (this.valVoteExpanded) {
			return;
		}
		this.valVoteExpanded = true;
		this.hideVideoManagerView();
		this.valVoteView.valVoteBody.slideDown(300);
	},
	
	hideValVoteView: function()  {
		if (!this.valVoteExpanded) {
			return;
		}
		this.valVoteView.valVoteBody.slideUp(300);
		this.valVoteExpanded = false;
		if (!this.videoManagerExpanded) {
			this.expandChatView();
		}
	},
	
	showVideoManagerView: function() {
		if (this.chatExpanded) {
			this.shrinkChatView();
		}
		if (this.videoManagerExpanded) {
			return;
		}
		this.videoManagerExpanded = true;
		this.hideValVoteView();
		this.videoManagerView.videoManagerBody.slideDown(300);
	},
	
	hideVideoManagerView: function() {
		if (!this.videoManagerExpanded) {
			return;
		}
		this.videoManagerView.videoManagerBody.slideUp(300);
		this.videoManagerExpanded = false;
		if (!this.valVoteExpanded) {
			this.expandChatView();
		}
		
	},
	
	expandChatView: function() {
		this.chatView.expandChatView();
		this.chatExpanded = true;
		if (typeof(mpq) !== 'undefined') mpq.track("Video Manager Collapsed");
	},
	
	shrinkChatView: function() {
		this.chatView.shrinkChatView();
		this.chatExpanded = false;
		if (typeof(mpq) !== 'undefined') mpq.track("Video Manager Opened");
	},
	
	hidePlaylistView: function() {
		if (!this.playlistActive) {
			return;
		}
		$(".active-playlist-nameholder").removeClass("active-playlist-nameholder");
		$("#playlist-view").hide();
		this.playlistActive = false;
	},
	
	showPlaylistView: function() {
		if (this.playlistActive) {
			return;
		}
		$("#playlist-view").show();
		this.browseVideosView.activeNonPlaylistNameholder.deactivateNameholder();
		this.browseVideosView.searchView.hide();
		this.playlistActive = true;
	}

 });

 window.ValVoteView = Backbone.View.extend({
	el: "#valVoteContainer",
	
	valVoteTemplate: _.template($("#val-vote-template").html()),
	
	events: {
		"click #valVoteHeader": "toggleValVote"
	},
	
	initialize: function() {
		this.sideBarView = this.options.sideBarView;
		this.render();
		this.valVoteHeader = $(this.el).find("#valVoteHeader");
		this.valVoteBody = $(this.el).find("#valVoteBody");
		this.valVoteBody.hide();
	},
	
	render: function() {
		$(this.el).html(this.valVoteTemplate());
	},
	
	toggleValVote: function(event) {
		if (this.sideBarView.valVoteExpanded) {
			this.sideBarView.hideValVoteView();
		} else {
			this.sideBarView.showValVoteView();
		}
	}
 });
 window.VideoManagerView = Backbone.View.extend({
	el: "#videoManagerContainer",
	
	videoManagerTemplate: _.template($("#video-manager-template").html()),
	
	events: {
		"click #videoManagerHeader": "toggleVideoManager"
	},

	initialize: function() {
		this.sideBarView = this.options.sideBarView;
		this.options.playlistCollection.videoManagerView = this;
		this.render();
		this.videoManagerHeader = $(this.el).find("#videoManagerHeader");
		this.videoManagerBody = $(this.el).find("#videoManagerBody");
		this.collapseBodyButton = $(this.el).find(".collapseBody");
		this.videoManagerBody.hide();
		this.browseVideosView = new BrowseVideosView({
			videoManagerView: this,
			searchBarModel: this.options.searchBarModel,
			likesCollection: this.options.likesCollection,
			channelHistoryCollection: this.options.channelHistoryCollection
		});
		this.playlistCollectionView = new PlaylistCollectionView({
			playlistCollection: this.options.playlistCollection
		});
		this.playlistExpanded = true;
	},
	
	render: function() {
		$(this.el).html(this.videoManagerTemplate());
	},
	
	toggleVideoManager: function(event) {
		if (this.sideBarView.videoManagerExpanded) {
			this.sideBarView.hideVideoManagerView();
			this.collapseBodyButton.animate({rotate: "0deg"}, 300, 'linear');
		} else {
			this.sideBarView.showVideoManagerView();
			this.collapseBodyButton.animate({rotate: "90deg"}, 300, 'linear');
			this.calculatePlaylistHeight();
		}
	},
	
	showBrowseVideosView: function() {
		if (!this.playlistExpanded) {
			return;
		}
		this.playlistExpanded = false;
		this.hidePlaylistCollectionView();
	},
	
	hideBrowseVideosView: function() {
		this.browseVideosView.searchView.hide();
		this.browseVideosView.deactivateNameholder();
	},
	
	showPlaylistCollectionView: function() {
		if (this.playlistExpanded) {
			return;
		}
		this.playlistExpanded = true;
		$(this.playlistCollectionView.playlistView.el).slideDown(300);
		this.hideBrowseVideosView();
	},
	
	hidePlaylistCollectionView: function() {
		$(".active-playlist-nameholder").removeClass("active-playlist-nameholder");
		$(this.playlistCollectionView.playlistView.el).slideUp(300);
	},
	
	calculatePlaylistHeight: function() {
		var pcHeight = $("#playlist-collection-display").outerHeight(true);
		var viewHeight = $("#myVideosContainer").outerHeight(true);
		$("#playlist-display").css('height', viewHeight - pcHeight - 7);
	}
 });
 window.SearchView = Backbone.View.extend({
  //has searchBarModel
  searchViewTemplate: _.template($('#searchView-template').html()),

  viewMoreTemplate: _.template($('#view-more-cell-template').html()),

  el: "#browseVideosVideosContainer",

  initialize: function() {
   this.render();
   this.previewPlayerView = new PreviewPlayerView();
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
   $("#youtubeInput").bind("autocompleteselect", {
    searchView: this
   }, function(event, ui) {
    $("#searchContainer").empty();
    event.data.searchView.options.searchBarModel.executeSearch(ui.item.value);
   });
   input.bind("keyup", {
    searchView: this
   }, this.getSuggestions);
   this.options.searchBarModel.get("searchResultsCollection").bind("add", this.updateResults, this);
   var clearSearchButton = $("#clearsearch");
   clearSearchButton.bind("click", function() {
    $(":input", "#searchBar .inputBox").val("");
    $("#youtubeInput").autocomplete("close");
   });

   $(".searchCellContainer .videoInfo,.searchCellContainer .thumbContainer").live("mouseover mouseout", function(cell) {
    if (cell.type == "mouseover") {
     if (cell.currentTarget.className == "videoInfo") {
      $(cell.currentTarget.parentNode.parentNode.children[1]).show();
     } else {
      $(cell.currentTarget.nextSibling).show();
     }

    } else {
     if (cell.currentTarget.className == "videoInfo") {
      $(cell.currentTarget.parentNode.parentNode.children[1]).hide();
     } else {
      $(cell.currentTarget.nextSibling).hide();
     }
    }
   });
  },

  render: function() {
   $(this.el).html(this.searchViewTemplate());
   return this;
  },

  hide: function(originalHeight) {
	 $("#searchBar").slideUp(300);
   $("#searchContainer").animate({"height": 0}, 300, function() {
		});
  },

  show: function(withSearchBar) {
	 var height = $("#playlist-display").height();
	 var inputBox = $("#searchBar");
	 if (withSearchBar) {
		inputBox.slideDown(300, function() {
		$("#youtubeInput").focus();
		});
		$("#searchContainer").animate({"height": height - 36}, 300, function() {
			
		});
	 } else {
		inputBox.slideUp(300);
		$("#searchContainer").animate({"height": height}, 300, function() {
			
		});
	 }
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
		toTop: false
   });
   if (model.collection.length % this.options.searchBarModel.maxResults == 0) {
    new ViewMoreCellView({
     searchBarModel: this.options.searchBarModel
    });
   }
  },

  getSuggestions: function(event) {
   if (event.keyCode == 13) {
    $("#youtubeInput").autocomplete("option", "disabled", true);
    $("#youtubeInput").autocomplete("close");
    return;
   }
   $("#youtubeInput").autocomplete("option", "disabled", false);
   var input = $("#searchBar .inputBox :input");
   var query = input.val();
   if (event.data.searchView.suggestionHash[query]) {
    $("#youtubeInput").autocomplete("option", "source", event.data.searchView.suggestionHash[query]);
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

  className: "searchCellContainer nameholder-droppable",

  events: {
   "click .previewVideo": "previewVideo",
	 "click .addToQueue": "addToQueue"
  },

  initialize: function() {
		this.render();
		$(this.el).attr("id", this.options.video.get("videoId"));
		if (this.options.toTop) {
			$("#searchContainer").prepend(this.el);
		} else {
	   $("#searchContainer").append(this.el);
		}
	 $(this.el).draggable({
		helper: "clone",
		opacity: 0.6,
		cursorAt: {bottom: 40, left: 142},
		zIndex: 6,
		alreadyRotated: false,
		start: function (event, ui) {
			window.SurfStreamApp.get("userModel").get("playlistCollection").showDroppable();
		},
		drag: function(event, ui) {
			if ($(event.target).draggable("option", "alreadyRotated")) {
				return;
			}
			$(event.target).css("visibility", "hidden");
			var videoId = $(ui.item).attr('id');
			$(ui.helper).find(".previewVideo").remove();
			$(ui.helper).addClass("shrunkenSearchCellContainer");
			$(ui.helper).css("margin-left", 100).css("margin-top", -45);
			$(ui.helper).css("height", 40).css("width", 142);
			$(ui.helper).stop().animate({rotate: -70}, 500, function() {
			});
			$(event.target).draggable("option", "alreadyRotated", true);
		},
		stop: function(event, ui) {
			$(event.target).draggable("option", "alreadyRotated", false);
			$(event.target).css("visibility", "visible");
			var searchContainerOffset = $("#searchContainer").offset();
			$(ui.helper).css("height", 80).css("width", 285);
			$(ui.helper).removeClass("shrunkenSearchCellContainer");
			$(ui.helper).offset({top: searchContainerOffset.top, left: searchContainerOffset.left});
			$(ui.helper).css("margin-top", 0);
			window.SurfStreamApp.get("userModel").get("playlistCollection").hideDroppable();
		}
	 });
	 
   this.$(".thumbContainer").click({
    cell: this.options
   }, this.previewVideo);

	$(".addToQueue").tipsy({
    gravity: 'w'
   });
	this.buttonToQueue = $(this.el).find(".addToQueue");
	if (SurfStreamApp.get("userModel").get("playlistCollection").getPlaylistById(queueId).hasVideo(this.options.video.get("videoId"))) {
	 this.buttonToQueue.css("background", 'url("/images/room/checkbox.png") 50% 50% no-repeat');
	 this.buttonToQueue.attr("title", "In your Queue");
	}
  },


  previewVideo: function(e) {
   var videoID = e.data.cell.video.get("videoId");
   $(window.YTPlayerTwo).css({
    'height': 187
   });

   $("#previewContainer").animate({
    'top': 273
   });
    $("#searchContainer").animate({
     "scrollTop": 0 + (this.offsetTop - 211)
    });
   

   window.YTPlayerTwo.loadVideoById(videoID);
  },
	
	addToQueue: function(event) {
		var playlistCollection = SurfStreamApp.get("userModel").get("playlistCollection");
		if (playlistCollection.getPlaylistById(queueId).hasVideo(this.options.video.get("videoId"))) {
			window.SurfStreamApp.get("mainView").theatreView.valChat("Sorry, but your queue already has that video.");
			return;
		}
		this.buttonToQueue.css("background", 'url("/images/room/checkbox.png") 50% 50% no-repeat');
		this.buttonToQueue.attr("title", "In your Queue");
		var shrunkenCopy = $(this.el).clone();
		$("body").append(shrunkenCopy);
		shrunkenCopy.removeClass("searchCellContainer").addClass("shrunkenSearchCellContainer");
		var droppedOffset = $(SurfStreamApp.get("userModel").get("playlistCollection").idToPlaylistNameholder[queueId].el).offset();
		var droppedWidth = $(SurfStreamApp.get("userModel").get("playlistCollection").idToPlaylistNameholder[queueId].el).width();
		var droppedHeight = $(SurfStreamApp.get("userModel").get("playlistCollection").idToPlaylistNameholder[queueId].el).height();
		shrunkenCopy.offset({top: droppedOffset.top + droppedHeight / 2 - shrunkenCopy.height() / 2 - 54, left: droppedOffset.left + droppedWidth / 2 - 30});
		shrunkenCopy.animate({"rotate": -70}, 100, function() {
			var copyOffset = $(this).offset();
			$(this).animate({width: "1px", height: "5px", top: copyOffset.top + 115, left: copyOffset.left + 15}, 500, function() {
				$(this).remove();
			});
		});
		var attributes = {
			thumb: this.options.video.get("thumb"),
			title: this.options.video.get("title"),
			videoId: this.options.video.get("videoId"),
			duration: this.options.video.get("duration"),
			viewCount: this.options.video.get("viewCount"),
			author: this.options.video.get("author")
		}
		var playlistItemModel = new PlaylistItemModel(attributes);
		playlistCollection.addVideoToPlaylist(queueId, playlistItemModel);
		if (typeof(mpq) !== 'undefined') mpq.track("Add to Queue", {
	    mp_note: "From search cell view from the button",
			source: "Search - Button"
	   });
	},

  render: function(searchResult) {
   $(this.el).html(this.searchCellTemplate({
    thumb: this.options.video.get("thumb"),
    title: this.options.video.get("title"),
    vid_id: this.options.video.get("videoId"),
    duration: ss_formatSeconds(this.options.video.get("duration")),
		realDuration: this.options.video.get("duration"),
    viewCount: (this.options.video.get("viewCount") > 0) ? (ss_formatViews(this.options.video.get("viewCount"))) : "",
		realViewCount: this.options.video.get("viewCount"),
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
    swfobject.embedSWF("http://www.youtube.com/v/9jIhNOrVG58?version=3&enablejsapi=1&playerapiid=YouTubePlayerTwo", "preview-player", "300", "183", "8", null, null, params, atts);
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
	
   //$("#searchContainer").animate({'height': 320, "margin-top":0}, 500);
	 $("#previewContainer").animate({'top': 462}, 500);

  }
 });

 window.PlaylistItemModel = Backbone.Model.extend({});
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
		var playlistCount = this.get("videos").length;
		$(SurfStreamApp.get("userModel").get("playlistCollection").idToPlaylistNameholder[this.get("playlistId")].el).find(".playlist-nameholder-count").html("&nbsp;" + playlistCount + "&nbsp;");
	},
	
	removeFromPlaylist: function(videoId) {
		var playlistItemModel = ss_modelWithAttribute(this.get("videos"), "videoId", videoId);
	 	var copyPlaylistItemModel = new PlaylistItemModel(playlistItemModel.attributes);
	 	this.get("videos").remove(playlistItemModel);
		var playlistCount = this.get("videos").length;
		$(SurfStreamApp.get("userModel").get("playlistCollection").idToPlaylistNameholder[this.get("playlistId")].el).find(".playlist-nameholder-count").html("&nbsp;" + playlistCount + "&nbsp;");
		window.SurfStreamApp.get("mainView").sideBarView.videoManagerView.playlistCollectionView.playlistView.setNotificationText();
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
		this.idToPlaylist = {};
		this.idToPlaylistNameholder = {};
		this.playlistCollectionView = null; //initialized when playlistcollectionview is
  },

	setActivePlaylist: function(playlistId) {
		var playlistCollection = window.SurfStreamApp.get("userModel").get("playlistCollection");
		var previouslySelected = playlistCollection.get("activePlaylist");
		if (previouslySelected) {
			$(playlistCollection.idToPlaylistNameholder[previouslySelected.get("playlistId")].el).removeClass("selected-playlist-nameholder").removeClass("active-playlist-nameholder");
		}
		this.videoManagerView.showPlaylistCollectionView();
		SocketManagerModel.choosePlaylist(playlistId);
		playlistCollection.set({activePlaylist: playlistCollection.getPlaylistById(playlistId)});
		window.SurfStreamApp.get("mainView").sideBarView.videoManagerView.playlistCollectionView.playlistView.setPlaylist(playlistCollection.get("activePlaylist"));
		window.SurfStreamApp.get("mainView").sideBarView.videoManagerView.playlistCollectionView.playlistView.resetPlaylist();
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
		delete this.idToPlaylist[playlistId];
		delete this.idToPlaylistNameholder[playlistId];
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
		
		var playlistNameholderView = new PlaylistNameholderView({
			playlist_nameholder_value: playlistId,
			playlist_nameholder_name: name,
			playlistCollection: this,
			playlist_count: videos.length
		});
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
		SocketManagerModel.addVideoToPlaylist(playlistId, playlistItemModel.get("videoId"), playlistItemModel.get("thumb"), playlistItemModel.get("title"), playlistItemModel.get("duration"), playlistItemModel.get("viewCount"), playlistItemModel.get("author"), false);
		if (playlistId == this.get("activePlaylist").get("playlistId")) {
			window.SurfStreamApp.get("mainView").sideBarView.videoManagerView.playlistCollectionView.playlistView.addVideo(playlistItemModel, playlistId);
			window.SurfStreamApp.get("mainView").sideBarView.videoManagerView.playlistCollectionView.playlistView.setNotificationText();
		}
	},
	
	showDroppable: function() {
		for (var id in this.idToPlaylistNameholder) {
			if (this.idToPlaylistNameholder.hasOwnProperty(id)) {
				if (id != this.get("activePlaylist").get("playlistId")) {
					$(this.idToPlaylistNameholder[id].el).addClass("droppable-playlist-nameholder");
				}
			}
		}
		$("#playlist-collection-input").hide();
	},
	
	hideDroppable: function() {
		for (var id in this.idToPlaylistNameholder) {
			if (this.idToPlaylistNameholder.hasOwnProperty(id)) {
				if (id != this.get("activePlaylist").get("playlistId")) {
					$(this.idToPlaylistNameholder[id].el).removeClass("droppable-playlist-nameholder");
				}
			}
		}
		$("#browseVideosButtons").css("visibility", "visible");
		$("#playlist-collection-input").show();
	}
 });
 window.PlaylistCollectionView = Backbone.View.extend({
	el: "#myVideosContainer",
	
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

  render: function() {
   $(this.el).html(this.playlistCollectionTemplate());
   return this;
  }
 });
 
 window.BrowseVideosView = Backbone.View.extend({
	el: "#browseVideosContainer",
	
	browseVideosTemplate: _.template($("#browse-videos-template").html()),
	
	events: {
		"click #ytnh": "showSearch",
		"click #chnh": "showChannelHistory",
		"click #lvnh": "showLikes"
	},
	
	initialize: function() {
		//$(".youtube-nameholder")['0'].attr('id', 'youtube-pill');
		this.videoManagerView = this.options.videoManagerView;
		this.options.channelHistoryCollection.bind("add", this.addChannelHistoryView, this);
		this.options.likesCollection.bind("add", this.addLikesView, this);
		this.render();
		this.searchActive = false;
		this.channelHistoryActive = false;
		this.likesActive = false;
		this.searchView = new SearchView({
			searchBarModel: this.options.searchBarModel,
			playlistCollection: this.options.playlistCollection
	  });
		this.activeNonPlaylistNameholder = this.likesNameholderView;
	},

  showSearch: function() {
		if (this.activeNonPlaylistNameholder) {
			this.deactivateNameholder();
		}
		this.searchActive = true;
		this.channelHistoryActive = false;
		this.likesActive = false;
		this.searchView.show(true);
		this.videoManagerView.showBrowseVideosView();
		this.activeNonPlaylistNameholder = $(this.el).find("#ytnh");
		this.activeNonPlaylistNameholder.addClass("selected-non-playlist-nameholder");
		this.activeNonPlaylistNameholder.addClass("active-playlist-nameholder");
		this.resetSearchResults();
  },
	
	showChannelHistory: function() {
		if (this.activeNonPlaylistNameholder) {
			this.deactivateNameholder();
		}
		this.searchActive = false;
		this.channelHistoryActive = true;
		this.likesActive = false;
		this.searchView.show(false);
		this.videoManagerView.showBrowseVideosView();
		this.activeNonPlaylistNameholder = $(this.el).find("#chnh");
		this.activeNonPlaylistNameholder.addClass("selected-non-playlist-nameholder");
		this.activeNonPlaylistNameholder.addClass("active-playlist-nameholder");
		this.resetChannelHistory();
	},
	
	showLikes: function() {
		if (this.activeNonPlaylistNameholder) {
			this.deactivateNameholder();
		}
		this.searchActive = false;
		this.channelHistoryActive = false;
		this.likesActive = true;
		this.searchView.show(false);
		this.videoManagerView.showBrowseVideosView();
		this.activeNonPlaylistNameholder = $(this.el).find("#lvnh");
		this.activeNonPlaylistNameholder.addClass("selected-non-playlist-nameholder");
		this.activeNonPlaylistNameholder.addClass("active-playlist-nameholder");
		this.resetLikes();
	},
	
	resetSearchResults: function() {
		$("#searchContainer").empty();
		this.options.searchBarModel.get("searchResultsCollection").each(function(searchResult) {
			new SearchCellView({video: searchResult, toTop: false});
		});
	},
	
	resetChannelHistory: function() {		
		$("#searchContainer").empty();
		this.options.channelHistoryCollection.each(function(channelHistoryItem) {
			var attributes = {
		   title: channelHistoryItem.get("title"),
			 thumb: ss_idToImg(channelHistoryItem.get("videoId")),
			 videoId: channelHistoryItem.get("videoId"),
			 duration: channelHistoryItem.get("duration"),
			 viewCount: channelHistoryItem.get("viewCount") ? channelHistoryItem.get("viewCount") : 0,
			 author: channelHistoryItem.get("author")
			};
			var searchResultModel = new SearchResultModel(attributes);
			new SearchCellView({video: searchResultModel, toTop: false});
		});
	},
	
	resetLikes: function() {
		$("#searchContainer").empty();
		this.options.likesCollection.each(function(likesModel) {
			var attributes = {
		   title: likesModel.get("title"),
			 thumb: ss_idToImg(likesModel.get("videoId")),
			 videoId: likesModel.get("videoId"),
			 duration: likesModel.get("duration"),
			 viewCount: likesModel.get("viewCount") ? likesModel.get("viewCount") : 0,
			 author: likesModel.get("author")
			};
			var searchResultModel = new SearchResultModel(attributes);
			new SearchCellView({video: searchResultModel, toTop: false});
		});
	},
	
	addChannelHistoryView: function(recentVideo) {
		if (this.channelHistoryActive) {
			var attributes = {
		   title: recentVideo.get("title"),
			 thumb: ss_idToImg(recentVideo.get("videoId")),
			 videoId: recentVideo.get("videoId"),
			 duration: recentVideo.get("duration"),
			 viewCount: recentVideo.get("viewCount") ? recentVideo.get("viewCount") : 0,
			 author: recentVideo.get("author")
			};
			var searchResultModel = new SearchResultModel(attributes);
			new SearchCellView({video: searchResultModel, toTop: true});
		}
	},
	
	addLikesView: function(likesModel) {
		if (this.likesActive) {
			var attributes = {
		   title: likesModel.get("title"),
			 thumb: ss_idToImg(likesModel.get("videoId")),
			 videoId: likesModel.get("videoId"),
			 duration: likesModel.get("duration"),
			 viewCount: likesModel.get("viewCount") ? likesModel.get("viewCount") : 0,
			 author: likesModel.get("author")
			};
			var searchResultModel = new SearchResultModel(attributes);
			new SearchCellView({video: searchResultModel, toTop: true});
		}
	},
	
	deactivateNameholder: function() {
		this.activeNonPlaylistNameholder.removeClass("selected-non-playlist-nameholder");
		this.activeNonPlaylistNameholder.removeClass("active-playlist-nameholder");
	},

  render: function() {
   $(this.el).html(this.browseVideosTemplate());
  }
 });

 window.PlaylistNameholderView = Backbone.View.extend({
	className: "playlist-nameholder",
	tagName: "li",
	playlistNameholderTemplate: _.template($("#playlist-nameholder-template").html()),
	events: {
		"click .delete-nameholder": "presentDialog",
		"click": "setActivePlaylist"
	},
	initialize: function() {
		this.render();
		$(this.el).droppable({
			accept: ".nameholder-droppable",
			hoverClass: "playlist-hover-highlight",
			drop: function(event, ui) {
				var fromVideoId = $(ui.draggable).attr('id');
				var playlistCollection = window.SurfStreamApp.get("userModel").get("playlistCollection");
				var toPlaylistId = $(this).val();
				var toPlaylist = playlistCollection.getPlaylistById(toPlaylistId);
				if (toPlaylist.hasVideo(fromVideoId)) {
					window.SurfStreamApp.get("mainView").theatreView.valChat("Sorry, but that playlist already has that video.");
					return;
				}
				$(this).addClass("dropped-playlist-nameholder");
				var shrunkenCopy = $(ui.helper).clone();
				$("body").append(shrunkenCopy);
				
				var droppedOffset = $(this).offset();
				var droppedWidth = $(this).width();
				shrunkenCopy.offset({top: droppedOffset.top - 125, left: droppedOffset.left + droppedWidth / 2 - 10});
				var copyOffset = shrunkenCopy.offset();
	 			var fromVideoClass = $(ui.draggable).attr("class");
				
				if (fromVideoClass.indexOf("searchCellContainer") == -1) {
					var fromPlaylist = playlistCollection.get("activePlaylist");
					var playlistItemModel = ss_modelWithAttribute(fromPlaylist.get("videos"), "videoId", fromVideoId);
		 			var copyPlaylistItemModel = new PlaylistItemModel(playlistItemModel.attributes);
					playlistCollection.addVideoToPlaylist(toPlaylistId, copyPlaylistItemModel);
					shrunkenCopy.animate({width: "1px", height: "5px", top: copyOffset.top + 175, left: copyOffset.left - 90}, 500, function() {
						$(this).remove();
					});
					if (toPlaylistId != queueId) {
						ui.draggable.remove();
						fromPlaylist.removeFromPlaylist(fromVideoId);
						if (typeof(mpq) !== 'undefined') mpq.track("Add to Playlist", {
					    mp_note: "From another playlist from drag n drop",
							source: "Playlist - Drag and Drop"
			 	    });
					} else {
						if (typeof(mpq) !== 'undefined') mpq.track("Add to Queue", {
					    mp_note: "From another playlist from drag n drop",
							source: "Playlist - Drag and Drop"
			 	    });
					}
				} else {
					var attributes = {
						title: $(ui.draggable).find(".title").text(),
						thumb: ss_idToImg(fromVideoId),
						duration: $(ui.draggable).find(".realDuration").text(),
						videoId: fromVideoId,
						viewCount: $(ui.draggable).find(".realViewCount").text()
					}
					var playlistItemModel = new PlaylistItemModel(attributes);
					playlistCollection.addVideoToPlaylist(toPlaylistId, playlistItemModel);
					shrunkenCopy.animate({width: "1px", height: "5px", top: copyOffset.top + 180, left: copyOffset.left - 87}, 500, function() {
						$(this).remove();
					});
					ui.draggable.remove();
					if (toPlaylistId != queueId) {
						if (typeof(mpq) !== 'undefined') mpq.track("Add to Playlist", {
					    mp_note: "From search result from drag n drop",
							source: "Search - Drag and Drop"
			 	    });
					} else {
						if (typeof(mpq) !== 'undefined') mpq.track("Add to Queue", {
					    mp_note: "From search result from drag n drop",
							source: "Search - Drag and Drop"
			 	    });
					}
				}
				$(this).animate({"background": "white"}, 500, function() {
					$(this).removeClass("dropped-playlist-nameholder");
				});
			}
		});
		if (this.options.playlist_nameholder_value == facebookPlaylistId || this.options.playlist_nameholder_value == queueId) {
			$(this.el).find(".delete-nameholder").remove();
		}
		this.options.playlistCollection.videoManagerView.calculatePlaylistHeight();
	},
	
	render: function() {
		$(this.el).prepend(this.playlistNameholderTemplate({
			playlist_name: this.options.playlist_nameholder_name,
			playlist_count: "&nbsp;" + this.options.playlist_count + "&nbsp;"
		}));
		$(this.el).val(this.options.playlist_nameholder_value);
		if (this.options.playlist_nameholder_value == queueId) {
			$(this.el).addClass("queuePlaylist").removeClass("playlist-nameholder");
		}
		var length = $("#playlist-collection-display").children().length;
		$(this.el).insertBefore($("#playlist-collection-display").children()[length - 1]);
	  return this;
	},
	printSomething: function() {
		console.log("works");
	},
	
	setActivePlaylist: function(event) {
		if (event) {
			if (event.currentTarget.className == "delete-nameholder") {
				return;
			}
		}
		this.options.playlistCollection.setActivePlaylist(this.options.playlist_nameholder_value);
		$(this.el).addClass("active-playlist-nameholder");
	},
	
	presentDialog: function() {
		new DeleteConfirmationView({
			playlistTitle: this.options.playlist_nameholder_name,
			nameholderView: this
		});
	},
	
	removeNameholder: function() {
		$(this.el).remove();
		this.options.playlistCollection.videoManagerView.calculatePlaylistHeight();
		this.options.playlistCollection.deletePlaylist(this.options.playlist_nameholder_value);
	},
	
	highlightView: function() {
		
	}
	
 });
 
 window.PlaylistView = Backbone.View.extend({
  el: '#playlist-display',

  playlistTemplate: _.template($('#playlist-template').html()),
	
	playlistNotificationTemplate: _.template($("#playlist-notification-template").html()),

  initialize: function() {
	 this.render();
	 $("#video-list-container").sortable({
	 		update: function(event, ui) {
				var yThreshold = $("#playlist-collection-display").offset().top + $("#playlist-collection-display").outerHeight() - ui.item.height() * 3 / 4;
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
				window.SurfStreamApp.get("mainView").sideBarView.videoManagerView.playlistCollectionView.playlistView.setNotificationText();
	 		 SocketManagerModel.toIndexInPlaylist(playlistCollection.get("playlistId"), videoId, index);
	 		},
			cursorAt: {bottom: 30, left: 142},
			axis: "y",
			helper: "clone",
			forceHelperSize: true,
			alreadyShrunk: false,
			opacity: 0.6,
			start: function (event, ui) {
				window.SurfStreamApp.get("userModel").get("playlistCollection").showDroppable();
			},
			sort: function(event, ui) {
				var yThreshold = $("#playlist-collection-display").offset().top + $("#playlist-collection-display").outerHeight() - ui.item.height() / 2;
				var yPosition = ui.position.top;
				if (yPosition < yThreshold && !$("#video-list-container").sortable("option", "alreadyShrunk")) {
					var videoId = $(ui.item).attr('id');
					$("#video-list-container").sortable("option", "axis", false);
					$(ui.helper).addClass("shrunken-playlist-cell");
					$(ui.helper).css("margin-left", 100).css("margin-top", -45);
					$(ui.helper).css("height", 30).css("width", 142);
					$(ui.helper).stop().animate({rotate: -70}, 500, function() {
					});
					$("#video-list-container").sortable("option", "alreadyShrunk", true);
				} else if (yPosition > yThreshold && $("#video-list-container").sortable("option", "alreadyShrunk")) {
					$("#video-list-container").sortable("option", "appendTo", "parent");
					$(ui.helper).stop().animate({rotate: 0}, 500, function() {
						var playlistOffset = $("#video-list-container").offset();
						$(ui.helper).css("height", 60).css("width", 285).css("margin-top", 0);
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
				window.SurfStreamApp.get("userModel").get("playlistCollection").hideDroppable();
			}
	 });
	 $("#video-list-container").disableSelection();
  },

  render: function() {
		$(this.el).html(this.playlistTemplate());
		$(this.el).prepend(this.playlistNotificationTemplate());
		return this;
  },

  addVideo: function(playlistItemModel, playlistId) {
		var playlistCellView;
		if (playlistId == 0) {
 	    playlistCellView = new PlaylistCellView({
	    playlistItemModel: playlistItemModel,
			playlistId: playlistId,
			id: playlistItemModel.get("videoId")
	   });
		} else {
			playlistCellView = new PlaylistCellViewTwo({
	    playlistItemModel: playlistItemModel,
			playlistId: playlistId,
			id: playlistItemModel.get("videoId")
	   });
		}
   playlistCellView.initializeViewToTop(true);
  },

	resetPlaylist : function() {
		$("#video-list-container.videoListContainer").empty();
		//this.playlist.get("videos").each(function(playlistItemModel) {this.addVideo(playlistItemModel, this.playlist.get("playlistId"))}, this);
		for (var i = this.playlist.get("videos").length - 1; i >= 0; i--) {
			this.addVideo(this.playlist.get("videos").at(i), this.playlist.get("playlistId"));
		}
		/*if (this.playlist.get("playlistId") == facebookPlaylistId && window.SurfStreamApp.get("userModel").showFBButton) {
			new ImportFBVideosCell();
		}*/
	},
	
	setPlaylist: function(playlistModel) {
		this.playlist = playlistModel;
		this.setNotificationText();
	},
	
	setNotificationText: function(text) {
		if (SurfStreamApp.get("userModel").get("playlistCollection").getPlaylistById(queueId).get("videos").length == 0) {
			$("#playlist-notification-text").text("Up next: Your queue is currently empty");
		} else {
			$("#playlist-notification-text").text("Up next: " + SurfStreamApp.get("userModel").get("playlistCollection").getPlaylistById(queueId).get("videos").at(0).get("title"));
		}
	}
 });
 window.PlaylistCellView = Backbone.View.extend({
  playlistCellTemplate: _.template($('#playlist-cell-template').html()),

  className: "videoListCellContainer nameholder-droppable",

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
	
	initializeViewToTopAndGrow: function() {
   var buttonRemove, buttonToTop, videoID;
   //Hack because of nested view bindings part 2 (events get eaten by Sidebar)
   this.render();
	 $(this.el).css("display", "none");
   $("#video-list-container").prepend(this.el);
	 $("#video-list-container").find(".videoListCellContainer").slideDown(500);
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
   $(this).parent().parent().parent().slideUp(500, function() {
		$(this).remove();
	 });
   var playlistFrom = window.SurfStreamApp.get("userModel").get("playlistCollection").idToPlaylist[event.data.videoModel.get("playlistId")];
   playlistFrom.removeFromPlaylist(event.data.videoModel.get("videoId"));
  },

  toTheTop: function(event) {
   var copyPlaylistItemModel = new PlaylistItemModel(event.data.videoModel.attributes);
   var collectionReference = event.data.playlistCollection;
   if (collectionReference.at(0).get("videoId") == event.data.videoModel.get("videoId")) {
    return;
   }
	 $(this).parent().parent().parent().css("visibility", "hidden");
   $(this).parent().parent().parent().slideUp(500, function() {
		$(this).remove();
	 });
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
   playlistCellView.initializeViewToTopAndGrow();
   window.SurfStreamApp.get("mainView").sideBarView.videoManagerView.playlistCollectionView.playlistView.setNotificationText();
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

 window.PlaylistCellViewTwo = Backbone.View.extend({
	playlistCellTemplate: _.template($('#playlist-cell-template-two').html()),

  className: "videoListCellContainer nameholder-droppable",

  initializeViewToTop: function(top) {
   var buttonRemove, buttonToQueue, videoID;
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
    playlistCollection: this.options.playlistItemModel.collection,
		cell: this
   }, this.removeFromPlaylist);
   this.buttonToQueue = $("#add_to_queue_" + videoID);
	 var playlistCollection = SurfStreamApp.get("userModel").get("playlistCollection");
	 if (playlistCollection.getPlaylistById(queueId).hasVideo(videoID)) {
		this.buttonToQueue.css("background", 'url("/images/room/checkbox.png") 50% 50% no-repeat');
		this.buttonToQueue.attr("title", "In your Queue");
	 }
	 this.buttonToQueue.bind("click", {
		videoModel: this.options.playlistItemModel,
		playlistCell: this
	 }, this.addToQueue);
   this.options.playlistItemModel.bind("remove", this.removeFromList, this);
	 this.$(".addToQueue, .remove").tipsy({
    gravity: 'w'
   });
  },

  removeFromPlaylist: function(event) {
	 event.data.cell.$(".addToQueue, .remove").tipsy("hide");
   $(this).parent().parent().parent().slideUp(500, function() {
		$(this).remove();
	 });
   var playlistFrom = window.SurfStreamApp.get("userModel").get("playlistCollection").idToPlaylist[event.data.videoModel.get("playlistId")];
   playlistFrom.removeFromPlaylist(event.data.videoModel.get("videoId"));
  },

  addToQueue: function(event) {
	 var playlistCollection = SurfStreamApp.get("userModel").get("playlistCollection");
	 if (playlistCollection.getPlaylistById(queueId).hasVideo(event.data.videoModel.get("videoId"))) {
		window.SurfStreamApp.get("mainView").theatreView.valChat("Your queue already has that video.");
		return;
	 }
	 event.data.playlistCell.buttonToQueue.css("background", 'url("/images/room/checkbox.png") 50% 50% no-repeat');
	 event.data.playlistCell.buttonToQueue.attr("title", "In your Queue");
	 var shrunkenCopy = $(event.data.playlistCell.el).clone();
	 $("body").append(shrunkenCopy);
	 shrunkenCopy.removeClass("videoListCellContainer").addClass("shrunken-playlist-cell");
	 var droppedOffset = $(SurfStreamApp.get("userModel").get("playlistCollection").idToPlaylistNameholder[queueId].el).offset();
	 var droppedWidth = $(SurfStreamApp.get("userModel").get("playlistCollection").idToPlaylistNameholder[queueId].el).width();
	 var droppedHeight = $(SurfStreamApp.get("userModel").get("playlistCollection").idToPlaylistNameholder[queueId].el).height();
	 shrunkenCopy.offset({top: droppedOffset.top + droppedHeight / 2 - shrunkenCopy.height() / 2 - 58, left: droppedOffset.left + droppedWidth / 2 - 37});
	 shrunkenCopy.animate({"rotate": -70}, 100, function() {
	 	var copyOffset = $(this).offset();
	 	$(this).animate({width: "1px", height: "5px", top: copyOffset.top + 125, left: copyOffset.left + 15}, 500, function() {
	 		$(this).remove();
	 	});
	 });
	 
	 
   var copyPlaylistItemModel = new PlaylistItemModel(event.data.videoModel.attributes);
	 playlistCollection.addVideoToPlaylist(queueId, copyPlaylistItemModel);
   window.SurfStreamApp.get("mainView").sideBarView.videoManagerView.playlistCollectionView.playlistView.setNotificationText();
	 if (typeof(mpq) !== 'undefined') mpq.track("Add to Queue", {
	    mp_note: "From another playlist through the button",
		  source: "Playlist - Button"
	   });
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
 window.ImportFBVideosCell = Backbone.View.extend({
	id: "import-fb-videos-cell",
	
	importFBVideoTemplate: _.template($("#import-fb-videos-template").html()),
	
	events: {
		"click": "importFBVideos"
	},
	
	initialize: function() {
		this.render();
	},
	
	render: function() {
		$(this.el).html(this.importFBVideoTemplate({
			text: "Import videos from your Facebook Wall"
		}));
		$("#video-list-container").prepend(this.el);
	},
	
	importFBVideos: function(event) {
		$(this.el).remove();
		window.SurfStreamApp.get("userModel").showFBButton = false;
		window.SurfStreamApp.get("userModel").getUserPostedVideos();
	}
	
 });
 window.ChatView = Backbone.View.extend({
  el: '#chatContainer',

  chatTemplate: _.template($('#chat-template').html()),

  initialize: function() {
	 this.expandSize = this.options.expandSize;
	 this.shrinkSize = this.options.shrinkSize;
   this.render();
	 this.messages = $(this.el).find("#messages");
	 this.expandChatView();
   $(this.el).find(".soundToggler").live("click", {
    sound: this
   }, this.toggleSound);
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
    $(event.data.sound.el).find(".soundToggler").text("Sound Off");
    window.SurfStreamApp.get("mainView").soundOn = false;
   } else {
    $(event.data.sound.el).find(".soundToggler").text("Sound On");
    window.SurfStreamApp.get("mainView").soundOn = true;
   }
  },

  clearChat: function() {
   $("#messages").empty();
  },
	
	expandChatView: function() {
		this.messages.animate({"height": this.expandSize + "px"}, 300);
	},
	
	shrinkChatView: function() {
		this.messages.animate({"height": this.shrinkSize + "px"}, 300);
	}
 });

 window.RoomListView = Backbone.View.extend({

  el: "#roomsList",

  roomListTemplate: _.template($('#roomlist-template').html()),


  initialize: function() {
   var modal;
   this.options.roomlistCollection.bind("reset", this.addRooms, this);
	 if (this.options.app.stickRoomModal) {
   	this.render();
 	 }
  },

  hide: function() {
   $("#room-modal").hide();
   $("#modalBG").hide();
	 	if (typeof(mpq) !== 'undefined') {
			mpq.track("Room Modal Closed", {
				timeSpent: Math.floor(((new Date().getTime()) - window.channel_modal_open_time) / 1000) 
			})
	   }
  },

	//this is only called when the user manually clicks to close the room modal
	hideByClick: function(e) {
		if (typeof(SurfStreamApp.inRoom) == 'undefined') return;
		SurfStreamApp.get("mainRouter").navigate("/" + SurfStreamApp.inRoom, false);
		e.data.modal.hide();
	},

  show: function() {
   $("#room-modal").show();
   $("#modalBG").show();
   SocketManagerModel.loadRoomsInfo();
  },

  render: function() {		
   $(this.el).html(this.roomListTemplate());
   this.bindButtonEvents();
   return this;
  },

  bindButtonEvents: function() {
   $("#CreateRoom").bind("click", {
    modal: this
   }, this.submitNewRoom);
   $("#CreateRoomName").bind("submit", this.submitNewRoom);
   $("#CreateRoomName").keypress({
    modal: this
   }, function(press) {
    if (press.which == 13) {
     press.data.modal.submitNewRoom(press);
    }
   });
   $("#hideRoomsList").click({modal: this},this.hideByClick);
   $("#modalBG").click({modal:this},this.hideByClick);
  },

  submitNewRoom: function(e) {
   var roomName = $("#CreateRoomName").val();
   if (roomName == "") return false;
   var rID = $.trim(roomName).replace(/\s+/g, '-');
   SocketManagerModel.joinRoom(rID, true, roomName);
	 if (typeof(mpq) !== 'undefined') mpq.track("Room Joined", {
			mp_note: "Created room " + roomName,
			source: "Created Room",
			roomName: roomName
	 });
   window.SurfStreamApp.get("mainRouter").navigate("/" + rID, false);
   e.data.modal.hide();
   return false;
  },

  addRooms: function(roomListCollection) {
    this.render()
		roomListCollection.each(function(roomListCellModel) {
    new RoomListCellView({
     roomListCellModel: roomListCellModel
    })
   });
   if (SurfStreamApp.stickRoomModal) {
    $("#hideRoomsList").css({display: "none"});
		SurfStreamApp.stickRoomModal = false;
		SurfStreamApp.closeRoomModalIsHidden = true;
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
			"mouseout .room-friends-container": "hideFriends",
			"mouseover .friends-hover-container": "displayFriends",
			"mouseout .friends-hover-container": "hideFriends"
		},

		initialize: function () {
			this.render();
			$(this.el).bind("click", this.clickJoinRoom);																					
		},
	
		render: function() {
			//this.options.roomListCellModel.set({friends: [1389848266057, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314, 1984467221314]});
			var roomModel = this.options.roomListCellModel;
			var curVidTitle = roomModel.get("curVidTitle");
			var partialFriendsHTML = this.renderFriends(1, "friendInRoomPic");
			var fullFriendsHTML = this.renderFriends(0, "friendInRoomPicHover");
			var rName = roomModel.get("roomName");
			if (roomModel.get("rID") == SurfStreamApp.inRoom) {
				rName = "<span id='user-cur-room'>" + rName + "</span>";
			}
			$(this.el).html(this.roomListCellTemplate({viewers: roomModel.get("numUsers"), currentVideoName: (curVidTitle && curVidTitle.length > 0) ? "► " + curVidTitle : "" , roomname: rName, numDJs: roomModel.get("numDJs"), partial_friends: partialFriendsHTML, full_friends: fullFriendsHTML, truename: roomModel.get("rID")}));
			if (!roomModel.get("valstream")) {
				$(this.el).find(".valstream-icon").hide();
			}
			this.friendsHover = $(this.el).find(".friends-hover-container");
			this.friendsDisplay = $(this.el).find(".room-friends-container");
			this.channelHistory = $(this.el).find(".room-history-container");
			this.videoTitle = $(this.el).find(".lastPlayedVideoTitle");
			this.channelHistoryDisplayed = false;
			
			//$(this.el).find(".room-friends-container").bind("mouseover", {friends: this.options.roomListCellModel.get("friends")}, this.displayFriends);
			
			var recentVids = roomModel.get("recentVids");
			$($("#roomsTable tbody:first")[0]).append(this.el);
			var recentVidLimit = 2;
			if (!curVidTitle)
				recentVidLimit = 3;
			if (recentVids) {
				var numRecentVids = recentVids.length;
				for (var i = 0; i < numRecentVids && i < recentVidLimit; i++) {
					var videoThumbnail = this.videoThumbnailTemplate();
					$(this.el).find(".room-history-container").prepend(videoThumbnail);
					$(this.el).find(".room-history-container").find(".videoThumbnail:first").attr("src", ss_idToImg(recentVids[i].videoId));
					$(this.el).find(".room-history-container").find(".videoThumbnail:first").mouseenter({videoTitle: recentVids[i].title}, this.displayVideoTitle);
				}
			}
			
			if (curVidTitle) {
				var videoThumbnail = this.videoThumbnailTemplate();
				$(this.el).find(".room-history-container").prepend(videoThumbnail);
				$(this.el).find(".room-history-container").find(".videoThumbnail:first").attr("src", ss_idToImg(roomModel.get("curVidId")));
				$(this.el).find(".room-history-container").find(".videoThumbnail:first").mouseenter({videoTitle: curVidTitle}, this.displayVideoTitle);
				$(this.el).find(".room-history-container .videoThumbnailContainer:first .videoThumbnail").addClass("lastPlayedVideo");
				$(this.el).find(".room-history .lastPlayedVideoTitle").text(curVidTitle);
			}
			
			if (!curVidTitle && !recentVids)
				$(this.el).find(".lastPlayedVideoTitle").prepend("No videos have been played yet. Be the first!");
			return this;
		},
		
		renderFriends: function(count, className) {
			var result = "";
			var friends = this.options.roomListCellModel.get("friends");
			if (friends.length == 0)
				return "";
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
			var roomName =  $(this).find(".listed-room-name").html();
			SocketManagerModel.joinRoom(rID, false, roomName);
			if (typeof(mpq) !== 'undefined') mpq.track("Room Joined", {
					mp_note: "Picked From Modal: " + roomName,
					source: "Modal",
					roomName: roomName
			 });
			window.SurfStreamApp.get("mainRouter").navigate("/" + rID, false);
			window.SurfStreamApp.get("mainView").roomModal.hide();
		},
		
		displayVideoTitle: function(event) {
			console.log("HRM!");
			//$(event.currentTarget).parent().parent().find(".lastPlayedVideo").removeClass("lastPlayedVideo").css({border: "0px solid white"});
			//$(event.currentTarget).addClass("lastPlayedVideo").css({border: "1px solid white"});
			$(event.currentTarget).parent().parent().parent().find(".lastPlayedVideoTitle").text(event.data.videoTitle);
		},
		
		displayFriends: function(event) {
			if (this.options.roomListCellModel.get("friends").length == 0)
				return;
			this.friendsHover.show()
			var parentOffset = this.friendsDisplay.offset();
			var friendsHoverTop = parentOffset.top + this.friendsDisplay.height() / 2 - this.friendsHover.height() / 2;
			var friendsHoverLeft = parentOffset.left - this.friendsHover.width();
			this.friendsHover.offset({top: friendsHoverTop, left: friendsHoverLeft});
		},
		
		hideFriends: function(event) {
			this.friendsHover.hide();
		},
		
		displayChannelHistory: function(event) {
			if (this.channelHistoryDisplayed)
				return;
			//this.channelHistory.stop().slideDown(500);
			this.channelHistoryDisplayed = true;
			this.channelHistory.show();
		},
		
		hideChannelHistory: function(event) {
			if (!this.channelHistoryDisplayed)
				return;
			//this.channelHistory.stop().slideUp(500);
			this.channelHistoryDisplayed = false;
			this.channelHistory.hide();
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
	 //if (this.options.username == "VAL") $(this.el).css({"background-color":"teal"});
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
	 if (SurfStreamApp.playSkipSound) {
		window.SurfStreamApp.get("mainView").playSound("skip_video");
		SurfStreamApp.playSkipSound = false;
	} else {
		window.SurfStreamApp.get("mainView").playSound("channel_click");
	}
   
  },

  render: function(nowPlayingMsg) {
   $(this.el).html(this.chatCellVideoTemplate({
    title: this.options.videoTitle,
		vidID: this.options.videoID
   }));
	 this.$(".videoChatImg").attr("src",ss_idToImg(this.options.videoID));
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
   var becomeDJ = $("#become-dj"),
       remotePullup = $("#remote-pullup"),
       avatarVAL = $("#avatarWrapper_VAL");
   becomeDJ.bind("click", {
    theatreView: this,
    playlistCollection: this.options.userModel.get("playlistCollection")
   }, this.toggleDJStatus);
   becomeDJ.hide();
   $("#nowPlayingFull").hide();
   $("#fullscreen").bind("click", {
    theatre: this
   }, this.fullscreenToggle);
	 $(document).keyup({theatre: this}, function(e){
	            if(e.keyCode == 27 && e.data.theatre.full){
	               e.data.theatre.fullscreenToggle(e);
	            }
	        });
   $("#fullscreenIcon").bind("click", {
    theatre: this
   }, this.fullscreenToggle);
	 $("#lightSwitch").removeClass("down");
	 setTimeout(function(){$("#lightSwitch").addClass("up");}, 200);
	 $("#lightSwitch").click( function(){
		if(this.className == "up") {
			this.className = "down";
			$("#dimRoom").fadeIn();
			$("#dimRoomRemote").fadeIn();
			$("#dimRoomSideBar").fadeIn();
			if (typeof(mpq) !== 'undefined') mpq.track("Light Turned Off");
		} else {
			this.className = "up";
			$("#dimRoom").fadeOut();
			$("#dimRoomRemote").fadeOut();
			$("#dimRoomSideBar").fadeOut();
			if (typeof(mpq) !== 'undefined') mpq.track("Light Turned On");
		}
	 });
   $(".video-div-proxy").hover(
   //onmousein

	 
   function(e) {
    $("#fullscreenIcon").stop()
    $("#now-playing-tv").stop()
    $("#time-elapsed-bar").stop()

    $("#fullscreenIcon, #now-playing-tv, #time-elapsed-bar").css({
     display: "block"
    });
    $("#fullscreenIcon").animate({
     opacity: 1
    });
    $("#now-playing-tv").animate({
     opacity: .85
    });
    $("#time-elapsed-bar").animate({
     opacity: .85
    });


   },

   //onmouseout


   function(e) {
		if (e.relatedTarget) {
	    if (e.relatedTarget.id == "fullscreenIcon" || e.relatedTarget.className == '.video-div-proxy') {
	     return;
	    }
		}
    $("#fullscreenIcon").stop()
    $("#now-playing-tv").stop()
    $("#time-elapsed-bar").stop()
    var hide = function() {
     $(this).css({
      display: "none"
     })
    };

    $("#fullscreenIcon").animate({
     opacity: 0
    }, 600, "swing", hide)
    $("#now-playing-tv").animate({
     opacity: 0
    }, 600, "swing", hide)
    $("#time-elapsed-bar").animate({
     opacity: 0
    }, 600, "swing", hide)

   });
	 
   $("#slider-line-container").bind('drag', function(event) {
    if (event.target.id == "slider-line" || event.target.id == "slider-line-container" || event.target.id == "slider-line-full") {
     $("#slider-ball-dot").show();
     if (event.layerX >= 98) {
      $("#slider-ball").css({
       "margin-left": 89
      });
     } else {
      $("#slider-ball").css({
       "margin-left": event.layerX + 10
      });
     }
    }
    var volume = Math.floor((($("#slider-ball").css("margin-left").replace("px", "") - 10) / 82) * 100);
    window.YTPlayer.setVolume(volume);
    $("#slider-line-full").css({
     width: (volume * .8)
    });
   });

	 $("#slider-line-container").bind('dragend', function(event) {
			$("#slider-ball-dot").hide();
		});


   $("#slider-line-container").bind('draginit', function(event) {
    if (event.layerX <= 98) {
     $("#slider-ball").css({
      "margin-left": event.layerX + 10
     });
     var volume = Math.floor((($("#slider-ball").css("margin-left").replace("px", "") - 10) / 82) * 100);
     window.YTPlayer.setVolume(volume);
     $("#slider-line-full").css({
      width: (volume * .8)
     });
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
   avatarVAL.data({
    "sofaML": 410
   });
   avatarVAL.data({
    "sofaMT": 0
   });
   avatarVAL.append(this.make('div', {
    id: 'valtipsy',
    title: "<div style='color: #CAEDFA; font-family: \"Courier New\", Courier, monospace' >VAL, the video robot</div>",
   }));
   this.valChatTipsy = this.make('div', {
    id: 'avatarChat_VAL',
    "class": "chattip"
   });
   avatarVAL.append(this.valChatTipsy);
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
	 $("#upVoteFS").bind("click", this.voteUp);
   $("#downVoteFS").bind("click", SocketManagerModel.voteDown);
   $("#vol-up").bind("click", {
    offset: 10
   }, setVideoVolume);
   $("#vol-down").bind("click", {
    offset: -10
   }, setVideoVolume);
   $("#mute").bind("click", {
    button: $("#mute")
   }, mute);
   $("#rooms, #logo-header").bind("click", {
    modal: this.options.modal
   }, function(e) {
    if ($("#room-modal").css("display") == "none") {
			e.data.modal.show()
			if (typeof(mpq) !== 'undefined') {
				mpq.track("Room Modal Opened")
				window.channel_modal_open_time = new Date().getTime();
		   }
		} else {
			e.data.modal.hide()
		}  
		
   });

	 $("#share-video-button").click(function(){
		if (typeof(mpq) !== 'undefined') mpq.track("Facebook Share Clicked", {source: "remote"});
		var nowPlaying = window.SurfStreamApp.get("roomModel").get("playerModel").get("curVid");
   	FB.ui({
	    method: 'feed',
	    display: 'popup',
	    name: nowPlaying.title,
	    link: "www.youtube.com/watch?v="+nowPlaying.videoId,
	    description: "Watch videos with me in the " + SurfStreamApp.inRoomName+  " channel on surfstream",
			picture: ss_idToImg(nowPlaying.videoId),
		  properties: {"Join Now! Spots limited. Promo Code FBFRIEND": {text: "www.surfstream.tv", href: document.location.toString()}},
		 	actions: [{name: "Surf With Me", link: document.URL}]
	   }, function(response) {
	    if (response.post_id) {
				if (typeof(mpq) !== 'undefined') mpq.track("Facebook Share Made", {source: "remote"});
			}
		 });
	 });
	 this.options.modal.hide();
   this.options.userCollection.bind("add", this.placeUser, this);
   this.options.userCollection.bind("remove", this.removeUser, this);
   this.chats = [];
   this.full = false;

	 $(".chatShare").live("click", function(e){
		if (typeof(mpq) !== 'undefined') mpq.track("Facebook Share Clicked", {source: "chat"});
		var nowPlaying = {videoId: $(e.target.parentNode).children().filter(".nowPlayingYTID").html(), title: $(e.target.parentNode).children().filter(".nowPlayingHiddenTitle").html()};
   	FB.ui({
	    method: 'feed',
	    display: 'popup',
	    name: nowPlaying.title,
	    link: "www.youtube.com/watch?v="+nowPlaying.videoId,
	    description: "Watch videos with me in the " + SurfStreamApp.inRoomName+  " channel on surfstream",
			picture: ss_idToImg(nowPlaying.videoId),
		  properties: {"Join Now! Spots limited. Promo Code FBFRIEND": {text: "www.surfstream.tv", href: document.location.toString()}},
		 	actions: [{name: "Surf With Me", link: document.URL}]
	   }, function(response) {
	    if (response.post_id) {
				if (typeof(mpq) !== 'undefined') mpq.track("Facebook Share Made", {source: "chat"});
			}
		 });
	 });
   $("#ch-up").click({
    theatre: this
   }, function(e) {
    var curRoom = SurfStreamApp.inRoom;
    e.data.theatre.flipChannel(curRoom, true);
   });

   $("#ch-down").click({
    theatre: this
   }, function(e) {		
    var curRoom = SurfStreamApp.inRoom;
    e.data.theatre.flipChannel(curRoom, false);
   });
	
	 $("#upCh").click({
    theatre: this
   }, function(e) {
    var curRoom = SurfStreamApp.inRoom;
    e.data.theatre.flipChannel(curRoom, true);
   });

   $("#downCh").click({
    theatre: this
   }, function(e) {
    var curRoom = SurfStreamApp.inRoom;
    e.data.theatre.flipChannel(curRoom, false);
   });

   window.onfocus = function() {
 		if(SurfStreamApp.curDJ != "VAL"){
			var reel_right = $("#val_filmreel_right"); 
			var reel_left = $("#val_filmreel_left");
			var check = $("#avatarWrapper_VAL");
			check.data("animating", false);
			if (SurfStreamApp.reelLoop) {
				clearInterval(SurfStreamApp.reelLoop);
				SurfStreamApp.reelLoop = false;
			}
			reel_right.stop();
			reel_left.stop();
		}
	}
  },
	
	voteUp: function() {
		var nowPlaying = window.SurfStreamApp.get("roomModel").get("playerModel").get("curVid");
		var likesCollection = window.SurfStreamApp.get("userModel").get("likesCollection");
		if (!ss_modelWithAttribute(likesCollection, "videoId", nowPlaying.videoId)) {
			var attributes = {
				title: nowPlaying.title,
				thumb: ss_idToImg(nowPlaying.videoId),
				videoId: nowPlaying.videoId,
				duration: nowPlaying.duration,
				author: nowPlaying.author,
				viewCount: nowPlaying.viewCount
			}
			var likesModel = new LikesModel(attributes);
			window.SurfStreamApp.get("userModel").get("likesCollection").add(likesModel, {
				at: 0
			});
			SocketManagerModel.voteUp(attributes);
		} else {
			SocketManagerModel.voteUp();
		}
	},

  flipChannel: function(rID, up) {
		$("#playlist-notification-container").slideUp();
   var roomArray = SurfStreamApp.get("roomModel").get("roomListCollection").toArray();
   var rIDArray = _.map(roomArray, function(room) {
    return room.get("rID")
   })
   var curIndex = _.indexOf(rIDArray, rID);
   if (up) {
    curIndex = curIndex - 1;
   } else {
    curIndex = curIndex + 1;
   }

   if (curIndex < 0) curIndex = rIDArray.length - 1;
   if (curIndex == rIDArray.length) curIndex = 0;

	 var roomName = rIDArray[curIndex].replace(/-+/g, ' ');
	 SurfStreamApp.get("mainRouter").navigate("/" + rIDArray[curIndex], false);
   SocketManagerModel.joinRoom(rIDArray[curIndex], false, roomName );
	 if (typeof(mpq) !== 'undefined') mpq.track("Room Joined", {
		mp_note: "Flipped Channel " + (up ? "Up" : "Down") + " into room " + roomName,
		source: "Remote Ch-" + up ? "Up" : "Down",
		roomName: roomName
	 });
  },

  fullscreenToggle: function(e) {
   e.data.theatre.full = !e.data.theatre.full;
   if (e.data.theatre.full) {
    SurfStreamApp.fullscreen = true;
    if (typeof(mpq) !== 'undefined') mpq.track("Fullscreen on", {
     mp_note: "Fullscreen open"
    });
    $("#YouTubePlayer").addClass("fully");
    $("#fullscreenIcon").addClass("fully");
    window.onmousemove = (function() {
     console.log("movin");
     if (window.mmTimeoutID) {
      window.clearTimeout(window.mmTimeoutID);
     }
     $("#nowPlayingFull").fadeIn(300);
     $("#fullscreenIcon").fadeIn(300);

     window.mmTimeoutID = setTimeout(function() {
      $("#nowPlayingFull").fadeOut(300);
      $("#fullscreenIcon").fadeOut(300);
     }, 5000)
    });
   } else {
    SurfStreamApp.fullscreen = false;
    if (typeof(mpq) !== 'undefined') mpq.track("Fullscreen off", {
     mp_note: "Fullscreen closed"
    });
    $("#YouTubePlayer").removeClass("fully");
    $("#fullscreenIcon").removeClass("fully");
    $("#nowPlayingFull").hide();
    if (window.mmTimeoutID) {
     window.clearTimeout(window.mmTimeoutID);
    }
    $("#fullscreenIcon").css("display", "none");
    window.onmousemove = null;
    window.mmTimeoutID = null;
   }
  },

  updateDJs: function(djArray) {
   var oldPosX, oldPosY, user;
   var X_COORDS = [200, 266, 328];
   var Y_COORD = 0;
   var cur_is_dj = false;
   var numOnSofa = 0;
   var newDJ;
   SurfStreamApp.sofaUsers = djArray;
   //Remove old DJs
   this.options.userCollection.each(function(userModel) {
    user = $("#avatarWrapper_" + userModel.get("id"));
    //if the user is a DJ
    if (user.data("isDJ") == "1") {
     //If there are not any DJ ID's that match the current ID of the user we're looking at
     if (!_.any(_.pluck(djArray, 'id'), function(el) {
      return ('' + el) == ('' + userModel.get("id"))
     })) {
      //take DJ off sofa
      oldPosX = user.data("roomX");
      oldPosY = user.data("roomY");
      user.animate({
       "margin-top": Y_COORD + 70
      }, 500, "bounceout").animate({
       "margin-left": oldPosX,
       "margin-top": oldPosY
      }, 600);
      user.data({
       "trueY": oldPosY
      });
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

    if (user.data("isDJ") == "0") {
     user.data("isDJ", "1");
     newDJ = true;
     if (djArray[dj].id == this.options.userModel.get("ssId")) {
			user.data("isMainUser", "1");
      user.append("<div id='stepDown' style='width: 80px; height: 95px; position: absolute;'></div>");
      $('#stepDown').append("<a id='getOff' class='getOff' z-index=30 style='display: none; position: absolute;'>Step Down</a>");
      $('#stepDown').hover(function() {
       $('#getOff').fadeIn()
      }, function() {
       $('#getOff').fadeOut();
      });
     }
    } else {
     newDJ = false;
     //if this dj has remote, slide their shit down as well
     if (SurfStreamApp.curDJ == djArray[dj].id) {
      $("#sofa-remote").animate({
       "left": X_COORDS[dj] + 50,
       "top": Y_COORD[dj] + 70
      });
      $("#skipContainer").animate({
       "margin-left": X_COORDS[dj],
       "margin-top": Y_COORD + 100
      });
     }
    }
    console.log("Zindex: " + user.css("z-index"))
    //set the z index so the skip video doesn't cover it
    user.css("z-index", 1000);
    if (newDJ) {
     user.animate({
      "margin-left": X_COORDS[dj],
      "margin-top": Y_COORD + 70
     }, 400);
    }

    user.animate({
     "margin-top": Y_COORD,
     "margin-left": X_COORDS[dj]
    }, 500, "bouncein", function() {
     $(this).css("z-index", "2");
    }); /*restore auto z-index if hopped on couch and became current vj */

    user.data({
     "sofaMT": Y_COORD,
     "sofaML": X_COORDS[dj]
    });
    user.data({
     "trueY": Y_COORD
    });

   }

   $("#avatarWrapper_VAL").show();

   if (cur_is_dj) {
    SurfStreamApp.onSofa = true;
   } else {
    SurfStreamApp.onSofa = false;
   }

   //NEED BOUNDS CHECK HERE TODO
   $("#become-dj").css("margin-left", X_COORDS[numOnSofa] + "px").css("margin-top", Y_COORD + 10 + "px");
   if (!cur_is_dj && djArray.length != 3) {
    $("#become-dj").show();
   } else {
    $("#become-dj").hide();
   }
  },

  toggleDJStatus: function(event) {
		$("#playlist-notification-container").slideDown();
   if (event.data.playlistCollection.getPlaylistById(queueId).get("videos").length == 0) {
		SurfStreamApp.get("mainView").sideBarView.showVideoManagerView();
		SurfStreamApp.get("mainView").sideBarView.videoManagerView.showPlaylistCollectionView();
		SurfStreamApp.get("userModel").get("playlistCollection").setActivePlaylist(queueId);
		SurfStreamApp.get("mainView").sideBarView.videoManagerView.calculatePlaylistHeight();
    event.data.theatreView.valChat("You can't play a video without any videos in your queue");
    return;
   }
   SocketManagerModel.becomeDJ();
  },

  placeUser: function(user) {
   new AvatarView({
    user: user
   });
  },

  valChat: function(text) {
   $(this.valChatTipsy).attr('latest_txt', text);
   $(this.valChatTipsy).tipsy("show");
   setTimeout(function() {
    if ($("#avatarChat_VAL").length > 0) $("#avatarChat_VAL").tipsy("hide");
   }, 3000);
  },

  removeUser: function(user) {
   var avatar = this.$("#avatarWrapper_" + user.id);
   var chat = $("#avatarChat_" + user.id);
	 var name = $("#nameDiv_" + user.id);
   avatar.data("animating", false);
   chat.tipsy('hide');
   name.tipsy('hide');
   avatar.remove();
  }

 }, { /* Class properties */

  tipsyChat: function(text, fbid) {
   var userPic = $("#avatarChat_" + fbid);
   var fbID = fbid;
   userPic.attr('latest_txt', text);
   userPic.tipsy("show");
   if (SurfStreamApp.chatMap[fbid]) {
		clearTimeout(SurfStreamApp.chatMap[fbid]);
	 }
   SurfStreamApp.chatMap[fbid] = setTimeout(function() {
    if ($("#avatarChat_" + fbID).length > 0) userPic.tipsy("hide");
   }, 3000);
  }
 });

 window.AvatarView = Backbone.View.extend({
  
	
	
  initialize: function() {
   var avatarBody, avatarMouth, avatarSmile, user, nameDiv, stageX, avatarArray, avatarEyes, avatarBody, avatarGlasses, avatarTop;
   user = this.options.user;
	 
   this.el.id = "avatarWrapper_" + user.id;
	 avatarArray = user.get("avatar");
	
		if (typeof(SurfStreamApp.currentAvatarSettings) == "undefined" && user.id == SurfStreamApp.get("userModel").get("ssId")) {
			SurfStreamApp.currentAvatarSettings = avatarArray;
		 }
		
	 this.el.className = "avt_" + avatarArray[0];
   avatarBody = AvatarView.buildBodyPart("body", avatarArray[0]);
	 avatarEyes = AvatarView.buildEyes(avatarArray[1], avatarArray[2]);
	 avatarGlasses = (avatarArray[3] != 0) ? AvatarView.buildBodyPart("glasses", avatarArray[3]) : null;
	 avatarSmile = AvatarView.buildBodyPart("smile", avatarArray[4]);
	 avatarTop = (avatarArray[5] != 0) ? AvatarView.buildBodyPart("hat", avatarArray[5]) : null;
   nameDiv = this.make('div', {
    id: 'nameDiv_' + user.id,
    "class": "nametip",
    style: 'position:absolute;',
    title: user.get('name')
   });
   chatDiv = this.make('div', {
    id: 'avatarChat_' + user.id,
    "class": "chattip"
   });
   avatarMouth = this.make('img', {
    "class": 'smile_default default',
    style: "position: absolute;",
    src: AvatarView.defaultMouthSrc
   });
   $(this.el).append(avatarBody).append(avatarMouth).append(avatarSmile).append(avatarEyes[0]).append(avatarEyes[1]);
	 if (avatarGlasses)	$(this.el).append(avatarGlasses);
	 if (avatarTop)	$(this.el).append(avatarTop);
	 $(this.el).append(nameDiv).append(chatDiv);
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
   console.log("margintop stored, value: " + user.get('y'))
   $(this.el).data({
    "roomX": user.get('x'),
    "roomY": user.get('y'),
    "trueY": user.get('y')
   });
   $(this.el).animate({
    "margin-top": user.get('y'),
    "margin-left": user.get('x'),
    "z-index": Math.floor(user.get('y'))
   }, 900, 'expoout');
  } },
 {

  defaultMouthSrc: "/images/room/monsters/smiles/line.png",

	buildBodyPart: function (bodyPart, toPartID, large) {
			return ss_make("img", {src: this.bodyPartToPath(bodyPart, toPartID), style: "position: absolute;", "class":  this.bodyPartToClass(bodyPart, toPartID)})
	},
	
	buildEyes: function (eyeID, eyesizeID) {
		var path = this.bodyPartToPath("eye", eyeID);
		//render left eye first, then right
		return [ss_make("img", {src: path, style: "position: absolute;", "class" : this.getEyeClass(eyeID, eyesizeID, true)}),
						ss_make("img", {src: path, style: "position: absolute;", "class" : this.getEyeClass(eyeID, eyesizeID, false)})];		
	},
	
	getEyeClass : function (eyeID, eyesizeID, left) {
		var result = "eye_" + (left ? "left" : "right") + "_";
		switch(parseInt(eyeID)){
			case 1:
				result = result + "cute_";
				break;
			case 2:
				result = result + "cartoon_";
				break;
			case 3:
			 	result = result + "blue_"
				break;
		}
		switch(parseInt(eyesizeID)){
			case 1:
				result = result + "medium";
				break;
			case 2:
				result = result + "large";
				break;
		}
		return result;
	},
	
	bodyPartToPath : function (bodyPart, toPartID) {
		var result = "/images/room/monsters/";
		switch (bodyPart) {
			case "body":
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "blue.png";
						break;
					case 2:
						result = result + "green.png";
						break;
					case 3:
						result = result + "purple.png";
						break;
					case 4:
						result = result + "red.png";
						break;
					case 5:
						result = result + "yellow.png";					
						break;
				}
				break;
			case "eye":
				result = result + "eyes/";
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "cute-medium.png";
						break;
					case 2:
						result = result + "cartoon-medium.png";
						break;
					case 3:
						result = result + "blue-medium.png";
						break;
				}
				break;
			case "glasses":
				result = result + "accessories/";
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "glasses-dark.png";
						break;
					case 2:
						result = result + "glasses-thick.png";
						break;
					case 3:
						result = result + "glasses-red.png";
						break;
					case 4:
						result = result + "glasses-shiny.png";
						break;
					case 5:
						result = result + "glasses-monocole.png";
						break;
				}
				break;
			case "smile":
				result = result + "smiles/";
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "cucumberteeth.png";
						break;
					case 2:
						result = result + "openmouth.png";
						break;
					case 3:
						result = result + "modest.png";
						break;
					case 4:
						result = result + "vampireteeth.png";
						break;
					case 5:
						result = result + "openteeth.png";
						break;
				}
				break;
			case "hat":
				result = result + "accessories/";
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "hat-headphones.png";
						break;
					case 2:
						result = result + "hat-bow.png";
						break;
					case 3:
						result = result + "hat-brown.png";
						break;
					case 4:
						result = result + "hat-horns.png";
						break;
				}
				break;
			default:
				alert("fuuu")
		}
		return result;
	},
	
	bodyPartToClass : function (bodyPart, toPartID) {
		var result = "";
		switch (bodyPart) {
			case "body":
				return "";
				break;
			case "glasses":
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "glasses_dark";
						break;
					case 2:
						result = result + "glasses_thick";
						break;
					case 3:
						result = result + "glasses_red";
						break;
					case 4:
						result = result + "glasses_shiny";
						break;
					case 5:
						result = result + "glasses_monocole";
						break;
				}
				break;
			case "smile":
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "smile_cucumber smiley";
						break;
					case 2:
						result = result + "smile_openmouth smiley";
						break;
					case 3:
						result = result + "smile_modest smiley";
						break;
					case 4:
						result = result + "smile_vampire smiley";
						break;
					case 5:
						result = result + "smile_openteeth smiley";
						break;
				}
				break;
			case "hat":
				switch(parseInt(toPartID)) {
					case 1:
						result = result + "hat-headphones";
						break;
					case 2:
						result = result + "hat-bow";
						break;
					case 3:
						result = result + "hat-brown";
						break;
					case 4:
						result = result + "hat-horns";
						break;
				}
				break;
			default:
				alert("fuuu")
		}
		return result;
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
   //$('#copy-button-container').html("<button id=\"copy-button\"></div>");
   this.link = document.URL;
   window.clip = new ZeroClipboard.Client();
   clip.setHandCursor(true);
   clip.setText(this.link);
   //clip.glue('copy-button', 'copy-button-container');
	 $("#question-button-container").click(function(){
			new AvatarPickerView({justTutorial: true});	
			window.avatar_picker_open_start_time = new Date().getTime();
	 });
  },

  events: {
   "click #shareFB": "fbDialog",
   "click #shareTwit": "tweetDialog",
   "click #shareEmail": "openEmail"
  },

  fbDialog: function() {
		if (typeof(mpq) !== 'undefined') mpq.track("Facebook Share Clicked", {source: "topbar"});
		console.log(window.SurfStreamApp.get("roomModel").get("playerModel").get("curVid").videoId);
   FB.ui({
    method: 'feed',
    display: 'popup',
    name: 'I\'m in the ' + SurfStreamApp.inRoomName + ' Channel on surfstream.tv',
    link: document.URL,
		picture: ss_idToImg(window.SurfStreamApp.get("roomModel").get("playerModel").get("curVid").videoId),
    caption: 'Come watch videos with me',
    description: 'Now Watching: ' + window.SurfStreamApp.get("roomModel").get("playerModel").get("curVid").title
   }, function(response) {
    if (response.post_id) {
			if (typeof(mpq) !== 'undefined') mpq.track("Facebook Share Made", {source: "topbar"});
		}
	});
  },

  tweetDialog: function() {
   var width = 575,
       height = 400,
       left = ($(window).width() - width) / 2,
       top = ($(window).height() - height) / 2,
       url = "http://twitter.com/share?text=I'm%20watching%20the%20" + encodeURIComponent(SurfStreamApp.inRoomName) + "%20channel%20on%20%23surfstreamtv%20-%20Now%20Playing%20" + encodeURIComponent(window.SurfStreamApp.get("roomModel").get("playerModel").get("curVid").title),
       opts = 'status=1' + ',width=' + width + ',height=' + height + ',top=' + top + ',left=' + left;

   window.open(url, 'twitter', opts);
		if (typeof(mpq) !== 'undefined') mpq.track("Twitter Share Clicked", {});
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
		"click #settings": "showSettings",
		"mouseout": "hideSettings",
		"click #logout": "logout"
	},
	
	initialize: function() {
		this.showingDropdown = false;
		this.render();
		this.userModel = this.options.userModel;
		$("#logout").click({settings: this}, this.logout);
	},
	
	render: function() {
		$(this.el).html(this.settingsTemplate());
	},
	
	showSettings: function(event) {
			$("#settings-dropdown").show();
			this.showingDropdown = true;
	},
	
	hideSettings: function(event) {
		$("#settings-dropdown").hide();
		this.showingDropdown = false;
	},
	
	
 });

 window.MainView = Backbone.View.extend({
  el: 'body',

  soundTemplate: _.template($('#audio-tag-template').html()),

  initialize: function() {
   this.soundOn = true; 
	 this.userModel = this.options.userModel;
   $('#getOff').live('click', function() {
    $("#playlist-notification-container").slideUp();
    $("#stepDown").remove();
    $('#getOff').remove();
    $("#skipContainer").remove();
		
    SocketManagerModel.stepDownFromDJ();
   });

   $("img").live('mousedown', function() {
    return false;
   });

   $("#contactButton").click(function() {
    window.open("mailto:contact@surfstream.tv", '_parent');
   });

	/* SETTINGS HAX */
	this.settingsDropped = false;
	$("#settings").click({mainView:this},
		function(e) {
			if (!e.data.mainView.settingsDropped) {
				$("#change-avatar").show();
				$("#edit-profile").show();
				$("#logout").show();
				e.data.mainView.settingsDropped = true;
			} else {
				$("#change-avatar").hide();
				$("#edit-profile").hide();
				$("#logout").hide();
				e.data.mainView.settingsDropped = false;
			}			
	});
	
	$("#logout").click({mainView: this}, this.logout);

	
	$('#change-avatar').click(function () {
		if (typeof(mpq) !== 'undefined') mpq.track("Avatar Picker Opened", {});
		window.avatar_picker_open_start_time = new Date().getTime();
		new AvatarPickerView();
	});
	/* END SETTINGS HAX */

   this.maxAudioChannels = 15;
  },

	logout: function(e) {
		console.log("logoutttt");
		window.YTPlayer = null;
		userLoggedOut = true;
		e.data.mainView.userModel.logout();
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

  initializeSidebarView: function(searchBarModel, playlistCollection, channelHistoryCollection, likesCollection, chatCollection, userModel) {
   this.sideBarView = new SideBarView({
    searchBarModel: searchBarModel,
    playlistCollection: playlistCollection,
		channelHistoryCollection: channelHistoryCollection,
		likesCollection: likesCollection,
		chatCollection: chatCollection,
		userModel: userModel
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

  initializeRoomListView: function(roomListCollection, app) {
   this.roomModal = new RoomListView({
    roomlistCollection: roomListCollection,
		app: app
   });
  },

  initializeSounds: function() {
   this.audioChannels = new Array();
   for (var i = 0; i < this.maxAudioChannels; i++) {
    this.audioChannels[i] = new Array();
    this.audioChannels[i]['channel'] = new Audio();
    this.audioChannels[i]['finished'] = -1;

   }
   $(document.body).append(this.soundTemplate({
    audio_tag_id: "chat_message_sound",
    audio_src: "/sounds/chat.wav"
   }));
   $(document.body).append(this.soundTemplate({
    audio_tag_id: "channel_click",
    audio_src: "/sounds/click1.wav"
   }));
	 $(document.body).append(this.soundTemplate({
    audio_tag_id: "skip_video",
    audio_src: "/sounds/whoosh.wav"
   }));
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
		var remoteX, remoteY,curX, curY, djRemote, rotationDegs, reelRotationDegs, isdj, skipX, skipY;
		SurfStreamApp.curDJ = video.dj;
		SurfStreamApp.vidsPlayed = SurfStreamApp.vidsPlayed + 1;
		window.vidsWatched = window.vidsWatched + 1;
		console.log('received video, the DJ is: '+video.dj+' and has videoid: '+video.id+' and title: '+video.title+' and time start: '+video.time);	//debugging
		$("#fullTitle").html(video.title);
		$("#cur-video-name").html(video.title);
		var curvid, roomModel, playerModel;
		if (video.dj == app.get("userModel").get("ssId")) {
			var playlistCollection = app.get("userModel").get("playlistCollection");
			var playlistModel = playlistCollection.getPlaylistById(queueId);
			if (playlistCollection.get("activePlaylist").get("playlistId") == queueId) {
				$("#video-list-container .videoListCellContainer:first").remove();
			}
			var playlistItemModel = playlistModel.get("videos").at(0);
			playlistModel.get("videos").remove(playlistItemModel, {silent: true});
			var playlistCount = playlistModel.get("videos").length;
			$(SurfStreamApp.get("userModel").get("playlistCollection").idToPlaylistNameholder[playlistModel.get("playlistId")].el).find(".playlist-nameholder-count").html("&nbsp;" + playlistCount + "&nbsp;");

			window.SurfStreamApp.get("mainView").sideBarView.videoManagerView.playlistCollectionView.playlistView.setNotificationText();
		}
		
		if (video.reason == "downvote"){
			SurfStreamApp.playSkipSound = true;
			window.SurfStreamApp.get("mainView").theatreView.valChat( window.SurfStreamApp.currentTitle + " was downvoted and skipped!");
		} 
		window.SurfStreamApp.currentTitle = video.title;

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
     app.get("mainView").sideBarView.chatView.chatContainer.activeScroll();
    }
    //HACK
    $("#room-name").html(video.title)
    app.get("roomModel").get("userCollection").forEach(function(userModel) {
     $("#avatarWrapper_" + userModel.get("id")).data("animating", false);
     $("#avatarWrapper_" + userModel.get("id") + " .smiley").hide();
     $("#avatarWrapper_" + userModel.get("id") + " .default").show();
    });
    //ENDHACK

    roomModel = app.get("roomModel")
    playerModel = roomModel.get("playerModel");
    curvid = playerModel.get("curVid");
    //adding to room history
		if (curvid) {
			var channelHistoryModel = new ChannelHistoryModel({
				title: curvid.title,
				duration: curvid.duration,
				percent: curvid.percent,
				videoId: curvid.videoId,
				author: curvid.author,
				viewCount: curvid.viewCount
			});
			app.get("roomModel").get("channelHistoryCollection").add(channelHistoryModel, {
				at: 0
			});
		}
		
    //save the currently playing state
    playerModel.set({
     curVid: {
      videoId: video.id,
      title: video.title,
      duration: video.duration,
      percent: 0.5,
			author: video.author,
			viewCount: video.viewCount
     }
    });
    $("#clock").show();
    $("#cur-video-name").show();
    $("#cur-video-time").show();
    var isdj = (SurfStreamApp.curDJ == SurfStreamApp.get("userModel").get("ssId"));
    if (isdj && $("#skip").length == 0) {
     $("#people-area").append("<div id='skipContainer'><button id='skip'> Skip Video </button></div>");
     skipX = $("#avatarWrapper_" + video.dj).data("sofaML");
     skipY = $("#avatarWrapper_" + video.dj).data("sofaMT") + 100;
     $("#skipContainer").css({
      "margin-left": skipX,
      "margin-top": skipY
     });
     $("#skip").bind("click", skipVideo);
    } else {
     $("#skipContainer").remove();
    }
    //put remote on appropro DJ
    djRemote = $("#sofa-remote");
    curX = parseInt(djRemote.css("left").replace("px", ""));
    curY = parseInt(djRemote.css("top").replace("px", ""));
    marLeft = 50 - ((video.dj == "VAL") ? 20 : 0);
    marTop = 70 - ((video.dj == "VAL") ? 7 : 0);
    remoteX = $("#avatarWrapper_" + video.dj).data("sofaML") + marLeft;
    remoteY = $("#avatarWrapper_" + video.dj).data("sofaMT") + marTop;
    var bezier_params = {
     start: {
      x: curX,
      y: curY,
      angle: (curX > remoteX) ? 50 : -50,
      length: .8
     },
     end: {
      x: remoteX,
      y: remoteY,
      angle: (curX > remoteX) ? -50 : 50
     }
    }

    this.rotateRemoteSign = !this.rotateRemoteSign
    rotationDegs = "=1800deg"
		reelRotationDegs = "=500deg";
    if (this.rotateRemoteSign) {
     rotationDegs = "+" + rotationDegs;
		 reelRotationDegs = "+" + reelRotationDegs;
    } else {
     rotationDegs = "-" + rotationDegs;
		 reelRotationDegs = "-" + reelRotationDegs;
    }
    djRemote.animate({
     rotate: rotationDegs,
     path: new $.path.bezier(bezier_params)
    }, 1000);
		var reel_right = $("#val_filmreel_right"); 
		var reel_left = $("#val_filmreel_left");
		var check = $("#avatarWrapper_VAL");
		check.data("animating", false);
		if (SurfStreamApp.reelLoop) {
			clearInterval(SurfStreamApp.reelLoop);
			SurfStreamApp.reelLoop = false;
		}
		reel_right.stop();
		reel_left.stop();
		$("#val_smileBody").css({display:"none"});
		$("#val_body, #val_l_pupil, #val_r_pupil, #val_smile").css({display:"block"});
		if (video.dj == "VAL") {
			$("#val_l_brow").animate({rotate: "+=20deg", "margin-top":"33px", "margin-left":"3px"}, 400, 'linear').delay(1000).animate({rotate: "-=20deg", "margin-top":"37px", "margin-left":"0px"}, 400, 'linear');
			$("#val_r_brow").animate({rotate: "-=20deg", "margin-top":"33px", "margin-left":"24px"}, 400, 'linear').delay(1000).animate({rotate: "+=20deg", "margin-top":"37px", "margin-left":"24px"}, 400, 'linear');
			
       
       
			 check.data("animating", true);
			 	reel_right.animate({rotate: reelRotationDegs}, 3000, 'linear');
				 reel_left.animate({rotate: reelRotationDegs}, 3000, 'linear');
       SurfStreamApp.reelLoop = setInterval(function() {
        if (check.data("animating") == true) {
         reel_right.animate({rotate: reelRotationDegs}, 3000, 'linear');
				 reel_left.animate({rotate: reelRotationDegs}, 3000, 'linear');
        }
       }, 3000, check, reel_right, reel_left);
		}
   });

   socket.on('video:stop', function() {
    if (!window.playerLoaded) return;
    console.log('video ending!');
    window.YTPlayer.stopVideo();
    window.YTPlayer.clearVideo();
   });

	 socket.on("user:profile", function(profile) {
		app.get("userModel").set({
			displayName: profile.ss_name,
			avatarImage: 'https://graph.facebook.com/' + profile.id + '/picture',
			ssId: profile.ssId,
			fbId: profile.id,
			profile: profile
		});
		
		hideSplash();
		console.log("ROUTING ON " + ss_getPath(window.location));
		
		if(!SurfStreamApp.waitForTutorialEnd) {
			Backbone.history.start({
		   	pushState: true,
		   	silent: window.SurfStreamApp.stickRoomModal
		   });

		  if(window.SurfStreamApp.stickRoomModal) {		  
				SurfStreamApp.get("mainView").roomModal.show();
			} else {
				SocketManagerModel.loadRoomsInfo(true);
			}
		}
		
	 });
	 
	 socket.on("playlist:showFBImport", function(data) {
		//app.get("userModel").showFBButton = true;
		console.log("IGOT CALLED IGOT CALLED");
	 });
	 
	 socket.on("user:sendFBFriends", function(data) {
		FB.api('/me/friends', app.get("userModel").sendUserFBFriends);
	 });

   socket.on('playlist:initialize', function(data) {
		if (userLoggedOut)
			return;
		app.get("userModel").initializePlaylists(data.userPlaylists, data.activePlaylistId);
   });

   socket.on('message', function(msg) {
    app.get("roomModel").get("chatCollection").add({
     username: strip(msg.data.name),
     msg: strip(msg.data.text)
    });

		TheatreView.tipsyChat(msg.data.text, msg.data.id);
    
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

	 socket.on("user:firstVisit", function() {
		//display modal
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
       (function() {
        var marginTop = element.data("trueY");
        if (element.data("animating") == true) {
         element.animate({
          marginTop: marginTop - 6
         }, 500).animate({
          marginTop: marginTop
         }, 500, arguments.callee);
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
		
		if(app.curDJ == "VAL" && total > 0){
			$("#val_smileBody").css({display:"block"});
			$("#val_body, #val_l_pupil, #val_r_pupil, #val_smile").css({display:"none"});
			SurfStreamApp.valSmileInterval = setTimeout(function() { 
				$("#val_smileBody").css({display:"none"});
				$("#val_body, #val_l_pupil, #val_r_pupil, #val_smile").css({display:"block"});
			}, 4000);			
		}
   });

	socket.on("rooms:announce", function(roomList) {
		var roomlistCollection = app.get("roomModel").get("roomListCollection");
		roomlistCollection.reset([], {silent: true});
		for (var i = 0; i < roomList.rooms.length; i++) {
			roomlistCollection.add(new RoomlistCellModel(roomList.rooms[i]));
		}
		for(var friendId in roomList.friendsRooms) {
			if(roomList.friendsRooms.hasOwnProperty(friendId)) {
				if (roomList.friendsRooms[friendId]) {
					var roomModel = ss_modelWithAttribute(roomlistCollection, "rID", roomList.friendsRooms[friendId]);
					if (roomModel) {
						roomModel.get("friends").push(friendId);
					}
				}
			}
		}
		var noEvent = false;
		if (SurfStreamApp.noDisplayPicker) {
			noEvent = true;
			SurfStreamApp.noDisplayPicker = false;
		}
		roomlistCollection.sort({silent: noEvent});
	});

   socket.on("room:history", function(roomHistory) {
    app.get("roomModel").get("channelHistoryCollection").reset(roomHistory);
		if (app.get("mainView").sideBarView.videoManagerView.playlistCollectionView.channelHistoryActive) {
			app.get("mainView").sideBarView.videoManagerView.playlistCollectionView.resetChannelHistory();
		}
   });

   socket.on("val:sendRecs", function(recs) {
/*    console.log('got recs ' + recs);
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

    resultsCollection.add(buildup);*/
   });

	socket.on("avatar:change", function(info){
		var user = $("#avatarWrapper_" +info.userId);
		user.removeClass();
		var avatarArray = info.newAvatarArray;
		user.addClass('avt_'+avatarArray[0]);
		var inner = user.children();
		inner.remove();
		avatarBody = AvatarView.buildBodyPart("body", avatarArray[0]);
		avatarEyes = AvatarView.buildEyes(avatarArray[1], avatarArray[2]);
	  avatarGlasses = (avatarArray[3] != 0) ? AvatarView.buildBodyPart("glasses", avatarArray[3]) : null;
	  avatarSmile = AvatarView.buildBodyPart("smile", avatarArray[4]);
	  avatarTop = (avatarArray[5] != 0) ? AvatarView.buildBodyPart("hat", avatarArray[5]) : null;
    nameDiv = ss_make('div', {
     id: 'nameDiv_' + info.userId,
     "class": "nametip",
     style: 'position:absolute;',
     title: info.name
    });
   chatDiv = ss_make('div', {
     id: 'avatarChat_' + info.userId,
    "class": "chattip"
   });
   avatarMouth = ss_make('img', {
    "class": 'smile_default default',
    style: "position: absolute;",
    src: AvatarView.defaultMouthSrc
   });
   user.append(avatarBody).append(avatarMouth).append(avatarSmile).append(avatarEyes[0]).append(avatarEyes[1]);
	 if (avatarGlasses)	user.append(avatarGlasses);
	 if (avatarTop)	user.append(avatarTop);
	 user.append(nameDiv).append(chatDiv); 
		$("#avatarChat_" + info.userId).tipsy({
	    gravity: 'sw',
	    fade: 'true',
	    delayOut: 3000,
	    trigger: 'manual',
	    title: function() {
	     return this.getAttribute('latest_txt')
	    }
	   });
	   $("#nameDiv_" + info.userId).tipsy({
	    gravity: 'n',
	    fade: 'true'
	   });
	  //re-add their stepdown if we took it off the main user
		if (user.data("isDJ") == "1" && user.data("isMainUser") == "1") {

			user.append("<div id='stepDown' style='width: 80px; height: 95px; position: absolute;'></div>");
		   $('#stepDown').append("<a id='getOff' class='getOff' z-index=30 style='display: none; position: absolute;'>Step Down</a>");
		   $('#stepDown').hover(function() {
		    $('#getOff').fadeIn()
		   }, function() {
		    $('#getOff').fadeOut();
		   });	
		}
	});
	
	socket.on("user:likes", function(likedVideos) {
		app.get("userModel").get("likesCollection").reset(likedVideos);
	});
	
	socket.on("playlist:importFacebook", function() {
		app.get("userModel").importFacebook = true;
	});
	


  }

 }, {
  socket: socket_init,

  /* Outgoing Socket Events*/
  startApp: function(id, promocode) {
   SocketManagerModel.socket.emit("user:startApp", {fbId: id});
  },

	initializeProfile: function(user) {
		SocketManagerModel.socket.emit("user:initializeProfile", user);
	},
	
	sendUserFBFriends: function(friendIdList) {
		SocketManagerModel.socket.emit("user:sendUserFBFriends", friendIdList);
	},
	
	sendFBImportDate: function(data) {
		SocketManagerModel.socket.emit("user:sendFBImportDate", data);
	},

  sendMsg: function(data) {
   SocketManagerModel.socket.emit("message", data);
	 if (typeof(mpq) !== 'undefined') mpq.track("Chat", {
    chat_text: data.text,
    mp_note: "User chatted " + data.text
   });
  },

  becomeDJ: function() {
   var valplay = (SurfStreamApp.curDJ == "VAL" ? true : false);
   var numOnSofa = SurfStreamApp.sofaUsers.length;
   if (typeof(mpq) !== 'undefined') mpq.track("Sofa Join", {
    VAL_Playing: valplay,
    mp_note: "Stepped onto sofa (" + numOnSofa + " people on sofa, val playing: " + valplay + ")"
   });
   SocketManagerModel.socket.emit('dj:join');
  },

  stepDownFromDJ: function() {
   var valplay = (SurfStreamApp.curDJ == "VAL" ? true : false);
   var isdj = (SurfStreamApp.curDJ == SurfStreamApp.get("userModel").get("fbId"));
   var numOnSofa = SurfStreamApp.sofaUsers.length
   if (typeof(mpq) !== 'undefined') mpq.track("Sofa Leave", {
    VAL_playing: valplay,
    mid_play: isdj,
    mp_note: "Stepped off of sofa (" + numOnSofa + " people on sofa, val playing: " + valplay + ", midPlay: " + isdj + ")"
   });
   SocketManagerModel.socket.emit('dj:quit');
  },

  addVideoToPlaylist: function(playlistId, videoId, thumb, title, duration, viewCount, author, append) {
   SocketManagerModel.socket.emit('playlist:addVideo', {
    playlistId: playlistId,
    videoId: videoId,
    thumb: thumb,
    title: title,
    duration: duration,
		viewCount: viewCount,
    author: author,
    append: append
   });
  },

  voteUp: function(video) {
   if (typeof(mpq) !== 'undefined') mpq.track("Vote up", {
    mp_note: "Video was voted up"
   });
   SocketManagerModel.socket.emit('meter:upvote', video);
  },

  voteDown: function() {
   if (typeof(mpq) !== 'undefined') mpq.track("Vote down", {
    mp_note: "Video was voted down"
   });
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

  loadRoomsInfo: function(noDisplay) {
   SocketManagerModel.socket.emit('rooms:load', {
    id: window.SurfStreamApp.get("userModel").get("ssId")
   });
	 if (noDisplay) {
		SurfStreamApp.noDisplayPicker = true;
	 }
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

   $("#cur-video-info").css("max-width", 415 - $("#cur-room-name").css("width").replace("px", ''));

	//Hack to keep people stuck to rooms list on first load (need to re-show close now.)
	if (SurfStreamApp.closeRoomModalIsHidden) {
		$("#hideRoomsList").css({display: "block"});
		SurfStreamApp.closeRoomModalIsHidden = false;
	}

   $("#clock").hide();
   if (typeof(mpq) !== 'undefined') {
		mpq.register_once({room: roomName})
   }
   var payload = {
    rID: rID
   };
   if (create) {
    payload.create = true;
    payload.roomName = roomName;
   }
   if (SurfStreamApp.inRoom) {
    payload.currRoom = SurfStreamApp.inRoom;
   }
   SurfStreamApp.inRoom = rID;
	 SurfStreamApp.inRoomName = roomName;
   payload.fbId = window.SurfStreamApp.get("userModel").get("fbId");
   payload.ssId = window.SurfStreamApp.get("userModel").get("ssId");
   SurfStreamApp.get("roomModel").get("chatCollection").reset();
   $("#sofa-remote").css({
    left: "170px",
    top: "140px",
    "z-index": 1
   });
   $("#skipContainer").remove();
   window.SurfStreamApp.get("roomModel").updateDisplayedUsers([]);
   window.SurfStreamApp.get("roomModel").get("userCollection").reset();
   if (window.YTPlayer) {
    window.YTPlayer.stopVideo();
    //window.YTPlayer.loadVideoById(1); // hack because clearVideo FUCKING DOESNT WORK #3hourswasted
   }
   window.SurfStreamApp.get("roomModel").get("playerModel").set({
    curVid: null
   }); //dont calculate a room history cell on next vid announce
	console.log("joining room " + roomName);
   SocketManagerModel.socket.emit('room:join', payload);
   SocketManagerModel.socket.emit("val:requestRecs");
   SurfStreamApp.curDJ = "__none__";
  },

	updateAvatar: function() {
		SocketManagerModel.socket.emit('avatar:update', {avatar: SurfStreamApp.currentAvatarSettings, name: SurfStreamApp.get("userModel").get("displayName")});
	}

 });

 window.RaRouter = Backbone.Router.extend({
  routes: {
   ":rID": "joinRoom"
  },

  joinRoom: function(locationFragment) {
	  var trueURL = $.url(window.location);
		var rID = trueURL.segment(1);
		var params = trueURL.param();
		this.navigate(rID, false);
		if (rID != "") {
   		SocketManagerModel.joinRoom(rID, false, rID.replace(/-+/g, ' '));
			if (typeof(mpq) !== 'undefined') mpq.track("Room Joined", {
				mp_note: "Landed from web link into " + rID.replace(/-+/g, ' '),
				source: "Landing",
				roomName: rID.replace(/-+/g, ' ')
			 });
			if (params["ref"] == "nf") {
				if (typeof(mpq) !== 'undefined') mpq.track("Joined from a share", {
					mp_note: "Came from Facebook into " + rID.replace(/-+/g, ' '),
					roomName: rID.replace(/-+/g, ' ')
				 });
			}
			
  	} else {
			SocketManagerModel.loadRoomsInfo();
		}
	}
	
	
 });

 function hideSplash() {
	document.getElementById('frontdoor').style.display = 'none';
	document.getElementById('loadingScreen').style.display = 'none';
	document.getElementById('outer').style.display = 'block';
 }

 function showSplash() {
	document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('outer').style.display = 'none';
  document.getElementById('frontdoor').style.display = 'inline-block';
 }

 
 function showLoggedOut() {
	$("#outer").hide();
	$("#goodBye").show();
 }

 window.playerLoaded = false;

 var e = document.createElement('script');
 e.async = true;
 e.src = document.location.protocol + '//connect.facebook.net/en_US/all.js';
 document.getElementById('fb-root').appendChild(e);
});

function setSuggestions(suggestions) {
 var suggestionSource = _.pluck(suggestions[1], 0);
 window.SurfStreamApp.get("mainView").sideBarView.videoManagerView.browseVideosView.searchView.suggestionHash[suggestions[0]] = suggestionSource;
 $("#youtubeInput").autocomplete("option", "source", suggestionSource);
};

function nextFDVideo() {
	console.log("next fd");
	var videoArray = {
		"videos": [
			{
				"videoId": "bzE-IMaegzQ",
				"startTime": 77
			},
			{
				"videoId": "-BrDlrytgm8",
				"startTime": 30
			},
			{
				"videoId": "lI7H7ForuwA",
				"startTime": 75
			},
			{
				"videoId": "Z7vXP3tHzhA",
				"startTime": 4
			},
			{
				"videoId": "wC6DuckeJUM",
				"startTime": 24
			},
			{
				"videoId": "ess9bRJ0bPw",
				"startTime": 7
			},
			{
				"videoId": "L64c5vT3NBw",
				"startTime": 37
			},
			{
				"videoId": "AEPvSo8bE2I",
				"startTime": 2
			},
			{
				"videoId": "zE0IzAsIVWk",
				"startTime": 560
			},
			{
				"videoId": "CwmtkFPYXsg",
				"startTime": 30
			},
			{
				"videoId": "k8w-qZEiNsY",
				"startTime": 38
			},
			{
				"videoId": "n9APqLA2YKs",
				"startTime": 3
			},
			{
				"videoId": "PQMJCOT2wlQ",
				"startTime": 55
			},
			{
				"videoId": "Xe0gIFxYhrk",
				"startTime": 30
			},
			{
				"videoId": "_8yGGtVKrD8",
				"startTime": 230
			},
			{
				"videoId": "p3tZPH5my-0",
				"startTime": 47
			},
			{
				"videoId": "Vw4KVoEVcr0",
				"startTime": 28
			},
			{
				"videoId": "quwebVjAEJA",
				"startTime": 42
			},
			{
				"videoId": "d6Vqp6UveIU",
				"startTime": 188
			},
			{
				"videoId": "JnCiTSzYHRM",
				"startTime": 20
			},
			{
				"videoId": "8WPtEGOp5rI",
				"startTime": 16
			},
			{
				"videoId": "kYSoy71ib7A",
				"startTime": 13
			},
			{
				"videoId": "NEmDHO9rLGY",
				"startTime": 0
			},
			{
				"videoId": "cFAGUAl8lxE",
				"startTime": 124
			},
			{
				"videoId": "6PKQE8FM2Uw",
				"startTime": 28
			},
			{
				"videoId": "XKcChGsDqnU",
				"startTime": 8
			},
			{
				"videoId": "o0oHlX8Kmxk",
				"startTime": 22
			},
			{
				"videoId": "miaAC3d4RDU",
				"startTime": 5
			},
			{
				"videoId": "JOl4vwhwkW8",
				"startTime": 60
			},
			{
				"videoId": "T36A-H8dPhI",
				"startTime": 80
			},
			{
				"videoId": "WEh0JoSki-Y",
				"startTime": 27
			},
			{
				"videoId": "RsnQxdPhskI",
				"startTime": 39
			},
			{
				"videoId": "l3m9kBzdA34",
				"startTime": 8
			},
			{
				"videoId": "dPLWKBWkn3s",
				"startTime": 108
			},
			{
				"videoId": "yoOwCSgvNs0",
				"startTime": 10
			},
			{
				"videoId": "JhlfT-x6Ys0",
				"startTime": 14
			},
			{
				"videoId": "vwy47ZzR780",
				"startTime": 4
			},
			{
				"videoId": "cMkimxS_swA",
				"startTime": 14
			},
			{
				"videoId": "YyqEjatCSe0", 
				"startTime": 10
			},
			{
				"videoId": "0-1D_MJzsNU",
				"startTime": 8
			},
			{
				"videoId": "U8vvhGixWQQ",
				"startTime": 18
			},
			{
				"videoId": "dTHWBSluUjU",
				"startTime": 85
			},
			{
				"videoId": "RgFVlkGw7XY",
				"startTime": 20
			},
			{
				"videoId": "uSEZ8cgGHgo",
				"startTime": 25
			},
			{
				"videoId": "j2odOu0Oguo",
				"startTime": 5
			},
			{
				"videoId": "XkclYFNBbpA",
				"startTime": 0
			},
			{
				"videoId": "YZEbBZ2IrXE",
				"startTime": 5
			}
		]
	};
	window.fdplayer = document.getElementById("YouTubePlayer-fd");
	console.log(window.ss_loopOrder);
	console.log(window.ss_loopIndex);
	window.fdplayer.loadVideoById(videoArray.videos[window.ss_loopOrder[window.ss_loopIndex]].videoId, videoArray.videos[window.ss_loopOrder[window.ss_loopIndex]].startTime);
	if(window.ss_loopIndex < videoArray.videos.length - 1){
		window.ss_loopIndex = window.ss_loopIndex + 1;
	} else {
		window.ss_loopIndex = 0;
	}
};

function fisherYates ( myArray ) {
  var i = myArray.length;
  if ( i == 0 ) return false;
  while ( --i ) {
     var j = Math.floor( Math.random() * ( i + 1 ) );
     var tempi = myArray[i];
     var tempj = myArray[j];
     myArray[i] = tempj;
     myArray[j] = tempi;
   }
};

function onYouTubePlayerReady(playerId) {
 if (playerId == "YouTubePlayerTwo") {
  window.YTPlayerTwo = document.getElementById('YouTubePlayerTwo');
  return;
 }

 if (playerId == "YouTubePlayer-fd") {
	 var numFdVideos = 46;
 	 window.fdplayer = document.getElementById("YouTubePlayer-fd");
	 window.ss_loopOrder = new Array(); 
	 for(var i = 0; i < numFdVideos + 1; i++){
	 	window.ss_loopOrder[i] = i;
	 }
	 fisherYates(window.ss_loopOrder);
	 window.ss_loopIndex = 0;
	 nextFDVideo();
	 window.ss_fdLoop = setInterval("nextFDVideo()", 14000);
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
 } else {
  window.YTPlayer.mute();
 }
}

function onytplayerStateChange(newState) {

}

function ss_formatSeconds(time) {
 var hours = null,
     minutes = null,
     seconds = null,
     result;
 time = Math.floor(time);
 hours = Math.floor(time / 3600);
 time = time - hours * 3600;
 minutes = Math.floor(time / 60);
 seconds = time - minutes * 60;
 result = "" + ((hours > 0) ? (hours + ":") : "") + ((minutes > 0) ? ((minutes < 10 && hours > 0) ? "0" + minutes + ":" : minutes + ":") : "0:") + ((seconds < 10) ? "0" + seconds : seconds);
 return result;
}

function ss_idToImg(id) {
 return "http://img.youtube.com/vi/" + id + "/0.jpg";
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
 if (window.YTPlayer) {
  $("#countdownFull").html(ss_formatSeconds(window.YTPlayer.getDuration() - window.YTPlayer.getCurrentTime()));
  if (window.YTPlayer.getDuration() - window.YTPlayer.getCurrentTime() != 0) {
   $("#cur-video-time").html(ss_formatSeconds(window.YTPlayer.getDuration() - window.YTPlayer.getCurrentTime()));
   $("#time-elapsed-bar").css({
    "width": 635 * (window.YTPlayer.getCurrentTime() / window.YTPlayer.getDuration()) + "px"
   });
  }
 }
}

function skipVideo() {
 $("#skipContainer").remove();
 socket_init.emit("video:skip");
}

var soundEmbed = null;

Object.size = function(obj) {
 var size = 0,
     key;
 for (key in obj) {
  if (obj.hasOwnProperty(key)) size++;
 }
 return size;
};

function strip(html) {
 var tmp = document.createElement("DIV");
 tmp.innerHTML = html;
 return tmp.textContent || tmp.innerText;
}


function ss_formatViews(n) {
 var s = "" + n,
     abs = Math.abs(n),
     _, i;

 if (abs >= 1000) {
  _ = ("" + abs).split(/\./);
  i = _[0].length % 3 || 3;

  _[0] = s.slice(0, i + (n < 0)) + _[0].slice(i).replace(/(\d{3})/g, ',$1');

  s = _.join('.');
 }

 return s;
}

ss_getPath = function(href) {
   var l = document.createElement("a");
   l.href = href;
   return l.pathname;
}


var queueId = 0;
var facebookPlaylistId = 1;
var userLoggedOut = false;

dummyView = Backbone.View.extend({})

ss_make = (new dummyView).make;
