$(document).ready(function() {
	window.addEventListener("paste",pasteHander,false);
	function pasteHander(e){
		var items = e.clipboardData.items;
      	if (items){
      		for (var i = 0; i < items.length; i++) {
	          if (items[i].type.indexOf("image") !== -1) {
	            // We need to represent the image as a file,
	            var blob = items[i].getAsFile();
	            var reader = new FileReader();
	        	reader.readAsDataURL(blob);
	        	var imgobj=new Image(blob);
	        	reader.onload = function(e){
	                var binaryString = this.result;
	                imgobj.src=binaryString;
	                var imgwidth=imgobj.width,imgheight=imgobj.height;
	                console.log(imgwidth)
	                if(imgobj.width>600){
	                	imgobj.height=600/imgwidth*imgheight;
	                	imgobj.width=600;
	                };
	                $("#input_content").append(imgobj);
	                return;
	            }
	            // and use a URL or webkitURL (whichever is available to the browser)
	            // to create a temporary URL to the object
	            // var URLObj = window.URL || window.webkitURL;
	            // var source = URLObj.createObjectURL(blob);

	            // // The URL can then be used as the source of an image
	            // $("#input_content").append(createImage(source));
	            // return;
	          }
	        }
      	}
	}

	function createImage(source) {
	    var pastedImage = new Image();
	    // pastedImage.onload = function() {
	    //   createPanel();
	    // }
	    pastedImage.src = source;
	    var imgwidth=pastedImage.width,imgheight=pastedImage.height;
	    console.log(imgwidth);
        if(imgwidth>600){
        	console.log("aaa")
        	pastedImage.height=600/imgwidth*imgheight;
        	pastedImage.width=600;
        };
	    return pastedImage;
	  }


	$(window).keydown(function(e) {
		if (e.keyCode == 116) {
			if (!confirm("刷新将会清除所有聊天记录，确定要刷新么？")) {
				e.preventDefault();
			}
		}

		if(e.keyCode == 13){
			sendMessage();
		};
	});
	var oldtime=new Date().getTime();

	var socket = io.connect();

	var from = $.cookie('user');
	//从 cookie 中读取用户名，存于变量 from
	var to = 'all';
	//设置默认接收对象为"所有人"
	//发送用户上线信号
	socket.emit('online', {
		user : from
	});

	socket.on('online', function(data) {
		//显示系统消息
		if (data.user != from) {
			var sys = '<div style="color:#f00">系统(' + now() + '):' + '用户 ' + data.user + ' 上线了！</div>';
		} else {
			var sys = '<div style="color:#f00">系统(' + now() + '):你进入了聊天室！</div>';
		}
		$("#contents").append(sys + "<br/>");
		//刷新用户在线列表
		flushUsers(data.users);
		//显示正在对谁说话
		showSayTo();
		fixedScroll();
	});

	socket.on('say', function(data) {
		//对所有人说
		if (data.to == 'all') {
			$("#contents").append('<div>' + data.from + '(' + now() + ')对 所有人 说：<br/>' + data.msg + '</div><br />');
		}
		//对你密语
		if (data.to == from) {
			$("#contents").append('<div style="color:#00f" >' + data.from + '(' + now() + ')对 你 说：<br/>' + data.msg + '</div><br />');
		}
		fixedScroll();
	});

	socket.on('offline', function(data) {
		//显示系统消息
		var sys = '<div style="color:#f00">系统(' + now() + '):' + '用户 ' + data.user + ' 下线了！</div>';
		$("#contents").append(sys + "<br/>");
		//刷新用户在线列表
		flushUsers(data.users);
		//如果正对某人聊天，该人却下线了
		if (data.user == to) {
			to = "all";
		}
		//显示正在对谁说话
		showSayTo();
		fixedScroll();
	});

	//服务器关闭
	socket.on('disconnect', function() {
		var sys = '<div style="color:#f00">系统:连接服务器失败！</div>';
		$("#contents").append(sys + "<br/>");
		$("#list").empty();
	});

	//重新启动服务器
	socket.on('reconnect', function() {
		var sys = '<div style="color:#f00">系统:重新连接服务器！</div>';
		$("#contents").append(sys + "<br/>");
		socket.emit('online', {
			user : from
		});
		fixedScroll();
	});

	socket.on('busyerror',function(data){
		if(data){
			$("#toolbar").text("禁止刷屏");
		}
	})

	//刷新用户在线列表
	function flushUsers(users) {
		//清空之前用户列表，添加 "所有人" 选项并默认为灰色选中效果
		$("#list").empty().append('<li title="双击聊天" alt="all" class="sayingto" onselectstart="return false">所有人</li>');
		//遍历生成用户在线列表
		for (var i in users) {
			$("#list").append('<li alt="' + i + '" title="双击聊天" onselectstart="return false">' + i+"("+users[i]+")" + '</li>');
		}
		//双击对某人聊天
		$("#list > li").dblclick(function() {
			//如果不是双击的自己的名字
			if ($(this).attr('alt') != from) {
				//设置被双击的用户为说话对象
				to = $(this).attr('alt');
				//清除之前的选中效果
				$("#list > li").removeClass('sayingto');
				//给被双击的用户添加选中效果
				$(this).addClass('sayingto');
				//刷新正在对谁说话
				showSayTo();
			}
		});
	}

	//显示正在对谁说话
	function showSayTo() {
		$("#from").html(from);
		$("#to").html(to == "all" ? "所有人" : to);
	}

	//获取当前时间
	function now() {
		var date = new Date();
		var time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + (date.getMinutes() < 10 ? ('0' + date.getMinutes()) : date.getMinutes()) + ":" + (date.getSeconds() < 10 ? ('0' + date.getSeconds()) : date.getSeconds());
		return time;
	}

	//修改滚动条
	function fixedScroll(){
		$("#contents").scrollTop($("#contents")[0].scrollHeight);
	}

	//发话
	$("#say").click(sendMessage);

	function sendMessage() {
		//获取要发送的信息
		nowtime=new Date().getTime();
		if(nowtime-oldtime<1000){
			$("#toolbar").text("禁止刷屏");
			return;
		}else if($("#toolbar").text()){
			$("#toolbar").text("");
		}

		oldtime=nowtime;
		var $msg = $("#input_content").html();
		var files = $("#file")[0].files;
		if(files.length){
			var reader = new FileReader();
        	reader.readAsDataURL(files[0]);
        	var imgobj=new Image(files[0]);
     	
        	reader.onload = function(e){
                var binaryString = this.result;
                imgobj.src=binaryString;
                var imgwidth=imgobj.width,imgheight=imgobj.height;
                if(imgobj.width>600){
                	imgheight=600/imgwidth*imgheight;
                	imgwidth=600;
                };
                // andle UTF-16 file dump
                socket.emit('say', {
					from : from,
					to : to,
					pic: binaryString,
					picwidth:imgwidth,
					picheight:imgheight,
					msg: $msg
				});

                if (to == "all") {
					$("#contents").append('<div>你(' + now() + ')对 所有人 说：<br/> <img src="' + binaryString + '"  width='+imgwidth+' height='+imgheight+' alt=""/>'+$msg+'</div><br />');
				} else {
					$("#contents").append('<div style="color:#00f" >你(' + now() + ')对 ' + to + ' 说：<br/> <img src="' + binaryString + '" alt=""/>'+$msg+'</div><br />');
				}
				fixedScroll();
            }
            $("#file").val("");
		}else{
			if ($msg.trim() == ""){
				$("#toolbar").text("请输入内容！！");
				return;
			}
			//把发送的信息先添加到自己的浏览器 DOM 中
			if (to == "all") {
				$("#contents").append('<div>你(' + now() + ')对 所有人 说：<br/>' + $msg + '</div><br />');
			} else {
				$("#contents").append('<div style="color:#00f" >你(' + now() + ')对 ' + to + ' 说：<br/>' + $msg + '</div><br />');
			}
			//发送发话信息
			socket.emit('say', {
				from : from,
				to : to,
				msg : $msg
			});
		}
		//清空输入框并获得焦点
		$("#input_content").html("").focus();
		fixedScroll();
	}

});

