$(function(){
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
});