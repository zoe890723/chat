/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var fs = require('fs');
var app = express();

// all environments
app.set('port', process.env.PORT || 2900);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon(path.join(__dirname, 'public/images/favicon.ico')));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

//存储在线用户列表的对象
var users = {};

//存储socket列表
var socketList = [];

app.get('/', function(req, res) {
	if (req.cookies.user == null) {
		res.redirect('/signin');
	} else {
		res.sendfile('views/index.html');
	}
});
app.get('/signin', function(req, res) {
	res.sendfile('views/signin.html');
});
app.post('/signin', function(req, res) {
	if (users[req.body.name]) {
		//存在，则不允许登陆
		res.redirect('/signin');
	} else {
		//不存在，把用户名存入 cookie 并跳转到主页
		res.cookie("user", req.body.name, {
			maxAge : 1000 * 60 * 60 * 24 * 30
		});
		res.redirect('/');
	}
});

var server = http.createServer(app);
var io = require('socket.io').listen(server);
io.sockets.on('connection', function(socket) {
	//有人上线

	socket.on('online', function(data) {
		//将上线的用户名存储为 socket 对象的属性，以区分每个 socket 对象，方便后面使用
		socket.name = data.user;

		//users 对象中不存在该用户名则插入该用户名
		if (!users[data.user]) {
			// users[data.user] = data.user;
			users[data.user] = socket.request.connection.remoteAddress;
		}
		socketList.push(socket);
		// fs.writeFile("./test.txt",JSON.stringify(socket.request.connection));
		//向所有用户广播该用户上线信息
		io.sockets.emit('online', {
			users : users,
			user : data.user
		});
	});


	//有人发话
	socket.on('say', function(data) {
		var nowtime=new Date().getTime();	
		if(/^data:image.*base64/.test(data.pic)){
			data.msg="<img src='"+data.pic+"' height="+data.picheight+" width="+data.picwidth+" alt=''>"+data.msg;
		}
		if (data.to == 'all') {
			//向其他所有用户广播该用户发话信息	
			if(nowtime-socket.nowtime<1000){
				data.msg=socket.name+"正在刷屏，大家一起╭∩╮(︶︿︶）╭∩╮鄙视他，他的ip是："+socket.request.connection.remoteAddress;
				socket.emit('say',data);
			};
			socket.broadcast.emit('say', data);
			
		} else {
			//向特定用户发送该用户发话信息
			//clients 为存储所有连接对象的数组
			// var clients = io.sockets.clients();
			var clients = socketList;
			//遍历找到该用户
			clients.forEach(function(client) {

				if (client.name == data.to) {
					//触发该用户客户端的 say 事件
					client.emit('say', data);
				}
			});
		}
		socket.nowtime=nowtime;
	});

	//有人下线	
	socket.on('disconnect', function() {
		//若 users 对象中保存了该用户名
		if (users[socket.name]) {
			//从 users 对象中删除该用户名
			delete users[socket.name];
			//向其他所有用户广播该用户下线信息
			socket.broadcast.emit('offline', {
				users : users,
				user : socket.name
			});
		}
	});
});

server.listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'));
});
