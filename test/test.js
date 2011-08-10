var assert = require('assert'),
io = require('socket.io').listen(app),
redis = require('redis'),
redisClient = redis.createClient(),
m = require('../models/models2');

exports['testRun1'] = function(){
	  var currRoom = new m.Room();
    
};