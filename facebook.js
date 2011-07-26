var auth = require('connect-auth');

function connect(app, express, onUserConnect) {

	app.configure('development', function(){
	  app.use(auth( [
	    auth.Facebook({appId : "103932176371457", appSecret: "cc1d3df71633447c7e826171ca12e15d", scope: 'email', callback: "http://127.0.0.1:3000/auth/facebook", failedUri: '/noauth' })
	  ]) );
	});
	
	app.configure('production', function(){
	  app.use(auth( [
	    auth.Facebook({appId : "163744730365918", appSecret: "800d0250ad831871403fabc3898d23a4", scope: 'email', callback: "http://ec2-75-101-218-155.compute-1.amazonaws.com/auth/facebook", failedUri: '/noauth' })
	  ]) );
	});
}

exports.connect = connect;