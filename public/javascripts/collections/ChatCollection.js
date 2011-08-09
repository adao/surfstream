$(function(){
	window.ChatCollection = Backbone.Collection.extend({
		model: ChatMessageModel,
		
		defaults: {
			"clientId": 0
		},
		
		initialize: function () {
			
		}
	});
});