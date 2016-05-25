// JavaScript Document

function ajaxFun(){
    
}
ajaxFun.prototype = {
    init : function(){
	   this.funcAjax();
	   this.wh = $(window).height();
	   this.wd = $(window).width();
	   this.count = 0;
	   this.data = '';
	   this.ops = 1;
	   this.yem = 4;
	   this.sdy = 0;
	},
	funcAjax : function(){
		var self = this;
		$.ajax({
			type: 'GET',
			url: 'http://www.wookmark.com/api/json/popular?callback=?',
			cache: false,
			data: {'page': 1},
			dataType:'jsonp',
			timeout: 60000,
			success: function(data){
				var len = data.length;
				self.data = data;
				self.getPage(len,data);
			},
			error: function(){}
	    })
    },
	getPage : function(l,data){
	    var num = Math.ceil(l/12),html='', self = this;
		$('<div>').addClass('wf_loading wf_result').appendTo($('.waterfall')).show();
	    for(var i=1; i<=num;i++){
		   if(i==1){
		       html+= '<a href="javascript:void(0);" class="on">'+i+'</a>'; 
		   }else{
		       html+= '<a href="javascript:void(0);">'+i+'</a>'; 
		   }
	    }
		$('.pageList').children('em').css({'width':num*30});
		if(num<=self.yem){
	       $('.pageList').css({'width':num*30-6});
		}else{
		   $('.pageList').css({'width':self.yem*30-6});
		}
		$('.pageList').children('em').empty().append(html);
		$('.pageList').children('em').children('a').unbind('click');
	    $('.pageList').children('em').children('a').on('click',function(){
		    var d = $(this).index();
			self.sdy = d;
			$(this).addClass('on').siblings().removeClass('on');
			self.GoToFirstPage(d,num);
		    self.changPages(d,data);
	    });
		$('.nesPage').children('.prev').unbind('click');
		$('.nesPage').children('.prev').on('click',function(){
		   self.sdy--;
		   if(self.sdy>=0){
			  $('.pageList').children('em').children('a').eq(self.sdy).addClass('on').siblings().removeClass('on');
			  self.GoToFirstPage(self.sdy,num);
		      self.changPages(self.sdy,data);
		   }else{
			  self.sdy = 0;
		      alert('已经是第一页')
		   }
		});
		$('.nesPage').children('.next').unbind('click');
		$('.nesPage').children('.next').on('click',function(){
		   self.sdy++;
		   if(self.sdy<num){
			  $('.pageList').children('em').children('a').eq(self.sdy).addClass('on').siblings().removeClass('on');
			  self.GoToFirstPage(self.sdy,num);
		      self.changPages(self.sdy,data);
		   }else{
			  self.sdy = num-1;
		      alert('已经是最后一页')
		   }
		});
		$('#btnSearch').unbind('click');
		$('#btnSearch').on('click',function(){
		     var test = $('#txtSearch').val().replace(/(^\s+)|(\s+$)/g,"");
			 self.GoToAppointPage(test,num);
		})
		self.changPages(0,data);
	},
	changPages : function(d,data){
	       var s = d*12,e = d*12+12,flahtml=[],self=this;
		   for(var i=s; i<e;i++){
			  var suj = data[i]
			  if(suj){
				 var url = data[i].image,tx = 'images/tx.gif',title = data[i].title,downloadurl = data[i].url; 
				 flahtml.push( '<div class="wf_item"><div class="flas" data-rel="'+url+'" data-ajax="'+i+'">'+
									 '<object width="220" height="250" align="middle" classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000"'+ 
									 'codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0" id="undefined">'+
										'<param value="always" name="allowScriptAccess">'+
										'<param value="'+url+'" name="movie">'+
										'<param value="high" name="quality">'+
										'<param value="#FFFFFF" name="bgcolor">'+
										'<param value="transparent" name="wmode">'+
										'<param value="false" name="menu">'+
										'<embed width="220"  height="250" align="middle" pluginspage="http://www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" wmode="transparent" allowscriptaccess="always" name="undefined" menu="false" quality="high" src="'+url+'">'+
									'</object>'+
								'</div>'+
								'<div class="fmlock"></div>'+
								'<p class="desc clearfix"><img src="'+tx+'" class="ph"><a href="javascript:void(0)" class="name">'+title+'</a><a target="_blank" href="'+downloadurl+'" class="download">下载</a> </p></div>');
					
			  }  
		   }
		   $('.wf_col').empty().append(flahtml.join(''));
		   $('.wf_result').hide();
		   this.setCells();
		   $('.wf_item').unbind('click');
		   $('.wf_item').on('click',function(){
		        self.showTan($(this))
		   })
	},
	setCells : function(){
	     var colNum = 0,pcolNum=5,self=this,timer = null,
			i = 0,
			backTop_left =  0,
			speed = 0,
			colWidth = 235,
			wf_item_top = 0,
			colsHeight = [],
			$wf_col = $('.wf_col'),
			isAnimation = true,
			marginTop = 15;
			marginLeft = 15;
		// 计算出当前屏幕可以排多少列
		//colNum = Math.floor(($wf_box.width() + opts.marginLeft) / (opts.colWidth + opts.marginLeft));
	
		if($(window).width()<1200){colNum=4}else{
		   colNum = Math.floor(($(window).width() - 200) / (colWidth + marginLeft));
		}
	
		var oPw = colNum*(colWidth + marginLeft)-marginLeft;
		$('.wrap').width(oPw);
		$('#TagsList').width(oPw - 100);
		$('.topBar').children('.center ').width(oPw);
		$('.barRi').width(oPw - 302);
		if(colNum > 0 && colNum !== pcolNum){
			pcolNum = colNum;
			$wf_col.width((colWidth+marginLeft) * colNum - marginLeft);
			
			// 重新调整存储列
			for(i=0; i<colNum; i++){
				colsHeight[i] = 0;
			}
			colsHeight.length = pcolNum;
			
			$wf_col_items = $wf_col.children('.wf_item');
			$wf_col_items.each(function(num, value){
				minColsIndex = self.getColsIndex(colsHeight)[0];
				wf_item_top = colsHeight[minColsIndex] + marginTop;
				wf_item_left = minColsIndex * (colWidth + marginLeft);
				
				
				if(isAnimation) speed = 300;
				$(this).css({'top':0,'left':0}).width(colWidth).animate({
												left:wf_item_left, 
												top:wf_item_top
											}, {duration:300,easing:'swing'});
				
				
				colsHeight[minColsIndex] = wf_item_top + $(this).outerHeight();
			});
			
			self.getColsIndex(colsHeight);
			$wf_col.height(colsHeight.maxHeight);
		}
		$(window).on('resize', function(){
			self.wd = $(window).width();
			self.wh = $(window).height()
			clearTimeout(timer);
			timer=setTimeout(function(){
			    self.setCells();
			},100);
		});
	},
	getColsIndex : function(arr){
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
	},
	showTan : function(o){
	    var url=o.children().attr('data-rel'),html='',lm=o.children('.desc').html(),self=this;
		self.count=o.children().attr('data-ajax');
		html+='<div class="flaShow">'
							html+='<object width="590" height="470" align="middle" classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0" id="undefined">'
							html+= '<param value="always" name="allowScriptAccess">'
							html+= '<param value="'+url+'" name="movie">'
							html+=' <param value="high" name="quality">'
							html+= '<param value="#FFFFFF" name="bgcolor">'
							html+= '<param value="transparent" name="wmode">'
							html+= '<param value="false" name="menu">'
							html+= '<embed width="590"  height="470" align="middle" pluginspage="http://www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" wmode="transparent" allowscriptaccess="always" name="undefined" menu="false" quality="high" src="'+url+'">'
							html+= '</object>'
							html+='</div>';
         $('.win_view').find('.desc').empty().append(lm);
		 $('.win_img').empty().append(html);
		 $('.win_view').css({'top':(self.wh-$('.win_view').height())/2});
		 $('.win_view').show();
		 $('.win_view_layer').css({width:self.wd,'height':self.wh}).show();
		 if(self.count<=0){
			 $('.win_view_layer').children('p').eq(0).hide();
		 }else if(self.count>=self.data.length-1){
		      $('.win_view_layer').children('p').eq(1).hide();
		 }else{
		      $('.win_view_layer').children('p').show();
		 }
		 $('.win_view_layer').children('p').unbind('cilck');
	     $('.win_view_layer').children('p').on('click',function(){
			  if(self.ops){
				  self.ops = 0;
		          var fx = $(this).index();
				  if(fx==1){
					   self.showPrev()
				  }else if(fx==2){
					   self.showNext()
				  }
			  }
		 })
		 $('.win_view_layer').children('a').unbind('cilck');
		 $('.win_view_layer').children('a').on('click',function(){
		     $('.win_view').hide();
			 $('.win_view_layer').hide();
		 }) 
	},
	showPrev : function(){
	   this.count--;
	   if(this.count<=0){$('.win_view_layer').children('p').eq(0).hide();}else{$('.win_view_layer').children('p').show();}
	   var url = this.data[this.count].image,html='',title = this.data[this.count].title,tx = 'images/tx.gif',lm='',downloadurl = this.data[this.count].url;
	   lm='<p class="desc clearfix"><img src="'+tx+'" class="ph"><a href="javascript:void(0)" class="name">'+title+'</a><a target="_blank" href="'+downloadurl+'" class="download">下载</a></p></div>';
	   html+='<div class="flaShow">'
				html+='<object width="590" height="470" align="middle" classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0" id="undefined">'
				html+= '<param value="always" name="allowScriptAccess">'
				html+= '<param value="'+url+'" name="movie">'
				html+=' <param value="high" name="quality">'
				html+= '<param value="#FFFFFF" name="bgcolor">'
				html+= '<param value="transparent" name="wmode">'
				html+= '<param value="false" name="menu">'
				html+= '<embed width="590"  height="470" align="middle" pluginspage="http://www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" wmode="transparent" allowscriptaccess="always" name="undefined" menu="false" quality="high" src="'+url+'">'
				html+= '</object>'
				html+='</div>';
		$('.win_view').find('.desc').empty().append(lm);
	    $('.win_img').empty().append(html);
		this.ops = 1;
	},
	showNext : function(n){
	    this.count++;
		if(this.count>=this.data.length-1){$('.win_view_layer').children('p').eq(1).hide();}else{$('.win_view_layer').children('p').show();}
	    var url = this.data[this.count].image,html='',title = this.data[this.count].title,tx = 'images/tx.gif',lm='',downloadurl = this.data[this.count].url;
		lm='<p class="desc clearfix"><img src="'+tx+'" class="ph"><a href="javascript:void(0)" class="name">'+title+'</a><a target="_blank" href="'+downloadurl+'" class="download">下载</a></p></div>';
		html+='<div class="flaShow">'
				html+='<object width="590" height="470" align="middle" classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0" id="undefined">'
				html+= '<param value="always" name="allowScriptAccess">'
				html+= '<param value="'+url+'" name="movie">'
				html+=' <param value="high" name="quality">'
				html+= '<param value="#FFFFFF" name="bgcolor">'
				html+= '<param value="transparent" name="wmode">'
				html+= '<param value="false" name="menu">'
				html+= '<embed width="590"  height="470" align="middle" pluginspage="http://www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" wmode="transparent" allowscriptaccess="always" name="undefined" menu="false" quality="high" src="'+url+'">'
				html+= '</object>'
				html+='</div>';
		$('.win_view').find('.desc').empty().append(lm);
		$('.win_img').empty().append(html);
		this.ops = 1;
	},
	GoToFirstPage : function(pageIndex,num){
	     var lc =Math.ceil(this.yem/2);
		 var slef = parseInt($('.pageList > em > a').eq(0).outerWidth(true))*(lc-pageIndex);
		 var pol = parseInt($('.pageList > em').position().left);
		 var Max = (num-this.yem)*parseInt($('.pageList > em > a').eq(0).outerWidth(true))
		 if(num>this.yem){
			 if((pol+slef)<-Max){
				if(pol>slef)
				{
				  $('.pageList > em').animate({'left':-Max})
				}else{
				   $('.pageList > em').animate({'left':slef})
				}
			 }else if(parseInt(pol+slef)>=0){
				$('.pageList > em').animate({'left':0})
			 }else{
				if(slef>0){
					$('.pageList > em').animate({'left':0})
				}else{
					$('.pageList > em').animate({'left':slef})
				}
			 }
		 }
	},
	GoToAppointPage : function(test,count){
	    var page = test,self=this;
		if (page=='') {
			alert("请输入数字!");
		} else {
			var pageIndex = parseInt(page);
			if (pageIndex <= 0 || pageIndex > count) { 
				alert("请输入有效的页面范围!");
			} else {
				$('.pageList').children('em').children('a').eq(page-1).addClass('on').siblings().removeClass('on');
				self.sdy = page-1;
				self.GoToFirstPage(page-1,count);
		        self.changPages(page-1,self.data);
			}
		}
	}
}


