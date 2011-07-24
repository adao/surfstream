var socket, ytplayer, currVideo = {}, djInfo, me;

var playerLoaded = false;

function configureDJButtons() {
	$('#beDJ').show();
	$('#quitDJ').hide();
}

$(document).ready(function () {
  $('#fbData').hide();
	$clientCounter = $("#client_count")
	$video = $("#video")
	$time = $("#time")
	
	configureDJButtons();
 	var videoLoaded = false;
 	
	socket = io.connect();
	window.app = NodeChatController.init(socket);
	socket.emit('getUserData', JSON.parse($('#fbData').text()));
	$('#fbData').remove();
	
	socket.on('clientInfo', function(info) {
		console.log("Received client info: "+JSON.stringify(info));
		me = info;
	});
	
	socket.on('djInfo', function(data) {
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
	
	socket.on('videoInfo', function(data) {
		
		console.log("Socket received video info");
		currVideo.video = data.video;
		currVideo.timeStart = data.time;
		
		if(playerLoaded) {
			ytplayer.loadVideoById(currVideo.video, currVideo.time);
		} else {
			var params = { allowScriptAccess: "always" };
			var atts = { id: "myytplayer"};
			swfobject.embedSWF("http://www.youtube.com/apiplayer?&enablejsapi=1&playerapiid=ytplayer",
		                       "videoPlayer", "640", "390", "8", null, null, params, atts);
			playerLoaded = true;
		}
	}); 
	
	socket.on('clientUpdate', function(numClients) {
		console.log("client has been updated: "+numClients);
		//$clientCounter.html(numClients);
	});
	
	socket.on('refreshPlaylist', function(data) {
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
	})
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
	socket.emit('addVideoToQueue', { video: videoToAdd });
}

function searchYouTube() {
  var query = $('#searchBox').val();
  console.log("just searched for video: ");
  console.log(query);
  $.get("http://gdata.youtube.com/feeds/api/videos?max-results=5&alt=json&q=" + query, showMyVideos); 
}

function getRelatedVideos() {
  
}

function showMyVideos(data) {
  var feed = data.feed;
  var entries = feed.entry || [];
  var html = ['<ul class="videos">'];
  var template = $('.videoResultTemplate');
  var $list = $('#videoList');
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var $item = template.clone().removeClass('videoResultTemplate');
    console.log("in for statement3");
    /*var videoResult = new VideoResult({
      root: $item,
      title: entry.title.$t,
      image_src: entry.media$group.media$thumbnail[0].url,
      videoUrl: entry.id.$t
    })*/
    $item.find('#videoTitle').text(entry.title.$t);
    $item.find('#videoThumbnail').attr({
      src: entry.media$group.media$thumbnail[0].url,
      alt: 'Video blah'
    });
    $item.find('#addToPlaylist').text(entry.id.$t.substring(42));
    $item.find('#addToPlaylist').bind('click', function (event) {
      console.log(this.innerHTML);
    });
    console.log("in for statement4");
    $list.append($item);
    console.log("in for statement5");
  }
}

function becomeDJ() {
	console.log("user "+me.user.id+ " aka "+me.user.name+ " wants to become a DJ");
	if(djInfo.length < 4) {
		console.log("requesting that user becomes a dj");
		socket.emit('becomeDJ');
	}
}

function quitDJ() {
	if(djInfo.indexOf(me.socketId) < 0) return;
	configureDJButtons();
	console.log('Quitting DJ');
	socket.emit('quitDJ');
}