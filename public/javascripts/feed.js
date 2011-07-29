var socket, ytplayer, currVideo = {}, djInfo, me;

var playerLoaded = false;

function configureDJButtons() {
	$('#beDJ').show();
	$('#quitDJ').hide();
}

function sendClientInfo(socket) {
	//eventually will need to replace this hack by getting the FB info directly from facebook
	me = JSON.parse($('#fbData').text());
	socket.emit('user:sendFBData', me);
	$('#fbData').remove();
}

$(document).ready(function () {
  $('#fbData').hide();
	$clientCounter = $("#client_count")
	$video = $("#video")
	$time = $("#time")
	
	configureDJButtons();
 	var videoLoaded = false;
 	
	socket = io.connect();
	sendClientInfo(socket);
	 
	window.app = NodeChatController.init(socket);
	window.playlist = PlaylistController.init(socket, $('#playlist'));
	
	socket.on('dj:announceDJs', function(data) {
		me['socketId'] = socket.socket.sessionid;
		console.log("socket id: "+me['socketId']);
		
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
	
	socket.on('video:sendInfo', function(data) {
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
});

function onYouTubePlayerReady(playerId) {
    ytplayer = document.getElementById('myytplayer');
		ytplayer.loadVideoById(currVideo.video, currVideo.timeStart);
    ytplayer.addEventListener('onStateChange', 'onytplayerStateChange');
}

function onytplayerStateChange(newState) {
	$('#state').html("Player state: "+newState);
	if(newState == 0 && currVideo.isLeader) { 
		console.log("Video finished, broadcasting back to server");
		socket.emit('videoFinished');
		currVideo = {};
	}
}

function addVideo() {
	console.log("adding video to queue");
	var videoToAdd = $('#videoEntry').val();
	window.playlist.addVideo(videoToAdd);
}

function searchYouTube() {
  var query = $('#searchBox').val();
  console.log("just searched for video: ");
  console.log(query);
  $.get("http://gdata.youtube.com/feeds/api/videos?max-results=5&alt=json&q=" + query, showMyVideos); 
}

function showMyVideos(data) {
  var feed = data.feed;
  var entries = feed.entry || [];
  var html = ['<ul class="videos">'];
  var template = $('.videoResultTemplate');
  var $list = $('#videoList');
	$list.empty();
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var $item = template.clone().removeClass('videoResultTemplate');
   
    $item.find('#videoTitle').text(entry.title.$t);
    $item.find('#videoThumbnail').attr({
      src: entry.media$group.media$thumbnail[0].url,
      alt: 'Video blah'
    });
    $item.find('#addToPlaylist').text(entry.id.$t.substring(42));
    $item.find('#addToPlaylist').bind('click', function (event) {
      console.log(this.innerHTML);
    });
    $list.append($item);
  }
}

function becomeDJ() {
	console.log("user "+me.user.id+ " aka "+me.user.name+ " wants to become a DJ");
	if(djInfo.length < 4) {
		console.log("requesting that user becomes a dj");
		socket.emit('dj:join');
		$('#beDJ').hide();
		$('#quitDJ').show()
	}
}

function quitDJ() {
	if(djInfo.indexOf(me.socketId) < 0) return;
	configureDJButtons();
	console.log('Quitting DJ');
	socket.emit('dj:quit');
}