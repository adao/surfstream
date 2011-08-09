$(function(){
	window.ChatView = Backbone.View.extend({
		el: '#chat',
		
		chatTemplate: _.template($('#chat-template').html()),
	
		initialize: function () {
			this.render();
			this.options.chatCollection.bind("add", this.makeNewChatMsg, this);
			this.chatContainer = new AutoScroll({
				bottomThreshold: 215,
				scrollContainerId: 'messages'
			});
			
			console.log(this.chatContainer);
		},
		
		render: function() {
			$(this.el).html(this.chatTemplate());
			return this;
		},
		
		events: {
			"submit .inputBox" : "sendMessage"
		},

		sendMessage : function (event) {
			var userMessage = this.$('input[name=message]').val();
			this.$('input[name=message]').val('');
			SocketManagerModel.sendMsg({name: this.options.userModel.get("fbInfo").name, text:  userMessage, id: this.options.userModel.get("fbInfo").id });
			return false;
		},
		
		makeNewChatMsg: function (chat) {
			new ChatCellView({username: chat.get("username"), msg: chat.get("msg")});
			this.chatContainer.activeScroll();
		}
	}, {
		scrollToBottom: function() {
			this.chatContainer.activeScroll();
		}
	});
});