/*!
 * jQuery Waterfall v1.2
 * 
 **************************************************************
 * 1. 根据页面大小自动排列
 * 2. 自定义异步请求函数（返回JSON，json格式与html模板对应即可，默认格式请看demo json.js）
 * 3. 自定义html模板
 * 4. 图片自动按比例缩放
 * 5. 是否显示分页(未完成)
 * usage: url必填，其它不传将使用默认配置
	$('#id').waterfall({
		itemClass: 'wf_item',	// 砖块类名
		imgClass: 'thumb_img',	// 图片类名
		colWidth: 235,			// 列宽
		marginLeft: 15,			// 每列的左间宽
		marginTop: 15,			// 每列的上间宽
		perNum: 'auto',			// 每次下拉时显示多少个(默认是列数)
		isAnimation: true,		// 是否使用动画效果
		ajaxTimes: 'infinite',	// 限制加载的次数(int) 字符串'infinite'表示无限加载 
		url: null,				// 数据来源(ajax加载，返回json格式)，传入了ajaxFunc参数，此参数将无效
		ajaxFunc: null,			// 自定义异步函数, 第一个参数为成功回调函数，第二个参数为失败回调函数
								// 当执行成功回调函数时，传入返回的JSON数据作为参数
		createHtml: null		// 自定义生成html字符串函数,参数为一个信息集合，返回一个html字符串
	});
 *
 */
 
; (function($, window, document){
	$.fn.waterfall = function(options){
		var // 配置信息
			opts = $.extend({}, $.fn.waterfall.defaults, options), 
			
			isIE6 = !-[1,] && !window.XMLHttpRequest,
		
			ajaxTimes = 0,		// 已向服务器请求的次数
			isLoading = false,	// 是否正在加载数据
			isFinish = false,	// true时不再向服务器发送请求
			
			colsHeight = [],	// 用于存储每列的高度
			minColsIndex = 0,	// 最低那列的下标
			
			jsonCache = [],		// 服务器返回的JSON缓存数据
			
			wf_box_top = 0,		// $wf_box 的相对视图的位置高度
			wf_item_top = 0,	// 瀑布流块的top, left值
			wf_item_left = 0,
			
			// 一些jQ对象
			$wf_box, $wf_col, 
			$wf_col_temp, $wf_col_items,
			$wf_result, $backTop,
			
			// 异步请求函数
			ajaxFunc = $.isFunction(opts.ajaxFunc) ?
						opts.ajaxFunc :
						function(success, error){
							$.ajax({
								type: 'GET',
								url: opts.url,
								cache: false,
								data: opts.params,
								dataType:'json',
								timeout: 60000,
								success: success,
								error: error
							});
						},
			// 生成html字符串函数
			createHtml = $.isFunction(opts.createHtml) ?　
					opts.createHtml　:
					function(data){
						var tox = '../images/tx.gif';
						return '<div class="wf_item_inner">' +
								  '<a href="'+ data.href +'" class="thumb" target="_blank">' +
									'<img class="'+opts.imgClass+'"  src="'+ data.imgSrc +'" />' +
								  '</a>' +
								  '<h3 class="title"><a href="'+ data.href +'" target="_blank">'+ data.title +'</a></h3>' +
								  '<p class="desc">'+'<img src="'+ tox +'" />'+'</p>' +
							  '</div>';
					};
		
		
		
		// usage:
		// fixedPosition(elem, {top:0, left:0});
		// fixedPosition(elem, {bottom:0, right:0});
		var fixedPosition = function(){
			var html = document.getElementsByTagName('html')[0],
				dd = document.documentElement,
				db = document.body,
				doc = dd || db;
			
			// 给IE6 fixed 提供一个"不抖动的环境"
			// 只需要 html 与 body 标签其一使用背景静止定位即可让IE6下滚动条拖动元素也不会抖动
			// 注意：IE6如果 body 已经设置了背景图像静止定位后还给 html 标签设置会让 body 设置的背景静止(fixed)失效
			if (isIE6 && db.currentStyle.backgroundAttachment !== 'fixed') {
				html.style.backgroundImage = 'url(about:blank)';
				html.style.backgroundAttachment = 'fixed';
			};
			
			// pos = {top:0, right:0, bottom:0, left:0}
			return isIE6 ? 
				function(elem, pos){
					var style = elem.style,
						dom = '(document.documentElement || document.body)'; 
					
					if(typeof pos.left !== 'number'){
						pos.left = doc.clientWidth - pos.right - elem.offsetWidth; 
					}
					if(typeof pos.top !== 'number'){
						pos.top = doc.clientHeight - pos.bottom - elem.offsetHeight; 
					}
					
					elem.style.position = 'absolute';
					style.removeExpression('left');
					style.removeExpression('top');
					style.setExpression('left', 'eval(' + dom + '.scrollLeft + ' + pos.left + ') + "px"');
					style.setExpression('top', 'eval(' + dom + '.scrollTop + ' + pos.top + ') + "px"');
				} : 
				function(elem, pos){
					var style = elem.style;
						
					style.position = 'fixed';
					
					if(typeof pos.left === 'number'){
						style.left = pos.left + 'px';
					}else{
						style.left = 'auto'; 
						style.right = pos.right + 'px';
					}
					
					if(typeof pos.top === 'number'){
						style.top = pos.top + 'px';
					}else{
						style.top = 'auto'; 
						style.bottom = pos.bottom + 'px';
					}
				 
				};
		}();
		
		
		// 异步获取数据
		function getJSONData(){
			if(!(isFinish || isLoading)){ // 确保上一次加载完毕才发送新的请求
				// 滚动条下拉时判断是否需要向服务器请求数据或者是处理缓存数据
				if(colsHeight.minHeight + wf_box_top < $(window).height() + $(window).scrollTop()){
					// 如果缓存还有数据，直接处理数据
					if(jsonCache.length > 0){
						dealData();
					}else{
						if(opts.ajaxTimes === 'infinite' || ajaxTimes < opts.ajaxTimes){
							showMsg('loading');
							// 传参给服务器
							opts.params.ajax = ++ajaxTimes;
							ajaxFunc(
								function(jsonData){
									try{
										if(typeof jsonData === 'string') jsonData = $.parseJSON(jsonData);
										if($.isEmptyObject(jsonData) || typeof jsonData === 'string'){
											showMsg('finish');
										}else{
											jsonCache = jsonCache.concat(jsonData).reverse();
											dealData();
										}
									}
									catch(e){
										showMsg('error');
									}
								}, 
								function(){
									showMsg('error');
								}
							);
									
						}else{
							showMsg('finish');
						}
					}
					
				}
			}
		}
		
		// 处理返回的数据
		function dealData(){
			var perNum = typeof opts.perNum === 'number' ? opts.perNum : opts.colNum,
				data = null,
				wf_col_height = $wf_col.height(),idx,
				$wf_item, $wf_img, htmlStr;
			// 确保所有图片都已知宽高
			loadImg(jsonCache, opts.imgUrlName, function(){
				while(perNum-- > 0 && (data = jsonCache.pop())){
		
					minColsIndex = getColsIndex(colsHeight)[0];
					
					wf_item_left = minColsIndex * (opts.colWidth + opts.marginLeft);
					wf_item_top = colsHeight[minColsIndex] + opts.marginTop;
					
					htmlStr = createHtml(data);
					
					$wf_item = $('<div>').addClass(opts.itemClass).html(htmlStr)
								.css({width:opts.colWidth, left: wf_item_left, top: wf_item_top})
								.appendTo($wf_col);
				    
					$wf_img = $wf_item.find('.'+opts.imgClass);
					
					$wf_img.height($wf_img.width() / data.width * data.height);
					idx = $wf_item.index();
					$wf_item.attr({'data-rel':idx});
					$wf_img.data({'width':data.width,'height':data.height,'len':$wf_col.children().length,'url':data.url,'title':data.title,'lodUrl':data.image});

					
					if(opts.isAnimation){
						$wf_item.css({opacity:0}).animate({
													opacity: 1
												}, 800);
					}
					
					// 更新每列的高度
					if($('.allFts').length>0){
					    $wf_img.height(84);
					}else if($('.jp-gui').length>0){
					    $wf_img.height(126);
						var ml =  '<div id="jquery_jplayer'+idx+'"></div>';
				        $('.wrap').append(ml);
						$wf_img.attr({'id':'jp_container_'+idx})
					}
					colsHeight[minColsIndex] = wf_item_top + $wf_item.outerHeight();
					if( colsHeight[minColsIndex] > colsHeight.maxHeight ){
						colsHeight.maxHeight = colsHeight[minColsIndex];
					}
					$wf_col.height(colsHeight.maxHeight);
					imgBigShow.init($wf_img);
				}
				
				isLoading = false;
				$wf_result.hide();
				
				// 保证浏览器有效滚动
				if($('.allFts').length>0){
	
				    var dataname = ['sfjyankaiti','HuJingLi-Mao','ygykxjt'],dataguid=['bc5f0f2efc474c1e895669920213a877','71f4b78b167b49bda33ae221ce3c5390','b24e39ab8c144cdf9089418b3e9eafd7'];
				    imgBigShow.youzikujsm(dataname,dataguid);
				 
			    }
				getJSONData();
				
				
			});
		}
		
		// 排列瀑布流的块
		function realign(){
			var colNum = 0,
				i = 0,
				backTop_left =  0,
				speed = 0;
			
			// 计算出当前屏幕可以排多少列
			//colNum = Math.floor(($wf_box.width() + opts.marginLeft) / (opts.colWidth + opts.marginLeft));
			if($(window).width()<1200){colNum=4}else{
			    colNum = Math.floor(($(window).width()-200) / (opts.colWidth + opts.marginLeft));
			}
			var oPw = colNum*(opts.colWidth + opts.marginLeft)-opts.marginLeft;
			$('.wrap').width(oPw);
			$('#TagsList').width(oPw - 100);
			$('.topBar').children('.center ').width(oPw);
			$('.barRi').width(oPw - 302);
			if(colNum > 0 && colNum !== opts.colNum){
				opts.colNum = colNum;
				$wf_col.width((opts.colWidth+opts.marginLeft) * opts.colNum - opts.marginLeft);
				
				// 重新调整存储列
				for(i=0; i<opts.colNum; i++){
					colsHeight[i] = 0;
				}
				colsHeight.length = opts.colNum;
				
				$wf_col_items = $wf_col.children('.wf_item');
				$wf_col_items.each(function(num, value){
					minColsIndex = getColsIndex(colsHeight)[0];
					wf_item_top = colsHeight[minColsIndex] + opts.marginTop;
					wf_item_left = minColsIndex * (opts.colWidth + opts.marginLeft);
					
					
					if(opts.isAnimation) speed = 300;
					$(this).width(opts.colWidth).animate({
													left:wf_item_left, 
													top:wf_item_top
												}, speed);
					
					
					colsHeight[minColsIndex] = wf_item_top + $(this).outerHeight();
				});
				
				getColsIndex(colsHeight);
				$wf_col.height(colsHeight.maxHeight);
				
				getJSONData();
			}
			
			// 返回顶部按钮位置
			backTop_left = $wf_col.offset().left + $wf_col.width() + 10;
			
			fixedPosition($backTop[0], {
				left: backTop_left,
				bottom: 0
			});
			
		}
		
		// 显示结果信息
		function showMsg(type){
			switch(type){
				case 'loading':
					isLoading = true;
					$wf_result.html('').addClass('wf_loading').show();
					break;
				case 'error':
					$wf_result.removeClass('wf_loading').show().html('数据格式错误，请返回标准的Json数据或Json格式字符串！');
					isFinish =  true;
					break;
				case 'finish':
					$wf_result.removeClass('wf_loading').show().html('已加载完毕，没有更多了！');
					isFinish = true;
					break;
			}
		}
		
		return this.each(function(){
			if($(this).data('_wf_is_done_')) return true;
			
			$wf_box = $(this).addClass('waterfall').data('_wf_is_done_', true);
			wf_box_top = $wf_box.offset().top;	// 保存 $wf_box 的相对视图的位置高度
			
			$wf_col = $wf_box.children('.wf_col');
			$wf_col.length === 0 && ($wf_col = $('<div>').addClass('wf_col').appendTo($wf_box));
			$wf_result = $('<div>').addClass('wf_result').appendTo($wf_box);
			
			// 增加返回顶部按钮
			$backTop = $('<a></a>').attr('id', 'backTop').attr('title', '返回顶部').appendTo(document.body);
			$backTop.css('opacity', 0).bind('click', function(){
				$("html,body").stop(true).animate({scrollTop:0},600);
			});
			
			$(document.body).css('overflow', 'scroll');
			// 排列已经存在的瀑布流块
			realign();
			$(document.body).css('overflow', 'auto');
			
			// 第一次拉取图片时，保证图片能填满窗出现滚动
			getJSONData();
			
			// 注册滚动条事件
			$(window).bind('scroll', function(){
				if($(window).scrollTop() > wf_box_top){
					$backTop.stop(true).animate({opacity: 1}, 500);
				}else{
					$backTop.stop(true).animate({opacity: 0}, 500);
				}
				getJSONData();
				
			// 注册窗口改变大小事件
			}).bind('resize', function(){
				throttle(realign);
			});
		});
	};
	
	// 默认配置
	$.fn.waterfall.defaults = {
		itemClass: 'wf_item',	// 砖块类名
		imgClass: 'thumb_img',	// 图片类名
		colWidth: 235,			// 列宽(int)
		marginLeft: 15,			// 每列的左间宽(int)
		marginTop: 15,			// 每列的上间宽(int)
		perNum: 'auto',			// 每次下拉时显示多少个(默认是列数)
		isAnimation: true,		// 是否使用动画效果
		ajaxTimes: 'infinite',	// 限制异步请求的次数(int) 字符串'infinite'表示无限加载
		imgUrlName: 'imgSrc',	// 在json里表示图片路径的属性名称(用于预加载图片获取高宽)
		params: {},				// 键值对，发送到服务器的数据。将自动转换为请求字符串格式。
								// 如 {foo:["bar1", "bar2"]} 转换为 "&foo=bar1&foo=bar2"。
		url: '',				// 数据来源(ajax加载，返回json格式)，传入了ajaxFunc参数，此参数可省略(string)
		// 自定义异步函数, 第一个参数为成功回调函数，第二个参数为失败回调函数
		// 当执行成功回调函数时，传入返回的JSON数据作为参数
		ajaxFunc: null,		// (function)
		createHtml: null	// 自定义生成html字符串函数,参数为一个信息集合，返回一个html字符串(function)
		
	};
	
	
	/*****************一些全局函数*********************/
	/**
	 * 图片头数据加载就绪事件
	 * @参考 	http://www.planeart.cn/?p=1121
	 * @param	{String}	图片路径
	 * @param	{Function}	尺寸就绪 (参数1接收width; 参数2接收height)
	 * @param	{Function}	加载完毕 (可选. 参数1接收width; 参数2接收height)
	 * @param	{Function}	加载错误 (可选)
	 */
	var imgReady = (function(){
		var list = [], intervalId = null,
		
		// 用来执行队列
		tick = function () {
			var i = 0;
			for (; i < list.length; i++) {
				list[i].end ? list.splice(i--, 1) : list[i]();
			};
			!list.length && stop();
		},

		// 停止所有定时器队列
		stop = function () {
			clearInterval(intervalId);
			intervalId = null;
		};

		return function (url, ready, load, error) {
			var check, width, height, newWidth, newHeight,
				img = new Image();
			
			
			if(!url){
				error && error();
				return;
			}
			
			img.src = url;

			// 如果图片被缓存，则直接返回缓存数据
			if (img.complete) {
				ready(img.width, img.height);
				load && load(img.width, img.height);
				return;
			};
			
			// 检测图片大小的改变
			width = img.width;
			height = img.height;
			check = function () {
				newWidth = img.width;
				newHeight = img.height;
				if (newWidth !== width || newHeight !== height ||
					// 如果图片已经在其他地方加载可使用面积检测
					newWidth * newHeight > 1024
				) {
					ready(newWidth, newHeight);
					check.end = true;
				};
			};
			check();
			
			// 加载错误后的事件
			img.onerror = function () {
				error && error();
				check.end = true;
				img = img.onload = img.onerror = null;
			};
			
			// 完全加载完毕的事件
			img.onload = function () {
				load && load(img.width, img.height);
				!check.end && check();
				// IE gif动画会循环执行onload，置空onload即可
				img = img.onload = img.onerror = null;
			};

			// 加入队列中定期执行
			if (!check.end) {
				list.push(check);
				// 无论何时只允许出现一个定时器，减少浏览器性能损耗
				if (intervalId === null) intervalId = setInterval(tick, 40);
			};
		};
	})();
	
	// 快速获取图片头数据，加载就绪后执行回调函数

	function loadImg(jsonData, imgUrlName, callback){
		var count = 0,
			i = 0,
			intervalId = null,
			data = null,
			imgSrc = 
			done = function(){
				 if(count === jsonData.length) {
					 clearInterval(intervalId);
					 callback && callback();
				 }
			};
		for(; i<jsonData.length; i++){
			data = jsonData[i];
			data.height = parseInt(data.height);
			data.width = parseInt(data.width);
			
			// 如果已知图片的高度，则跳过
			if(data.height >= 0 && data.width >= 0){
				++count;
			}else{
				(function(data){
					imgReady(data[imgUrlName], function(width,height){
						// 图片头数据加载就绪，保存宽高
						data.width = width;
						data.height = height;
						++count;
					}, null, function(){
						// 图片加载失败，替换成默认图片
						data.width = 208;
						data.height = 240;
						data.imgSrc = 'images/default.jpg';
						++count;	
					});
				})(data);
			}
		}
		
		intervalId = setInterval(done, 40);
	}
	
	/*
	 * 函数节流：避免因为高频率的更改导致浏览器挂起或崩溃，如onresize事件处理程序尝试复杂的DOM操作
	 * 思路：在一定时间内重复执行某操作只执行一次。
	 */
	function throttle(method, context){
		clearTimeout(method.tid);
		context = context || null;
		method.tid = setTimeout(function(){
			method.call(context);				
		},100);
	}
	
	// 返回从小到大排序的数组的下标的数组
	// e.g. 传入数组[300,200,250,400] 返回[1,2,0,3]
	function getColsIndex(arr){
		var clone = arr.slice(),	// 数组副本，避免改变原数组
			ret = [], 	// 对应下标数组
			len = arr.length,
			i, j, temp;
			
		for(i=0;i<len;i++){
			ret[i] = i;
		}
		
		//外层循环(冒泡排序法：从小到大)
		for(i=0;i<len;i++){
			//内层循环
			for(j=i;j<len;j++){
				if(clone[j] < clone[i]){
					//交换两个元素的位置
					temp=clone[i];
					clone[i]=clone[j];
					clone[j]=temp;
					
					temp=ret[i];
					ret[i]=ret[j];
					ret[j]=temp;
				}
			}
		}
		arr.minHeight = arr[ret[0]];
		arr.maxHeight = arr[ret[ret.length -1]];
		return ret;
	}
	
	/*****************图片放大展示*********************/
	var imgBigShow = {
		init : function(o){
			 this.win_view = $('.win_view');
			 this.win_view_layer = $('.win_view_layer');
			 this.win_img = $('.win_img');
			 this.wh = $(window).height();
			 this.op = true;
			 this.idx = 1;
			 this.count = 0;
			 this.len = o.data('len');
			 
			
			
			 if($('.sflaBox').length>0){
				 this.show(o);
				 this.showFla(o);
			 }else if($('.allFts').length>0){
				 
			 }else if($('.jp-gui').length>0){
				 this.musicPlay(o);
			 }else{
				 this.show(o);
			 }
			 

		},
		videoPlay : function(url){
		    var ie = /MSIE/.test(navigator.userAgent);
			//flowplayer("player", "http://daqin.game2.cn/swf/flowplayer-3.2.8.swf");
			flowplayer(
			"players",
			{src:'http://www.g2.cn/fla/flowplayer-3.2.8.swf',cachebusting:ie},
				{
					clip:
					{
						url: url,
						autoPlay: true,
						autoBuffering: true
					}
				}
			);
			$f(0).play(); 
		},
		show : function(o){
			  var self = this,clas = self.win_img.children(0).attr('class'),s=0;
			  o.unbind('click')
			  o.on('click',function(){
				  var lm = $(this).parent().siblings('.desc').html();
				  w=o.data('width'),h=o.data('height'),self.count = $(this).parents('.wf_item').attr('data-rel'),$this = $(this);
			      self.scale(w,h,function(w2,h2){
					 var html = '';
					 if(clas=='bigsImg'){
					    html = '<img class="bigsImg" src="'+$this.parent().attr('rel')+'" height="'+h2+'" widht="'+w2+'">';
					 }else if(clas=='videoplay'){
					    html+='<div class="videoplay">'
                        html+='<div class="player">'
                        html+='<a href="javascript:void(0)" class="closeWow" style="display:none" onclick="$f().stop();"></a>'
						html+='<div id="players"></div>'
                        html+='</div>'
                        html+='</div>';
					 }else if(clas=='flaShow'){
					    html+='<div class="flaShow">'
						html+='<object width="590" height="470" align="middle" classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0" id="undefined">'
                        html+= '<param value="always" name="allowScriptAccess">'
                        html+= '<param value="http://images.dahei.com/ws-dh22-90akty0618/asdasd.swf" name="movie">'
                        html+=' <param value="high" name="quality">'
                        html+= '<param value="#FFFFFF" name="bgcolor">'
                        html+= '<param value="transparent" name="wmode">'
                        html+= '<param value="false" name="menu">'
                        html+= '<embed width="590"  height="470" align="middle" pluginspage="http://www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" wmode="transparent" allowscriptaccess="always" name="undefined" menu="false" quality="high" src="http://images.dahei.com/ws-dh22-90akty0618/asdasd.swf">'
                        html+= '</object>'
						html+='</div>';
					 }
					 self.win_view.find('.desc').empty().append(lm);
					 self.win_view_layer.css({'width':$(window).width(),'height':self.wh});
					 self.win_view.css({'top':(self.wh-(h2+74))/2});
					 self.win_img.children(0).remove();
					 self.win_img.prepend(html).show();
					 if(clas=='videoplay'){
						//$this.parent().attr('rel');视频url;
						var url = $this.parent().attr('rel');
						self.videoPlay('http://localhost/web/mySite/sjsk/video/s2.avi');
						self.win_view.css({'top':(self.wh-($('.videoplay').height()+74))/2});
					 }else if(clas=='flaShow'){
					    self.win_view.css({'top':(self.wh-($('.flaShow').height()+74))/2});
					 }
					 self.win_img.children('.loding').hide();
					 self.win_view.show();
					 self.win_view_layer.show();
				 });

				 if(self.op){
					 self.showNext();
					 self.showPrev();
					 self.op = false;
				 }
				 
			  })
			 
			 this.win_view_layer.children('a').on('click',function(){
				  self.win_view.hide();
			      self.win_view_layer.hide();
				  if(clas=='videoplay'){
				     $f().stop();
				  }
			 })
		},
		scale : function(w,h,callback){
			var maxWidth = 685;
			var maxHeight = 666;
		    var hRatio;
			var wRatio;
			var Ratio = 1;
			var bl = w/h;
			wRatio = maxWidth / w;
			hRatio = maxHeight / h;
		    if (wRatio < 1 || hRatio < 1) {
				Ratio = (wRatio < hRatio ? wRatio: hRatio);
			}else if(wRatio>=1&&hRatio>=1){
			    Ratio = 1;
			}
			if (Ratio < 1) {
				w = w * Ratio;
				h = h * Ratio;
			}else if (Ratio == 1){
			    w = w * Ratio;
				h = h * Ratio;
			}
			this.win_img.children(0).hide();
			this.win_img.children('.loding').show();
            callback(w,h);
		},
		showNext : function(){
			this.count = this.count;
			var self = this;
			this.win_view_layer.children('p').eq(1).unbind('click')
			this.win_view_layer.children('p').eq(1).on('click',function(){
                self.count++;
				var w = $('.thumb_img').eq(self.count).data('width'),h=$('.thumb_img').eq(self.count).data('height'),src=$('.thumb').eq(self.count).attr('rel');
				var lm = $('.thumb').eq(self.count).siblings('.desc').html();
				var clas = self.win_img.children(0).attr('class');
				if(self.count<self.len) {
					self.win_view_layer.children('p').eq(0).show();
				    self.scale(w,h,function(w2,h2){
						 var html = '',clas = self.win_img.children(0).attr('class');
						 if(clas=='bigsImg'){
						     html = '<img class="bigsImg" src="'+src+'" height="'+h2+'" widht="'+w2+'">';
						 }else if(clas=='videoplay'){
						     html+='<div class="videoplay">'
							 html+='<div class="player">'
							 html+='<a href="javascript:void(0)" class="closeWow" style="display:none" onclick="$f().stop();"></a>'
							 html+='<div id="players"></div>'
							 html+='</div>'
							 html+='</div>';
						 }else if(clas=='flaShow'){
							html+='<div class="flaShow">'
							html+='<object width="590" height="470" align="middle" classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0" id="undefined">'
							html+= '<param value="always" name="allowScriptAccess">'
							html+= '<param value="'+$this.parent().attr('rel')+'" name="movie">'
							html+=' <param value="high" name="quality">'
							html+= '<param value="#FFFFFF" name="bgcolor">'
							html+= '<param value="transparent" name="wmode">'
							html+= '<param value="false" name="menu">'
							html+= '<embed width="590"  height="470" align="middle" pluginspage="http://www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" wmode="transparent" allowscriptaccess="always" name="undefined" menu="false" quality="high" src="'+$this.parent().attr('rel')+'">'
							html+= '</object>'
							html+='</div>';
						 }
						 self.win_view.find('.desc').empty().append(lm);
					     self.win_view.css({'top':(self.wh-(h2+74))/2});
						 self.win_img.children(0).remove();
						 self.win_img.prepend(html).show();
						 if(clas=='videoplay'){
						    //$this.parent().attr('rel');视频url;
							var url = src;
							self.videoPlay(url);
							self.win_view.css({'top':(self.wh-($('.videoplay').height()+74))/2});
						 }else if(clas=='flaShow'){
							self.win_view.css({'top':(self.wh-($('.flaShow').height()+74))/2});
						 }
						 self.win_img.children('.loding').hide();
						 self.win_view.show();
					});
					if(self.count==self.len-1){
						self.win_view_layer.children('p').eq(1).hide();
					}
				}
		    })
		},
		showPrev : function(){
		    this.count = this.count;
			var self = this;
			this.win_view_layer.children('p').eq(0).unbind('click')
			this.win_view_layer.children('p').eq(0).on('click',function(){
                self.count--;
				var w = $('.thumb_img').eq(self.count).data('width'),h=$('.thumb_img').eq(self.count).data('height'),src=$('.thumb').eq(self.count).attr('rel');
				var lm = $('.thumb').eq(self.count).siblings('.desc').html();
				if(self.count>=0) {
					self.win_view_layer.children('p').eq(1).show();
				    self.scale(w,h,function(w2,h2){
						 var html = '',clas = self.win_img.children(0).attr('class');
						 if(clas=='bigsImg'){
						     html = '<img class="bigsImg" src="'+src+'" height="'+h2+'" widht="'+w2+'">';
						 }else if(clas=='videoplay'){
						     html+='<div class="videoplay">'
							 html+='<div class="player">'
							 html+='<a href="javascript:void(0)" class="closeWow" style="display:none" onclick="$f().stop();"></a>'
							 html+='<div id="players"></div>'
							 html+='</div>'
							 html+='</div>';
						 }else if(clas=='flaShow'){
							html+='<div class="flaShow">'
							html+='<object width="590" height="470" align="middle" classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0" id="undefined">'
							html+= '<param value="always" name="allowScriptAccess">'
							html+= '<param value="'+$this.parent().attr('rel')+'" name="movie">'
							html+=' <param value="high" name="quality">'
							html+= '<param value="#FFFFFF" name="bgcolor">'
							html+= '<param value="transparent" name="wmode">'
							html+= '<param value="false" name="menu">'
							html+= '<embed width="590"  height="470" align="middle" pluginspage="http://www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" wmode="transparent" allowscriptaccess="always" name="undefined" menu="false" quality="high" src="'+$this.parent().attr('rel')+'">'
							html+= '</object>'
							html+='</div>';
						 }
						 self.win_view.find('.desc').empty().append(lm);
						 self.win_img.children(0).remove();
						 self.win_img.prepend(html).show();
						 self.win_view.css({'top':(self.wh-(h2+74))/2});
						 if(clas=='videoplay'){
						    //$this.parent().attr('rel');视频url;
							var url = src;
							self.videoPlay(url);
							self.win_view.css({'top':(self.wh-($('.videoplay').height()+74))/2});
						 }else if(clas=='flaShow'){
							self.win_view.css({'top':(self.wh-($('.flaShow').height()+74))/2});
						 }
						 self.win_img.children('.loding').hide();
						 self.win_view.show();
					})
					if(self.count==0){
					   self.win_view_layer.children('p').eq(0).hide();
					}
				}	
		    })
		},
		showFla : function(o){
		    var htm = '';
		    htm+='<div class="smallFla">'
			htm+='<object width="300" height="300" align="middle" classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0" id="undefined">'
			htm+= '<param value="always" name="allowScriptAccess">'
			htm+= '<param value="http://images.dahei.com/ws-dh22-90akty0618/asdasd.swf" name="movie">'
			htm+=' <param value="high" name="quality">'
			htm+= '<param value="#FFFFFF" name="bgcolor">'
			htm+= '<param value="transparent" name="wmode">'
			htm+= '<param value="false" name="menu">'
			htm+= '<embed width="300"  height="300" align="middle" pluginspage="http://www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" wmode="transparent" allowscriptaccess="always" name="undefined" menu="false" quality="high" src="http://images.dahei.com/ws-dh22-90akty0618/asdasd.swf">'
			htm+= '</object>'
			htm+='</div>';
		    o.on('mouseover',function(){
				var l = parseInt($(this).parents('.wf_item').css('left'))+235,t = parseInt($(this).parents('.wf_item').css('top'))+115;
		        if($(this).offset().left+235>$('.wrap').width()){
		           $('.sflaBox').css({'left':$('.wrap').width()-535,'top':t}).html(htm).show();
				}else{
				   $('.sflaBox').css({'left':l,'top':t}).html(htm).show();
				}
		    });
			o.on('mouseout',function(){
		        $('.sflaBox').empty().hide();
		    });
		},
		youzikujsm : function(dataname,dataguid){
		    var datastr = [], datamd5 = [];
			for (var i = 0; i < dataname.length; i++) {
				var elem = dataname[i];
				$('.allFts').eq(i).addClass(elem);
				var resultStr = $("." + elem).text(); resultStr = Trim(resultStr);
				resultStr = SelectWord(resultStr); datastr.push(resultStr);
				var md5 = $.md5(dataguid[i] + elem + resultStr); datamd5.push(md5);
			}
			var strdatamd5 = datamd5.join(","), strdataguid = dataguid.join(",");
			$.getJSON("http://www.youziku.com/webfont/JSArrayPOST?jsoncallback=?", { "arraymd5": strdatamd5, "arrayguid": strdataguid, "type": "5" }, function (json) {
				var strdo = json.strdo, strdone = json.strdone, arraydo = strdo.split("*"), arraydone = strdone.split("*");
				for(var elem in arraydo){
				    if (elem != null && elem != "") {
						var item = parseInt(elem);
						$.post("http://www.youziku.com/webfont/PostCorsCreateFont", { "name": dataname[item], "gid": dataguid[item], "type": "5", "text": datastr[item] }, function (json) {
							if (json == "0") { //alert("参数不对");
							} else if (json == "2") {//alert("超过每日生成字体数的上限");
							} else if (json == "3") { //alert("当前正在生成请稍后");
							} else {//alert("正在生成");
							}
						});
					}
				}
				/*arraydo.forEach(function (elem) {
					if (elem != null && elem != "") {
						var item = parseInt(elem);
						$.post("http://www.youziku.com/webfont/PostCorsCreateFont", { "name": dataname[item], "gid": dataguid[item], "type": "5", "text": datastr[item] }, function (json) {
							if (json == "0") { //alert("参数不对");
							} else if (json == "2") {//alert("超过每日生成字体数的上限");
							} else if (json == "3") { //alert("当前正在生成请稍后");
							} else {//alert("正在生成");
							}
						});
					}
				})*/
				for(var elem in arraydone){
				    if (elem != null && elem != "") {
						var item = parseInt(elem);
						loadExtentFile("http://www.youziku.com/webfont/CSSJs?id=" + datamd5[item] + "&name=" + dataname[item] + "&guid=" + dataguid[item] + "&type=5");
					}
				}
				/*arraydone.forEach(function (elem) {
					if (elem != null && elem != "") {
						var item = parseInt(elem);
						loadExtentFile("http://www.youziku.com/webfont/CSSJs?id=" + datamd5[item] + "&name=" + dataname[item] + "&guid=" + dataguid[item] + "&type=5");
					}
				})*/
			});
		},
		musicPlay : function(o){
			var self = this,ogg=null,count = o.parents('.wf_item').attr('data-rel'),title = o.data('title'),loadUrl = o.data('loadUrl'),url = o.data('url');
		    $("#jquery_jplayer"+count).jPlayer({
				ready: function () {
					$(this).jPlayer("setMedia", {
						title: title,//loadUrl
						mp3: "video/yy.Mp3"//url
					});
				},
				play: function() { // To avoid multiple jPlayers playing together.
					$(this).jPlayer("pauseOthers");
				},
				swfPath: "js",
				supplied: "m4a,oga,mp3,mp4",
				cssSelectorAncestor: "#jp_container_"+count,
				wmode: "window",
				globalVolume: true,
				smoothPlayBar: true,
				keyEnabled: true
			});
		}
	};

})(jQuery, window, document);