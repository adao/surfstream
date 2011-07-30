$(function(){
	
	/**************/
	/*** MODELS ***/
	/**************/
	
	window.ChatMessageModel = Backbone.Model.extend({
		
		
	});
	
	window.PlayerModel = Backbone.Model.extend{
		
	};
	
	
	window.RoomModel = Backbone.Model.extend({
		
		
	});
	
	window.SearchModelModel = Backbone.Model.extend{
		
	};
	
	window.SharingModel = Backbone.Model.extend({
		
	});
	
	
	window.UserModel = Backbone.Model.extend({
		
		
	});
	
	window.VideoModel = Backbone.Model.extend({
		
		
	});
	
	/************************/
	/**COLLECTIONS (LISTS)**/
	/***********************/
	
	window.ChatList = Backbone.Collection.extend({
		model: ChatMessage,
	});
	
	window.FriendList = Backbone.Collection.extend({
		model: User,
		
	});
	
	/*** BEGIN: PLAYLIST AND SUBCLASSES ***/
	
	window.Playlist = Backbone.Collection.extend({
		model: Video,
	});
	
	window.PersonalHistoryList = window.Playlist.extend({
		
	});
	
	
	window.RoomHistoryList = window.Playlist.extend({
		
	});
	
	window.SuggestionsList = window.Playlist.extend({
		
	});
	
	/*** END: PLAYLIST AND SUBCLASSES ***/
	
	
	window.RoomUsersList = Backbone.Collection.extend({
		model: User,
		
	});
	
	window.RoomList = Backbone.Collection.extend({
		model: Room,
	});

	
	
	/***************/
	/*****VIEWS*****/
	/***************/

	  window.TopBar = Backbone.View.extend({
		
		});
		
		window.RoomInfo = Backbone.View.extend({
		
		});
		
		window.ShareBar = Backbone.View.extend({
		
		});
		
		window.Tabs = Backbone.View.extend({
		
		});
		
		window.SearchBar = Backbone.View.extend({
		
		});
		
		window.VideoList = Backbone.View.extend({
		
		});
		
		window.VideoCell = Backbone.View.extend({
		
		});
		
		window.ChatList = Backbone.View.extend({
		
		});
		
		window.ChatCell = Backbone.View.extend({
		
		});
		
		window.Theatre = Backbone.View.extend({
		
		});
		
		window.Screen = Backbone.View.extend({
		
		});
		
		window.Remote = Backbone.View.extend({
		
		});
		
		window.Meter = Backbone.View.extend({
		
		});
		
		window.Avatar = Backbone.View.extend({
		
		});
		
		window.ProfilePage = Backbone.View.extend({
		
		});
		
		window.SettingsView = Backbone.View.extend({
		
		});
		

});