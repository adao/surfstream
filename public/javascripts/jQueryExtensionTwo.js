jQuery.extend({
	getScript: function(url, callback) {
		var head = document.getElementsByTagName("head")[0];
		var ext = url.replace(/.*\.(\w+)$/, "$1");
		if(ext == 'js'){
			var script = document.createElement("script");
			script.src = url;
			script.type = 'text/javascript';
		} else if(ext == 'css'){
			var script = document.createElement("link");
			script.href = url;
			script.type = 'text/css';
			script.rel = 'stylesheet';
		} else {
			return false;
		}
	
	
		// Handle Script loading
		{
			var done = false;
			// Attach handlers for all browsers
			script.onload = script.onreadystatechange = function(){
	      if ( !done && (!this.readyState || this.readyState == "loaded" || this.readyState == "complete") ) {
	          done = true;
	          if (callback)
	          	callback();

	          // Handle memory leak in IE
	          script.onload = script.onreadystatechange = null;
	      }
	  	};
		}

	  head.appendChild(script);

	  // We handle everything using the script element injection
	  return undefined;

	}
});

