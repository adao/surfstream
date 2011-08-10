$(function(){
	window.UserModel = Backbone.Model.extend({
		//has fbInfo, avatarImage
		defaults: {
			is_main_user: false			
		}, 
	
		initialize: function () {
			if (this.get("is_main_user")) {
				FB.api('/me', this.setUserData);
				FB.api('/me/friends', function(response) {
					console.log(response);
				});
			}
		},
		
		getUserData: function(self) {
			if (this.get("fbUserInfo")){
				return this.get("fbUserInfo");
			}
		},
		
		setUserData: function(info) {
			window.SurfStreamApp.get('userModel').set({fbInfo: info, avatarImage: 'https://graph.facebook.com/' + info.id + '/picture'});
			window.SurfStreamApp.get('userModel').get("socketManagerModel").makeFirstContact({user: info});
		}
		
	});
});