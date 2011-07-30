function setupRoutes(app) {
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
	    res.redirect('/index');
	  }
	  else {
	    res.render('login', {locals: { title: "surfstream.tv"}});
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
    
    app.get('/chat', function(req, res){
	    res.render('chat', { locals: {title: "surfstream.tv"}});
    });

		app.get('/chatcell', function(req, res){
	    res.render('chatcell', { locals: {title: "surfstream.tv"}});
    });

		app.get('/history', function(req, res){
	    res.render('history', { locals: {title: "surfstream.tv"}});
    });

		app.get('/sidebar', function(req, res){
	    res.render('sidebar', { locals: {title: "surfstream.tv"}});
    });
}

exports.setupRoutes = setupRoutes;