(function () {
   var server = false, models;
   if (typeof exports !== 'undefined') {
       _ = require('underscore')._;
       Backbone = require('backbone');

       models = exports;
       server = true;
   } else {
       models = this.models = {};
   }

	models.Video = Backbone.Model.extend({
		defaults: {
			"videoId": null,
			"duration": 0,
			"timeStart": null,
			"timeoutId": null,
		},
	});
	
	models.VideoCollection = Backbone.Collection.extend({
		model: models.Video
	});

	//usage: var myPlaylist = new PlaylistModel();
	//			 myPlaylist.addVideoId(i2V_ZT-nyOs);
	models.PlaylistModel = Backbone.Model.extend({
		initialize: function() {
			this.videos = new models.VideoCollection();
		},

		addVideoId: function(id) {
			var vid = new models.Video();
			vid.id = id;
			vid.set({ videoId: id});
			this.videos.add(vid);
		},
		
		moveVideo: function(videoId, indexToMove) {
			var video = this.get(videoId);
			if(video) {
				this.videos.remove(video);
				this.videos.add(video, { at: indexToMove });
			}
		},
		
		//returns the first video id, and moves the video
		//to the end of the playlist 
		playFirstVideo: function() {
			if(this.videos.length == 0) {
				return null;
			}
			var first = this.videos.at(0);
			this.videos.remove(first);
			this.videos.add(first);	//adds video to the end;
			return first;
		},
		
		// xport: function() {
		// 			var videoArray = new Array();
		// 			this.each(function(video) {
		// 				videoArray.push(video.get('videoId'));
		// 			});
		// 			console.log("exporting playlist as string: "+JSON.stringify(videoArray));
		// 			return JSON.stringify(videoArray);
		// 		},
		// 		
		// 		mport: function(playlist) {
		// 			console.log("importing playlist: "+playlist);
		// 			var videoArray = JSON.parse(playlist);
		// 			var collection = this;
		// 			_.each(videoArray, function(videoId) {
		// 				collection.addVideoId(videoId);
		// 			})
		// 		}
		
	});
	
	//-----------

	models.User = Backbone.Model.extend({
		defaults: {
			
		}
	});

	//don't know if necessary....
	models.DJCollection = Backbone.Collection.extend({
		model: models.User
	});
	
	//-----------
	models.Room = Backbone.Model.extend({

	})

	//-----------
	
	models.ChatEntry = Backbone.Model.extend({});

	models.ClientCountModel = Backbone.Model.extend({
		defaults: {
			"clients": 0
		},
		
		updateClients: function(clients){
			this.set({clients: clients});
		}
	});

	models.NodeChatModel = Backbone.Model.extend({
		defaults: {
			"clientId": 0
		},

		initialize: function() {
			this.chats = new models.ChatCollection(); 
		}
	});

	models.ChatCollection = Backbone.Collection.extend({
	    model: models.ChatEntry
	});
	
	Backbone.Model.prototype.xport = function (opt) {
	    var result = {},
	    settings = _({recurse: true}).extend(opt || {});

	    function process(targetObj, source) {
	        targetObj.id = source.id || null;
	        targetObj.cid = source.cid || null;
	        targetObj.attrs = source.toJSON();
	        _.each(source, function (value, key) {
	        // since models store a reference to their collection
	        // we need to make sure we don't create a circular refrence
	            if (settings.recurse) {
	              if (key !== 'collection' && source[key] instanceof Backbone.Collection) {
	                targetObj.collections = targetObj.collections || {};
	                targetObj.collections[key] = {};
	                targetObj.collections[key].models = [];
	                targetObj.collections[key].id = source[key].id || null;
	                _.each(source[key].models, function (value, index) {
	                  process(targetObj.collections[key].models[index] = {}, value);
	                });
	              } else if (source[key] instanceof Backbone.Model) {
	                targetObj.models = targetObj.models || {};
	                process(targetObj.models[key] = {}, value);
	              }
	           }
	        });
	    }

	    process(result, this);

	    return JSON.stringify(result);
	};

	Backbone.Model.prototype.mport = function (data, silent) {
	    function process(targetObj, data) {
	        targetObj.id = data.id || null;
	        targetObj.set(data.attrs, {silent: silent});
	        // loop through each collection
	        if (data.collections) {
	          _.each(data.collections, function (collection, name) {
	            targetObj[name].id = collection.id;
	            _.each(collection.models, function (modelData, index) {
	              var newObj = targetObj[name]._add({}, {silent: silent});
	              process(newObj, modelData);
	            });
	          });
	        }

	        if (data.models) {
	            _.each(data.models, function (modelData, name) {
	                process(targetObj[name], modelData);
	            });
	        }
	    }

	    process(this, JSON.parse(data));

	    return this;
	};
})()
	 
		
