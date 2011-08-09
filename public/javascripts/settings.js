$(function(){
    _.templateSettings = {
		  interpolate : /\{\{(.+?)\}\}/g
		};
		
		ZeroClipboard.setMoviePath('/swf/ZeroClipboard.swf');
		
		socket_init = io.connect();
});