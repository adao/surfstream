window.fbAsyncInit = function() {
	FB.init({ appId: '103932176371457',
		status: true,
		cookie: true,
		xfbml: true,
		oauth: true});
		
	button = document.getElementById('fb-auth');
	button.onclick = function() {
		FB.login(function(response) {}, {scope:'email,status_update,publish_stream,read_stream,user_about_me,friends_online_presence,read_friendlists,offline_access,create_event'});
	};
	
	function proceed_to_site(response) {
		console.log(response);
		if (response.authResponse) {
			//user is already logged in and connected
			window.SurfStreamApp.get("userModel").set({fbId: response.authResponse.userID});
			SocketManagerModel.sendFBId(response.authResponse.userID);
			new RaRouter();
			Backbone.history.start({pushState: true});
			document.getElementById('frontdoor').style.display = 'none';
			document.getElementById('loadingScreen').style.display = 'none';
			document.getElementById('outer').style.display = 'block';
		} else if (response.session) {
			FB.logout(function(response){});
			document.getElementById('loadingScreen').style.display = 'none';
			document.getElementById('frontdoor').style.display = 'inline-block';
		} else {
			// yeah right
			document.getElementById('loadingScreen').style.display = 'none';
			document.getElementById('frontdoor').style.display = 'inline-block';
		}
	}
		
	// run once with current status and whenever the status changes
	FB.Event.subscribe('auth.authResponseChange', proceed_to_site);
	FB.Event.subscribe('auth.statusChange', proceed_to_site);
  document.getElementById('loadingScreen').style.display = 'none';
	document.getElementById('frontdoor').style.display = 'inline-block';
};

(function() {
	var e = document.createElement('script'); e.async = true;
	e.src = document.location.protocol + '//connect.facebook.net/en_US/all.js';
	document.getElementById('fb-root').appendChild(e);
	socket_init = io.connect();
	
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

	window.SurfStreamApp = new SurfStreamModel({
	  socket: socket_init
	 });
	console.log("started app");

}());

function login(response, info) {
	if (response.authResponse) {
		var accessToken = response.authResponse.accessToken;
		userInfo.innerHTML = '<img src="https://graph.facebook.com/' + info.id + '/picture">' + info.name
			+ "<br /> Your Access Token: " + accessToken;
		showLoader(false);
		document.getElementById('other').style.display = "block";
	}
}
		
function logout(response) {
	userInfo.innerHTML                             =   "";
	document.getElementById('debug').innerHTML     =   "";
	document.getElementById('other').style.display =   "none";
	showLoader(false);
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
	if (status)
		document.getElementById('loader').style.display = 'block';
	else
		document.getElementById('loader').style.display = 'none';}
