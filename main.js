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

channel = (function() {
    var community = "segmentfault", root = "http://3.chatonline.sinaapp.com/", server=root+"?community="+community+"&act=";
    return {
        community: community,
        server: root,
        create: function() {
            $.getJSON(server+'create&name='+user.name, function(res) {
                if(!res.status) return false;
                ch = sae.Channel(res.msg);
                ch.onmessage = channel.onmessage;
                ch.onopen = channel.onopen;
            })
        },
        onmessage: function(msg) {
            html.append($.parseJSON(msg.data), function(text) {
                $('.chatlist').append(text);
                $('.chatlist')[0].scrollTop = $('.chatlist')[0].scrollHeight;
                channel.users(function(users) {html.refresh(users.length)});
            });
        },
        onopen: function() {
            $.post(server+"connected", {name:user.name});
        },
        send: function(user) {
            $.ajax({
                url: server+'send',
                data: {name:user.name, text:user.text, uuid:user.uuid?user.uuid:''},
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
        },
        users: function(callback) {
            $.getJSON(server+"users", function(res) {
                if(!res.status) return false;
                if(callback) callback(res.msg);
            })
        },
        recent: function(callback, id, num) {
            var c = arguments[0],
                id=arguments[1]?'&end='+arguments[1]:'',
                num=arguments[2]?arguments[2]:30;
            $.getJSON(server+'recent'+id+'&num='+num, callback);
        },
        filter: function(query, callback) {
            $.get(server+'filter', {q: query, community: community}, function(o) {o = $.parseJSON(o);if (!o.status) callback(o.data)});
        }
    };
})();
html = {
    start: function(users) {
        var chatroom = '<div id="chatroom">'+
                            '<audio id="notification" src="http://chatonline.sinaapp.com/notification.wav" preload/>'+
                            '<div class="header">'+
                                '<div class="status">当前有<span>'+users.length+'</span>个用户在线</div>'+
                                '<i class="action"></i>'+
                            '</div>'+
                        '</div>';
        $('body').append(chatroom);
    },
    refresh: function(number) {
        return $('#chatroom .status span').html(number);
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
                remote_filter: channel.filter,
                tpl_eval: function(tpl, item) {
                    return '<li data-value="@' + item.slug + '">' + (item.avatarUrl ? '<img class="avatar-24" src="' + item.avatarUrl + '" />': '') + item.name + ' &nbsp; <small>@' + item.slug + '</small>' + '</li>';
                }
            }
        });

        html.emotion();
        html.getRecent(function() {
            var chatlist = $('#chatroom .chatlist');
            chatlist[0].scrollTop = chatlist[0].scrollHeight;
            $('li.loading', chatlist).remove();
            chatlist.prepend('<li class="more">加载更多消息</li>');
            chatlist.attr('data-latest', $('.chatlist >li:last-child').attr('data-id'));
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
        if(document.hidden) html.notification(data.name,data.text)
    },
    getRecent: function() {
        var c=arguments[0], 
            id=arguments[1]?'&end='+arguments[1]:'';
            num=arguments[2]?arguments[2]:30;

        channel.recent(function(lists) {
            if(!Array.isArray(lists)) return false;
            var chatlist = $('.chatlist');
            lists.forEach(function(list) {
                html.append(list, function(text) {
                    chatlist.prepend(text);
                    html.highlight();
                })
            })
            c();            
        }, id, num);
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
            'tag': "ChatOnlineOn"+channel.community,
            'icon': channel.server+'/'+channel.community+'.png'
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

/** 创建通道 **/
channel.create();
channel.users(html.start);

/** 打开关闭聊天窗口 **/
$(document).on('click', '.header', function(){
    $(this).parent().hasClass('active') ? html.close() : html.open();
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
$(document).on('click', '#chatroom .onlineList', function() {
    var textarea = $('.textarea');
    textarea.val(textarea.val() + '@'+$(this).text()+' ');
    textarea[0].focus();
    textarea[0].selectionStart =textarea[0].selectionEnd = textarea.val().length;   
})

/** 发送消息 **/
$(document).on('click', '#sendMessage', function() {
    user.text = $('.textarea').val();
    if(user.text == '') {
        alert('发送消息不能为空');
        return false;
    }
    /** 命令代码 **/
    switch(user.text) {
        case '/help':
            html.append({
                name: '管理猿',
                time: parseInt(new Date().getTime() / 1000),
                id: "",
                text: "<p><b>/help</b> - 列出所有命令<p><p><b>/users</b> - 列出所有在线人员</p><p><b>/clear</b> - 清屏</p>"
            }, function(html) {
                $('.chatlist').append(html);
                $('.chatlist')[0].scrollTop = $('.chatlist')[0].scrollHeight;
            })
            $('.textarea').val('');
            $('.textarea')[0].focus();
            return false;
        break;
        case '/users':
            channel.users(function(users) {
                var onlineText = users.filter(function(user){return user}).map(function(user){return '<p class="onlineList">'+user+'</p>'}).join('');
                html.append({
                    name: '管理猿',
                    time: parseInt(new Date().getTime() / 1000),
                    id: "",
                    text: onlineText
                }, function(html) {
                    $('.chatlist').append(html);
                    $('.chatlist')[0].scrollTop = $('.chatlist')[0].scrollHeight;
                })          
                $('.textarea').val('');
                $('.textarea')[0].focus();
            })
        break;
        case '/clear':
            $('.chatlist').html($('.chatlist .more'));
            $('.textarea').val('');
            $('.textarea')[0].focus();
            return false;
        break;
        default:
            /** 发送消息 **/
            channel.send(user);
        break;
    }
});

/** 设置快捷键 **/
(function(key) {
    chrome.storage.sync.get(key, function(d) {
        if(!d.hasOwnProperty(key) || d[key] == '0') {
            $(document).on('keypress', '#chatroom .textarea', function(e) {
                if(!$(this).is(':focus')) return false;

                /** Enter 发送消息 **/
                if(!$('.atwho-view').is(':focus') && !e.ctrlKey && e.keyCode == '13') {
                    e.preventDefault();
                    return $('#sendMessage').click();
                }               
            })

            $(document).on('keydown', '#chatroom .textarea', function(e) {
                /** Ctrl+Enter 换行支持 **/
                if(e.ctrlKey && e.keyCode == '13') {
                    e.preventDefault();
                    var start = this.selectionStart, end = this.selectionEnd;
                    $(this).val($(this).val().substr(0,start)+'\n'+$(this).val().substr(end));
                }                
            })
        } else {
            $(document).on('keydown', '#chatroom .textarea', function(e) {
                if(!$(this).is(':focus')) return false;

                /** Ctrl+Enter 发送消息 **/
                if(e.ctrlKey && e.keyCode == '13')
                    return $('#sendMessage').click();                   
            });
        }
    })
}('sendkey'));

$(document).on('keydown', '#chatroom .textarea', function(e) {
    /** Tab支持 **/
    if($(this).is(':focus') && e.keyCode == '9') {
        e.preventDefault();
        var start = this.selectionStart, end = this.selectionEnd;
        $(this).val($(this).val().substr(0,start)+'    '+$(this).val().substr(end));
    }

    /** 上键发重复消息 **/
    /**
    if($(this).val() == '' && e.keyCode == '38') {
        $(this).val($('.chatlist >li:last-child .content').html());
    }
    **/
});
/** 老板键 **/
$(document).on('keydown', function(e) {
    if(e.ctrlKey && e.keyCode == '38' && !$('#chatroom').hasClass('active')) {
        e.preventDefault();
        html.open();
    }
    if(e.ctrlKey && e.keyCode == '40' && $('#chatroom').hasClass('active')) {
        e.preventDefault();
        html.close();
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
    channel.recent(function() {
        scrollHeightAfter = chatlist[0].scrollHeight;
        chatlist[0].scrollTop = scrollHeightAfter - scrollHeightBefore;
        chatlist.prepend(more);
    }, $('.chatlist >li:first-child').attr('data-id'), 40);
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
                url: channel.server+"/u.php?community="+channel.community,
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
$(document).on('mousemove', '#chatroom.active', function(e) {
    var chatroom = this;
    var mouse = {x: e.clientX, y: e.clientY},
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
            if($(chatroom).hasClass('active') && ( mouse.clientX > limit.x || mouse.clientY < limit.y) ) {
                chatroom.style.opacity = d.opacity;
            } else {
                chatroom.style.opacity = 1;
            }            
        }
    })

});
$(document).on('mousedown', '#chatroom.active', function(e) {
    var chatroom = this;
    var limit = {x:this.offsetLeft+this.clientWidth, y:this.offsetTop}
    var area = {x: limit.x - 10 < e.clientX && limit.x + 10 > e.clientX, y: limit.y - 10 < e.clientY && limit.y + 10 > e.clientY};
    if(area.x || area.y) {
        $('body').append('<style id="user-select">*{-webkit-user-select: none;}</style>');
        document.onmousemove =  function(e) {
            /** 左右拉伸 **/
            if(area.x && !area.y) {
                chatroom.style.width = e.clientX-chatroom.offsetLeft+'px';
            }
            /** 上下拉伸 **/
            if(!area.x && area.y) {
                chatroom.style.height = window.screen.availHeight - e.clientY+'px';
            }
            /** 对角拉伸 **/
            if(area.x && area.y) {
                chatroom.style.width = e.clientX-chatroom.offsetLeft+'px';
                chatroom.style.height = window.screen.availHeight - e.clientY+'px';
            }
        }       
    }
})
$(document).on('mouseup', function() {
    if($('#user-select').length > 0) $('#user-select').remove();
    document.onmousemove = null;
})
