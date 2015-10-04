var http = require('http');		//組み込みhttpモジュールは、HTTPのサーバー/クライアント機能を提供する

var fs = require('fs');			//組み込みfsモジュールはファイルシステム関連の機能を提供する
var path = require('path');		//組み込みpathモジュールは、ファイルシステムのパスに関する機能を提供する

var mime = require('mime');		//アドオンのmimeモジュールは、ファイルの拡張子に基づいてMIMEタイプを推論する機能を提供する

var cache = {};					//cacheオブジェクトには、ファイルの内容が格納される

//要求されたファイルが存在しないとき404エラーを送信
function send404(response){
	response.writeHead(404, {'Content-Type': 'text/plain'});
	response.write('Error 404: resource not found.');
	response.end();
}

//ファイルデータを提供する
function sendFile(response, filePath, fileContents){
	response.writeHead(
		200,
		{"content-type": mime.lookup(path.basename(filePath))}
	);
	response.end(fileContents);
}

//ファイルキャッシュの確認
function serverStatic(response, cache, absPath){
	if(cache[absPath]){	//ファイルはメモリにキャッシュされているか？
		sendFile(response, absPath, cache[absPath]);	//メモリからファイルを供給
	}else{
		fs.exists(absPath, function(exists){	//ファイルは存在するのか？
			if(exists){
				fs.readFile(absPath, function(err, data){
					if(err){
						send404(response);
					}else{
						cache[absPath] = data;
						sendFile(response, absPath, data);	//ディスクから読んだファイルを供給
					}
				});
			}else{
				send404(response);	//HTTP 404 応答を送信
			}
		});
	}
}

//HTTPサーバーを作成（無名関数でここの要求に対する振舞いを定義する）
var server = http.createServer(function(request, response){
	var filePath = false;
	if(request.url == '/'){
		filePath = 'public/index.html';		//デフォルトで供給するHTMLファイルの定義
	}else{
		filePath = 'public' + request.url;	//URLパスをファイルの相対パスに変換
	}
	var absPath = './' + filePath;
	serverStatic(response, cache, absPath);	//応答として静的ファイルを供給する
});

server.listen(3000, function(){
	console.log("Server listening on port 3000.");
});

var chatServer = require('./lib/chat_server');
chatServer.listen(server);
