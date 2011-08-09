$(function(){
	window.ChatCellView = Backbone.View.extend({
		
		chatCellTemplate: _.template($('#chatcell-template').html()),
		
		className: "messageContainer",
		initialize: function () {
			$("#messages").append(this.render().el);
		},
		
		render: function() {
			$(this.el).html(this.chatCellTemplate({username: this.options.username, msg: this.options.msg }));
			return this;
		}
	});
	
	window.RoomInfoView = Backbone.View.extend({
		el: '#roomInfo',
		
		roomInfoTemplate: _.template($('#room-info-template').html()),
		
		initialize: function () {
			$(this.el).html(this.roomInfoTemplate({roomName: this.options.roomName}));
		}
	});
});