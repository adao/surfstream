/**
 * Module dependencies.
 */

var _ = require('underscore')._,
	Backbone = require('backbone'),
	url = require('url'),
	redis = require('redis'),
	redisClient = redis.createClient();
	
var	models = require('./models/237');

for (var i = 1; i < 166; i++) {
	var queue = new models.Playlist({name: "My Queue", videos: new models.VideoCollection()});
	redisClient.hset("user:" + i + ":playlists", 0, JSON.stringify(queue), function(err, reply) {
		if (err) console.log("FUUUU!")
	})
}

console.log("DONE!")