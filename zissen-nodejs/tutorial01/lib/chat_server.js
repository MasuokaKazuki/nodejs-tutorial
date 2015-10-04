var soketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = ;
var namesUsed = [];
var currentRoom = ;

exports.listen = function(server){
	io = socket.listen(server);		//Socket.IOサーバーを始動し既存のHTTPサーバーに相乗りさせる
	io.set('log level', 1);
	io.socket.on
}