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
    if(document.hidden) return false; /** 如果用户不看的话就不用做发送啦 **/
    $.getJSON(server+'/online.php?community='+community+'&uuid='+user.uuid, function(res) {
    	var onlineWord = "当前有"+res.online+"个用户在线";
    	$('#chatroom').length > 0 ? $('#chatroom .status').html(onlineWord) : setHtml.start(onlineWord);
    });
};
/** 定时发送心跳并获取最新消息 **/
setInterval("heartBeat()", 5000);

/** 打开关闭聊天窗口 **/
$(document).on('click', '.header', function(){
	$(this).parent().hasClass('active') ? setHtml.close() : setHtml.open();
});
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
/** 点击头像添加@ **/
$(document).on('click', '#chatroom .avatar', function() {
    var textarea = $('.textarea');
    textarea.val(textarea.val() + '@'+$(this).attr('data-user')+' ');
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
});
/** 设置快捷键 **/
$(document).on('keydown', function(e) {
    var textarea = $('#chatroom .textarea');
    (function(key) {
        chrome.storage.sync.get(key, function(d) {
            if(!d.hasOwnProperty(key) || d[key] == "0") {
                /** Enter 发送消息 **/
                if(textarea.is(':focus') && !$('.atwho-view').is(':focus') && !e.ctrlKey && e.keyCode == '13') {
                    e.preventDefault();
                    $('#sendMessage').click();
                }   

                /** Ctrl+Enter 换行支持 **/
                if(textarea.is(':focus') && e.ctrlKey && e.keyCode == '13') {
                    e.preventDefault();
                    var start = textarea[0].selectionStart, end = textarea[0].selectionEnd;
                    textarea.val(textarea.val().substr(0,start)+'\n'+textarea.val().substr(end));
                }
            } else {

                /** Ctrl+Enter 发送消息 **/
                if(e.ctrlKey && e.keyCode == '13')
                    return $('#sendMessage').click();                
            }
        })
    }('sendkey'));

    /** Tab支持 **/
    if(textarea.is(':focus') && e.keyCode == '9') {
        e.preventDefault();
        var start = textarea[0].selectionStart, end = textarea[0].selectionEnd;
        textarea.val(textarea.val().substr(0,start)+'    '+textarea.val().substr(end));
    }

    /** 老板键 **/
    if(e.ctrlKey && e.keyCode == '38' && !$('#chatroom').hasClass('active')) {
        e.preventDefault();
        setHtml.open();
    }
    if(e.ctrlKey && e.keyCode == '40' && $('#chatroom').hasClass('active')) {
        e.preventDefault();
        setHtml.close();
    }
});
$(document).on('click', '#chatroom a', function(e) {
    window.open($(this).attr('href'));
    e.preventDefault();
});
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
});
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
});
/** 鼠标调整聊天窗口大小 **/
$(document).on('mousemove', function(e) {
    var chatroom = document.querySelector('#chatroom.active');
    if(!chatroom) return false;
    var mouse = {x: e.pageX, y: e.pageY},
        limit = {x: chatroom.offsetLeft+chatroom.clientWidth, y:chatroom.offsetTop};
    var area = {x: limit.x - 10 < mouse.x && limit.x + 10 > mouse.x, y: limit.y - 10 < mouse.y && limit.y + 10 > mouse.y};
    /** 左右拉伸 **/
    if(area.x && !area.y) {
        chatroom.style.cursor = 'e-resize';
    }
    /** 上下拉伸 **/
    if(!area.x && area.y) {
        chatroom.style.cursor = 'n-resize';
    }
    /** 对角拉伸 **/
    if(area.x && area.y) {
        chatroom.style.cursor = 'ne-resize';
    }

    if(!area.x && !area.y) {
        chatroom.style.cursor = 'pointer';
    }

    /** 鼠标移除透明对话框 **/
    chrome.storage.sync.get(['aero', 'opacity'], function(d) {
        if(d.aero == "1") {
            if($(chatroom).hasClass('active') && ( mouse.x > limit.x || mouse.y < limit.y) ) {
                chatroom.style.opacity = d.opacity;
            } else {
                chatroom.style.opacity = 1;
            }            
        }
    })

});
setHtml = {
    start: function(w) {
        var chatroom = '<div id="chatroom">'+
                            '<audio id="notification" src="http://chatonline.sinaapp.com/notification.wav" preload/>'+
                            '<div class="header">'+
                                '<div class="status">'+w+'</div>'+
                                '<i class="action"></i>'+
                            '</div>'+
                        '</div>';
        $('body').append(chatroom);
    },
    open: function() {
        var chatbox = '<div class="chatbox">'+
                        '<ul class="chatlist">'+
                            '<li class="loading">正在导入消息请稍后...</li>'+
                        '</ul>'+
                        '<div class="sendbox">'+
                            '<div class="sendtool">'+
                                '<span id="embutton">>ω<</span><div id="emlist" class="display"></div>'+
                                '<span id="uploadmessage"></span>'+
                                '<span id="sendmessage"></span>'+
                            '</div>'+
                            '<textarea class="form-control mono textarea-14 mousetrap textarea"></textarea>'+
                            '<button id="sendMessage">发送<h6>Enter</h6></button>'+
                        '</div>'+
                    '</div>';
        $('#chatroom').addClass('active').append(chatbox);
        /** 快捷键显示 **/
        chrome.storage.sync.get('sendkey', function(d){if(d.sendkey == "1") $('#sendMessage h6').html('Ctrl+Enter')})
        /** @ **/
        $('.textarea').atwho({
            at: '@',
            callbacks: {
                remote_filter: function(query, callback) {
                    $.get(server+'/x.php', {q: query, community: community}, function(o) {o = $.parseJSON(o);if (!o.status) callback(o.data)});
                },
                tpl_eval: function(tpl, item) {
                    return '<li data-value="@' + item.slug + '">' + (item.avatarUrl ? '<img class="avatar-24" src="' + item.avatarUrl + '" />': '') + item.name + ' &nbsp; <small>@' + item.slug + '</small>' + '</li>';
                }
            }
        });
        setHtml.emotion();
        setHtml.getRecent(function() {
            var chatlist = $('#chatroom .chatlist');
            chatlist[0].scrollTop = chatlist[0].scrollHeight;
            $('li.loading', chatlist).remove();
            chatlist.prepend('<li class="more">加载更多消息</li>');
            setHtml.request();
        });
        /** 自定义消息背景 **/
        (function(key) {
            chrome.storage.sync.get(key, function(d) {
                if(!d.hasOwnProperty(key)) return false;
                if($('#msgOption').length > 0) $('#msgOption').remove();
                $('body').append('<style id="msgOption" type="text/css">#chatroom .chatbox .chatlist em{border-top-color:'+d[key]+';border-right-color:'+d[key]+';}#chatroom .chatbox .chatlist div.body{background:'+d[key]+';}</style>');
            })
        }('msgbg'));
    },
    close: function() {
        $('#chatroom').removeClass('active');
        $('#chatroom .chatbox').remove();
    },
    append: function(data, callback) {
        /** data.text 转义 **/
        /** Markdown **/
        var converter = new Markdown.Converter();
        data.text = converter.makeHtml(data.text);

        var ht = data.name, date = new Date(parseInt(data.time) * 1000);
        if(data.uuid) ht += '<@'+data.uuid+'>';
        ht += date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

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

        var li = '<li data-time="'+data.time+'" data-id="'+data.id+'">'+
                    '<div class="avatar" data-user="'+data.name+'" style="background:'+bg+';">'+data.name.split("")[0]+'</div>'+
                    '<em></em>'+
                    '<div class="body">'+
                        '<div class="head">'+ht+'</div>'+
                        '<div class="content">'+data.text+'</div>'+
                    '</div>'+
                '</li>';
        callback($(li));
        /** 增加消息通知 **/
        if(document.hidden) setHtml.notification(data.name,data.text)
    },
    request: function() {
        var chatlist=$('.chatlist'), id=$('.chatlist >li:last-child').attr('data-id');
        $.ajax({
            url: server+'/l.php?community='+community+'&start='+id+'&o=40',
            type: 'GET',
            dataType: 'json',
            contentType: false,
            processData: false,
            timeout: 20000,
            success: function(res) {
                res.success && res.data.forEach(function(list) {
                    /** 判断消息id防止载入重复消息进列表 **/
                    if($('.chatlist li[data-id="'+list.id+'"]').length == 0) {
                        setHtml.append(list, function(html) {
                            chatlist.append(html);
                            chatlist[0].scrollTop = chatlist[0].scrollHeight;
                            setHtml.highlight();
                        })                        
                    }
                })
                setTimeout(setHtml.request, 500);
            }, 
            error: function(xmlrequest, status, error) {
                if(status == 'timeout') setHtml.request();
            }
        })
    },
    getRecent: function() {
        var c=arguments[0], 
            num=arguments[1]?arguments[1]:30, 
            time=arguments[2]?arguments[2]:(new Date().getTime() / 1000);

        $.getJSON(server+'/r.php?community='+community+'&max='+time+'&num='+num, function(lists) {
            if(!Array.isArray(lists)) return false;
            var chatlist = $('.chatlist');
            lists.forEach(function(list) {
                setHtml.append(list, function(html) {
                    chatlist.prepend(html);
                    setHtml.highlight();
                })
            })
            c();
        })
    },
    emotion: function() {
        var emlist = $('#emlist');
        yan.list.forEach(function(line) {
            line.yan.forEach(function(em,i) {if(i<10)emlist.append('<span>'+em+'</span>')});
        })
    },
    notification: function(name,text) {
        /** 标题状态改变 **/
        var o = $('title').text();
        $('title').text('');
        var note = setInterval(function() {$('title').text( $('title').text().length > 1 ? $('title').text().substr(1) : name+' 说...')}, 500);
        setTimeout(function() {clearInterval(note);$('title').text(o)}, 10000);
        /** 语音提示 **/
        document.querySelector('#chatroom #notification').play();
        /** 消息通知 **/
        if(!Notification) return false;
        if(Notification.permission != 'granted')
            Notification.requestPermission(setHtml.notification);
        var notification = new Notification(name+' 说:', {
            'dir': 'ltr',
            'lang': 'zh-CN',
            'body': $(text).text(),
            'tag': "ChatOnlineOn"+community,
            'icon': server+'/'+community+'.png'
        });
        notification.onclose = function() {clearInterval(note);$('title').text(o)}
        /** 点击后想增加一个跳转到该页面的代码 **/
        notification.onclick = function() {this.close()}
        notification.onshow = function() {setTimeout(notification.close, 10000)}
    },
    highlight: function () {
        $('#chatroom pre').each(function() {
            if(!$(this).hasClass('prettyprint')) {
                $(this).html($(this).text()); //坑爹的转义
                $(this).addClass('prettyprint');
                prettyPrint();
            }
        });
    }
}
