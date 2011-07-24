var NodeChatController = {
    init: function(socket) {
        this.socket = socket;
        var mysocket = this.socket;

        this.model = new models.NodeChatModel();
				console.log('created the model and view');
        this.view = new NodeChatView({model: this.model, socket: this.socket, el: $('#content')});
        var view = this.view;

        this.socket.on('message', function(msg) {view.msgReceived(msg)});
        this.view.render();

        return this;
    }
};
