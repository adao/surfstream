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
		res.render('skeleton', {locals: { title: "surfstream.tv"}});
	});
	
	app.get('/index', function(req, res) {
		res.render('skeleton', { locals: { title: "surfstream.tv"}});
	});
	
	app.get('/room/:rID', function(req, res) {
		res.render('skeleton', { locals: { title: "surfstream.tv"}});
	});
    
    app.get('/chat', function(req, res){
	    res.render('chat', { locals: {title: "surfstream.tv"}});
    });

		app.get('/chatcell', function(req, res){
	    res.render('chatcell', { locals: {title: "surfstream.tv"}});
    });

		app.get('/history', function(req, res){
	    res.render('historycell', { locals: {title: "surfstream.tv"}});
    });

		app.get('/sidebar', function(req, res){
	    res.render('sidebar', { locals: {title: "surfstream.tv"}});
    });

		app.get('/myplaylist', function(req, res){
	    res.render('myplaylist', { locals: {title: "surfstream.tv"}});
    });

		app.get('/playlistcell', function(req, res){
	    res.render('playlistcell', { locals: {title: "surfstream.tv"}});
    });

		app.get('/roominfo', function(req, res){
	    res.render('roominfo', { locals: {title: "surfstream.tv"}});
    });

		app.get('/share', function(req, res){
	    res.render('share', { locals: {title: "surfstream.tv"}});
    });

		app.get('/roomlist', function(req, res){
	    res.render('roomlist', { locals: {title: "surfstream.tv"}});
    });

		app.get('/topvideocell', function(req, res){
	    res.render('topvideocell', { locals: {title: "surfstream.tv"}});
    });

		app.get('/nowplaying', function(req, res){
	    res.render('nowplaying', { locals: {title: "surfstream.tv"}});
    });
}

exports.setupRoutes = setupRoutes;