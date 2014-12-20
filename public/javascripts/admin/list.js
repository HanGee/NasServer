$(function list () {
	
	var api_url = '/apis/folder';
	$.get(api_url, function (data) {
		var Json = data;
		var JsonIndex = 0;
		var Task = new Array();
		
		while (Json[JsonIndex]!=null){
			Task.push(Json[JsonIndex]);
			JsonIndex=JsonIndex+1;			
		};
		$( "<tr>" ).appendTo( ".well" );
		for (var Index = 0; Index < Task.length; Index++) {
			$( "<p>" ).appendTo( ".well" );
			$( "<td><div class=\"admin\"><div style=\"font-size: 8px;\">"+Task[Index]['path']+"</div></div>").appendTo( ".well" );
		}		
		
	});
})
