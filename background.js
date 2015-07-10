var alarmName = "updateDDNS";

chrome.storage.local.get("info",function(obj){
		var info=obj.info;
		var updateInterval;
		updateInterval = info.updateInterval || 60;
		chrome.alarms.create(alarmName, {
				delayInMinutes : parseInt(updateInterval),
				periodInMinutes : parseInt(updateInterval)
		});
});
chrome.alarms.onAlarm.addListener(function(alarm) {
	console.log(alarm,alarm.name);
	if (alarm.name !== "updateDDNS") {
		return false;
	}
	chrome.storage.local.get("info",function(obj){
			var info=obj.info;
		var token = info.token;
		var hostname = info.hostname;
		if (token && hostname) {
			updateCsieIoDDNS( token, hostname);
		} else {
			console.error("onAlarm:  token or hostname setting error");
			chrome.alarms.clear("updateDDNS", function(wasCleared) {
				console.log("updateDDNS alarm clear");
			});
		}
	});

});

function updateCsieIoDDNS(token, hostname , noti) {//params.noti can only be true or not set, just for force update
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'https://csie.io/update?hn=' + hostname + '&token=' + token + '&ip=' );
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			if (xhr.status == 200) {
				//console.log(xhr.responseText);
				chrome.storage.local.get("info",function(obj){
						var info=obj.info || {};
						noti = noti || info.option_useNotification;
						if(noti == true){
							notification(xhr.responseText);
						}
				});

			} else {
				console.error(xhr.responseText);
			}
		}
	};
	xhr.send();
}
function notification(data){

	var mesg = "fail";
	if (data == "OK") {
		mesg = "csie.io DDNS success";
	} else if (data == "KO") {
		mesg = "Wrong token or hostname!\nPlease check again.";
	}
	var opt = {
		type : "basic",
		title : "csie.io DDNS update",
		message : mesg,
		iconUrl : "img/csieio-128.png"

	};

	chrome.notifications.create("id" + Math.random(), opt, function(id) {
		console.log(id);
	});

}
chrome.app.runtime.onLaunched.addListener(function(){
		chrome.app.window.create('option.html', {
				'innerBounds': {
						'width': 750,
						'height': 500
				}
		});

});
