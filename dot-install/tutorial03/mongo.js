var MongoClient = require("mongodb").MongoClient,
	settings = require("./settings");
MongoClient.connect("mongodb://" + settings.host + "/" + settings.db, function(err,db){
	if(err){ return console.dir(err); }
	console.log("connected to db");
});