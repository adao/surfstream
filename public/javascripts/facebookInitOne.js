window.fbAsyncInit = function() {
	FB.init({ appId: '103932176371457',
		status: true,
		cookie: true,
		xfbml: true,
		oauth: true});
		
	button = document.getElementById('fb-auth');
	button.onclick = function() {
		FB.login(function(response) {
				if (response.authRespnse) {
					window.location = '/index';
				}
			}, {scope:'email,status_update,publish_stream,read_stream,user_about_me,friends_online_presence'});
	};
	
	function proceed_to_site(response) {
		console.log(response);
		if (response.authResponse) {
			//user is already logged in and connected
			window.location = '/index';
			console.log("here1");
		} else if (response.session) {
			console.log("here2");
			FB.logout(function(response){});
		} else {
			console.log("here3");
			//yeah right
		}
	}
		
	// run once with current status and whenever the status changes
	//FB.getLoginStatus(proceed_to_site);
	FB.Event.subscribe('auth.statusChange', proceed_to_site);
};
(function() {
	var e = document.createElement('script'); e.async = true;
	e.src = document.location.protocol + '//connect.facebook.net/en_US/all.js';
	document.getElementById('fb-root').appendChild(e);
}());
