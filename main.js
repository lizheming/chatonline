/** 获取用户信息 **/
var user = (function() {
    /* {id:,uuid:,name:,url:,rank:} */
    var session = $('#session');
    if(session.length == 0) 
        return {name:'游客'};

    var user = $.parseJSON(session.attr('data-user'));
    user.uuid = user.url.split('/').slice(-1)[0];
    return user;
}());

/** 发送在线心跳并获取在线状态 **/
var server = "http://chatonline.sinaapp.com", community = 'segmentfault';
var heartBeat = function() {
    if(document.hidden) return false; /**如果用户不看的话就不用做发送啦**/
    $.getJSON(server+'/online.php?community='+community+'&uuid='+user.uuid, function(res) {
    	var onlineWord = "当前有"+res.online+"个用户在线";
    	$('#chatroom').length > 0 ? $('#chatroom .status').html(onlineWord) : setHtml.start(onlineWord);
    });
};
/** 定时发送心跳并获取最新消息 **/
setInterval("heartBeat()", 2000);

/** 打开关闭聊天窗口 **/
$(document).on('click', '.header', function(){
	$(this).parent().hasClass('active') ? setHtml.close() : setHtml.open();
})
/** 颜文字 **/
$(document).on('click', '#embutton', function() {
    var emlist = $(this).next();
    return emlist.hasClass('display') ? emlist.removeClass('display') : emlist.addClass('display');
});
$(document).on('click', '#emlist span', function() {
    var textarea = $('.textarea'), embutton = $('#embutton');
    textarea.val(textarea.val()+this.innerText);
    embutton.click();
    textarea[0].focus();
    textarea[0].selectionStart =textarea[0].selectionEnd = textarea.val().length;
});
/** 发送消息 **/
$(document).on('click', '#sendMessage', function() {
    user.text = $('.textarea').val();
    if(user.text == '') {
        alert('发送消息不能为空');
        return false;
    }
    $.ajax({
        url: server+'/p.php?community='+community,
        data: user,
        type: 'POST',
        beforeSend: function() {
            $('#sendmessage').html('正在发送消息...');
        },
        error: function() {
            $('#sendmessage').html('发送失败请重新发送!');
            setTimeout('$(\'#sendmessage\').html(\'\')', 1000);
        },
        success: function(time) {
            $('#sendmessage').html('发送成功!');
            setTimeout('$(\'#sendmessage\').html(\'\')', 1000);
            $('.textarea').val('');
        }
    })
})
/** 设置快捷键 **/
$(document).on('keydown', function(e) {

    /** 发送消息 **/
    if(e.ctrlKey && e.keyCode == '13')
        return $('#sendMessage').click();

    /** Tab支持 **/
    var textarea = $('.textarea');
    if(textarea.is(':focus') && e.keyCode == '9') {
        e.preventDefault();
        textarea = $('.textarea');
        textarea.val(textarea.val() + '    ');
        textarea.blur();
        textarea.focus();
    }

    /** 老板键 **/
    if(e.ctrlKey && e.keyCode == '38' && !$('#chatroom').hasClass('active')) setHtml.open();
    if(e.ctrlKey && e.keyCode == '40' && $('#chatroom').hasClass('active')) setHtml.close();
});
$(document).on('click', '#chatroom a', function(e) {
    window.open($(this).attr('href'));
    e.preventDefault();
})

/** 加载更多消息 **/
$(document).on('click', '#chatroom .more', function() {
    var more = $(this);
    $(this).remove();
    var chatlist = $('.chatlist'), scrollHeightBefore = chatlist[0].scrollHeight;
    setHtml.getRecent(function() {
        scrollHeightAfter = chatlist[0].scrollHeight;
        chatlist[0].scrollTop = scrollHeightAfter - scrollHeightBefore;
        chatlist.prepend(more);
    }, $('.chatlist >li:first-child').attr('data-time'), 40);
})
/** 粘贴上传图片 **/
document.body.addEventListener('paste', function(e) {
    var clipboard = e.clipboardData;
    for(var i=0,len=clipboard.items.length; i<len; i++) {
        if(clipboard.items[i].kind == 'file' || clipboard.items[i].type.indexOf('image') > -1) {
            var imageFile = clipboard.items[i].getAsFile();
            var form = new FormData;
            form.append('image', imageFile);
            $.ajax({
                url: server+"/u.php?community="+community,
                type: "POST",
                data: form,
                processData: false,
                contentType: false,
                beforeSend: function() {
                    $('#uploadmessage').html('正在上传图片...');
                },
                error: function() {
                    $('#uploadmessage').html('上传失败请重新上传!');
                    setTimeout('$(\'#uploadmessage\').html(\'\')', 1000);
                },
                success: function(url) {
                    $('#uploadmessage').html('图片上传成功');
                    setTimeout('$(\'#uploadmessage\').html(\'\')', 1000);
                    var textarea = $('.textarea');
                    textarea.val(textarea.val() + '[![]('+url+')]('+url+')')
                }
            })
            e.preventDefault();
        }
    }
})

setHtml = {
    start: function(onlineWord) {
        var chatroom = $('<div id="chatroom"><audio id="notification" src="http://chatonline.sinaapp.com/notification.wav" preload /></div>'), 
            header = $('<div class="header"></div>'),
            onlineStatus = $('<div class="status"></div>'),
            onlineAction = $('<i class="action"></i>');
        onlineStatus.html(onlineWord);
        header.html(onlineStatus);
        header.append(onlineAction);
        chatroom.append(header);
        $('body').append(chatroom);
    },
    open: function() {
        var chatroom = $('#chatroom'),
            chatbox = $('<div class="chatbox"></div>'),
            sendbox = $('<div class="sendbox"></div>'),
            chatlist = $('<ul class="chatlist"><li class="loading">正在导入消息请稍后...</li></ul>'),
            sendtool = $('<div class="sendtool"></div>');
        chatroom.addClass('active');
        sendtool.html('<span id="embutton">>ω<</span><div id="emlist" class="display"></div>');
        sendtool.append('<span id="uploadmessage"></span>');
        sendtool.append('<span id="sendmessage"></span>');
        sendbox.html(sendtool);
        sendbox.append('<textarea class="textarea"></textarea>');
        sendbox.append('<button id="sendMessage">发送<h6>Ctrl+Enter</h6></button>');
        chatbox.html(chatlist);
        chatbox.append(sendbox);
        chatroom.append(chatbox);
        setHtml.emotion();
        setHtml.getRecent(function() {
            chatlist[0].scrollTop = chatlist[0].scrollHeight;
            $('.loading', chatlist).remove();
            chatlist.prepend('<li class="more">加载更多消息</li>');
            setHtml.request();
        });
    },
    close: function() {
        $('#chatroom').removeClass('active');
        $('#chatroom .chatbox').remove();
    },
    append: function(data, callback) {
        var li = $('<li></li>'),
            avatar = $('<div class="avatar"></div>'),
            body = $('<div class="body"></div>'),
            head = $('<div class="head"></div>'),
            content = $('<div class="content"></div>');
        /** data.text 转义 **/
        /** Markdown **/
        var converter = new Markdown.Converter();
        data.text = converter.makeHtml(data.text);
        content.html(data.text);
        head.html(data.name);
        if(data.hasOwnProperty('uuid') && data.uuid) head.append('<@'+data.uuid+'>');
        var date = new Date(parseInt(data.time) * 1000), time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        head.append(time);
        li.attr('data-time', data.time);
        body.append(head);
        body.append(content);
        avatar.html(data.name.split("")[0]);
        /** 头像颜色 **/
        var rgbs = data.name.split("").map(function(i){return i.charCodeAt();}).join('');
        var bg = 'rgb('+['r','g','b'].map(function() {
            if(rgbs.substr(0,3)/1 < 255) {
                color = rgbs.substr(0,3);
                rgbs = rgbs.substr(3);
            } else {
                color = rgbs.substr(0,2);
                rgbs = rgbs.substr(2);
            }
            return color;
        }).join()+')';
        avatar.css('background', bg);
        li.html('<em></em>');
        li.prepend(avatar);
        li.append(body);
        /** 增加消息通知 **/
        if(document.hidden) setHtml.notification(data.name,data.text)
        callback(li);
    },
    request: function() {
        var chatlist=$('.chatlist'), time=$('.chatlist >li:last-child').attr('data-time');
        $.ajax({
            url: server+'/l.php?community='+community+'&start='+time+'&o=40',
            type: 'GET',
            dataType: 'json',
            contentType: false,
            processData: false,
            timeout: 20000,
            success: function(res) {
                if(res.success) {
                    res.data.forEach(function(list) {
                        if($('.chatlist >li:last-child').attr('data-time') != list.time && $('.chatlist >li:last-child .content') != list.text)
                            setHtml.append(list, function(html) {
                                chatlist.append(html);
                                chatlist[0].scrollTop = chatlist[0].scrollHeight;
                                setHtml.highlight();
                            })
                    })
                }
                setTimeout(setHtml.request, 500);
            }, 
            error: function(xmlrequest, status, error) {
                if(status == 'timeout')
                    setHtml.request();
            }
        })
    },
    getRecent: function(callback, time, num) {
        if(typeof num == "undefined") var num = 30;
        if(typeof time == "undefined") var time = parseInt(new Date().getTime() / 1000);
        $.getJSON(server+'/r.php?community='+community+'&max='+time+'&num='+num, function(lists) {
            if(!Array.isArray(lists)) return false;
            var chatlist = $('.chatlist');
            lists.forEach(function(list) {
                setHtml.append(list, function(html) {
                    chatlist.prepend(html)
                    setHtml.highlight();
                })
            })
            callback();
        })
    },
    emotion: function() {
        var emlist = $('#emlist');
        yan.list.forEach(function(line) {
            emlist.append('<span>'+line.yan[0]+'</span>');
        })
    },
    notification: function(name,text) {
        /** 语音提示 和 标题状态改变 **/
        $('title').html(name+' 说...');
        $('#chatroom #notification')[0].play();
        /** 消息通知 **/
        if(notification) return false;
        if(Notification.permission != 'granted') {
            Notification.requestPermission(setHtml.notification);
        }
        var notification = new Notification(name+' 说:', {
            'dir': 'ltr',
            'lang': 'zh-CN',
            'body': $(text).text(),
            'tag': "ChatOnlineOn"+community,
            'icon': server+'/'+community+'.png'
        });
        notification.onclick = function() {this.close()};
        notification.onshow = function() {setTimeout(this.close, 2000)}
    },
    highlight: function () {
        var pre = document.querySelectorAll('#chatroom pre');
        for(i=0,l=pre.length;i<l;i++) pre[i].className += " prettyprint";
        prettyPrint();
    }
}

