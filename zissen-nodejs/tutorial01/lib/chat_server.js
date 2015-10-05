var socket = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = "";
var namesUsed = [];
var currentRoom = "";

exports.listen = function(server){
	io = socket.listen(server);		//Socket.IOサーバーを始動し既存のHTTPサーバーに相乗りさせる
	io.set('log level', 1);
	io.sockets.on('connection', function(socket){	//各ユーザー接続の処理方法を定義
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);	//ユーザーの接続時にゲスト名を割り当てる
		joinRoom(socket, 'Lobby');	//接続したユーザーをLobbyにいれる

		//ユーザーのメッセージ、名前変更とルーム作成/変更の要求を処理する
		handleMessageBroadcasting(socket, nickNames);
		handleNameChangeAttempts(socket, nickNames, namesUsed);
		handleRoomJoining(socket);

		//ユーザーの要求に応じて、使用されているルームのリストを提供
		socket.on('rooms', function(){
			socket.emit('rooms', io.sockets.manager.rooms);
		});

		//ユーザーが接続を断った時のためにクリーンアップロジックを定義する
		handleClientDisconnection(socket, nickNames, namesUsed);
	});
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed){
	var name = 'Guest' + guestNumber;	//新規のゲスト名を生成する

	nickNames[socket.id] = name;	//ゲスト名にクライアントの接続IDを関連づける

	socket.emit('nameResult',{
		success: true,
		name: name
	});
	namesUsed.push(name);	//このゲスト名を使ったことを記録する

	return guestNumber + 1;	//ゲスト名の生成に使うカウンタをインクリメント
}

function joinRoom(socket, room){
	socket.join(room);	//ユーザーをルームに参加させる

	currentRoom[socket.id] = room;	//ユーザーがこのルームに参加したことを記録する

	socket.emit('joinResult',{room: room}); 	//ユーザーが新しいルームに入ったことを知らせる

	//ルームにいる他のユーザーに、このユーザーが入室したことを知らせる
	socket.broadcast.to(room).emit('message',{
		text: nickNames[socket.id] + ' has joined ' + room + '.'
	});

	var usersInRoom = io.sockets.clients(room);	//同じルームに、他に誰がいるかの判定

	if(usersInRoom.length > 1){		//もし他にユーザーがいたら、その概要を作る
		var usersInRoomSummary = 'Users currently in ' + room + ': ';
		for(var index in usersInRoom){
			var userSocketId = usersInRoom[index].id;
			if(userSocketId != socket.id){
				if(index > 0){
					usersInRoomSummary += ', ';
				}
				usersInRoomSummary += nickNames[userSocketId];
			}
		}

		usersInRoomSummary += '.';
		socket.emit('message',{text:usersInRoomSummary});	//同じ部屋にいる他のユーザーの概要を、このユーザーに送る
	}
}

function handleNameChangeAttempts(socket, nickNames, namesUsed){
	socket.on('nameAttempts', function(name){	//nameAttemptsイベントのリスナを追加する
		if(name.indexOf('Guest' == 0)){	//Guestで始まるニックネームは許可しない
			socket.emit('nameResult',{
				success: false,
				message: 'Names cannot begin with "Guest".'
			});
		}else{
			if(namesUsed.indexOf(name) == -1){	//もし名前が未登録ならば、登録する
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];	//他のクライアントが使えるように以前の名前を削除する

				socket.emit('nameResult',{
					success: true,
					name: name
				});

				socket.broadcast.to(currentRoom[socket.id]).emit('message',{
					text: previousName + ' is now known as ' + name + '.'
				});
			}else{
				socket.emit('nameResult', {	//名前が登録済みなら、ユーザーにエラーを送信
					success: false,
					message: 'That name is already in use.'	//「その名前はもうつかわれています」
				});
			}
		}
	});
}

function handleMessageBroadcasting(socket){
	socket.on('message', function(message){
		socket.broadcast.to(message.room).emit('message',{
			text: nickNames[socket.id] + ':' + message.text
		});
	});
}

function handleRoomJoining(socket){
	socket.on('join', function(room){
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});
}

function handleClientDisconnection(socket){
	socket.on('disconnect', function(){
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}

