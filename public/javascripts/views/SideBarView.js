$(function(){
	window.SideBarView = Backbone.View.extend({
		el: '#sidebar',
		
		sidebarTemplate: _.template($('#sidebar-template').html()),
		
		events: {
      "click .search" : "activateSearch",
			"click .playlist" : "activatePlaylist"
    },

		initialize: function () {
			this.render();
			this.currentTab = "search";
			this.searchView = new SearchView({searchBarModel: this.options.searchBarModel, playlistCollection: this.options.playlistCollection});
			this.playlistView = new PlaylistView({playlistCollection: this.options.playlistCollection})
			this.playlistView.hide();
		},
		
		render: function() {
			$(this.el).html(this.sidebarTemplate());
			return this;
		},
		
		activatePlaylist : function() {
			if (this.currentTab == "playlist") return;
			this.currentTab = "playlist";
			this.$(".playlist").addClass("active");
			this.$(".search").removeClass("active");
			this.searchView.hide();
			this.playlistView.show();
		},
		
		activateSearch : function() {
			if (this.currentTab == "search") return;
			this.currentTab = "search";
			this.$(".search").addClass("active");
			this.$(".playlist").removeClass("active");
			this.playlistView.hide();
			this.searchView.show();
		}
		
		
	});
});