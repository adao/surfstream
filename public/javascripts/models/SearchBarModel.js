$(function(){
	window.SearchBarModel = Backbone.Model.extend({
		
		executeSearch : function(searchQuery) {
			this.set({searchTerm: searchQuery});
			$.ajax({
				url:"http://gdata.youtube.com/feeds/api/videos?max-results=10&format=5&alt=json&q=" + searchQuery,
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
});