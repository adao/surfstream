$(function(){
	window.SearchView = Backbone.View.extend({
		//has searchBarModel
		
		searchViewTemplate: _.template($('#searchView-template').html()),
		
		id: "search-view",
		
		initialize: function () {
			this.render();
			this.previewPlayerView = new PreviewPlayerView();
			//Hack because of nested view bindings (events get eaten by Sidebar)
			var input = $("#searchBar .inputBox")
			input.bind("submit", {searchView: this }, this.searchVideos);
			this.options.searchBarModel.get("searchResultsCollection").bind("add", this.updateResults, this);	
		},
		
		
		render: function() {
			$(".videoView").append($(this.el).html(this.searchViewTemplate()));
			return this;
		},
		
		hide : function() {
			$("#search-view").hide();
		},
		
		show : function() {
			$("#search-view").show();
		},
		
		searchVideos : function(event) {
			event.preventDefault();
			var query = $($('input[name=search]')[0]).val();
			$("#searchContainer").empty();
			event.data.searchView.options.searchBarModel.executeSearch(query);
			return false;
		},
		
		updateResults : function (model, collection) {
				new SearchCellView({video: model, playlistCollection: this.options.playlistCollection})						
		}
	});
});