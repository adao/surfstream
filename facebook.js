var auth = require('connect-auth');

function connect(app, express, onUserConnect) {
	var cookieSecret = "dklfj83298fhds";     // enter a random hash for security
	
	app.configure(function(){
	  app.use(express.bodyParser());
	  app.use(express.methodOverride());
	  app.use(express.cookieParser());
	  app.use(express.session({secret: cookieSecret}));
	});

	app.configure('development', function(){
	  app.use(auth( [
	    auth.Facebook({appId : "103932176371457", appSecret: "cc1d3df71633447c7e826171ca12e15d", scope: 'email', callback: "http://localhost:3000/auth/facebook", failedUri: '/noauth' })
	  ]) );
	});
	
	app.configure('production', function(){
	  app.use(auth( [
	    auth.Facebook({appId : "163744730365918", appSecret: "800d0250ad831871403fabc3898d23a4", scope: 'email', callback: "http://ec2-75-101-218-155.compute-1.amazonaws.com/auth/facebook", failedUri: '/noauth' })
	  ]) );
	});
	
	app.get('/auth/facebook', function(req,res) {
	  req.authenticate('facebook', function(error, authenticated) { 
	    if(authenticated ) {
	      res.redirect('/index');
	    }
	    else {
	      res.end("<html><h1>Facebook authentication failed :( </h1></html>")
	    }
	   });
	});
	
	app.get('/', function(req, res){
	  if( req.isAuthenticated() ) {
	    res.end('<html>Hello Facebook User<br/>' + JSON.stringify( req.getAuthDetails() ) + '<br/><h1>' + '</h1></html>')
	  }
	  else {
	    res.send('<html>                                              \n\
	          <head>                                             \n\
	            <title>connect Auth -- Not Authenticated</title> \n\
	            <script src="http://static.ak.fbcdn.net/connect/en_US/core.js"></script> \n\
	          </head><body>                                             \n\
	            <div id="wrapper">                               \n\
	              <h1>Not authenticated</h1>                     \n\
	              <div class="fb_button" id="fb-login" style="float:left; background-position: left -188px">          \n\
	                <a href="/auth/facebook" class="fb_button_medium">        \n\
	                  <span id="fb_login_text" class="fb_button_text"> \n\
	                    Connect with Facebook                    \n\
	                  </span>                                    \n\
	                </a>                                         \n\
	              </div></body></html>');
	  }
	});
	
	app.get('/index', function(req, res) {
		if (req.isAuthenticated()) {
			console.log("received request, calling 'onUserConnect' for "+req.getAuthDetails().user.name);
			res.render('index', { locals: { data: JSON.stringify(req.getAuthDetails()), title: "surfstream.tv"}});
		} else {
			res.redirect('/');
		}
	});
}

exports.connect = connect;