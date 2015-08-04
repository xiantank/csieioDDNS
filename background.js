var alarmName = "updateDDNS";
chrome.storage.local.get("powerStatus",function(obj){
	var powerStatus = obj.powerStatus;
	if (powerStatus) {
		chrome.alarms.get("updateDDNS",function(alarm){
			if(alarm) {
				init();
			}
		});
	}
});
chrome.alarms.onAlarm.addListener(function (alarm) {
	console.log(alarm, alarm.name);
	if (alarm.name !== "updateDDNS") {
		return false;
	}
	chrome.storage.local.get(["info", "powerStatus"], function (obj) {
		var powerStatus =obj.powerStatus;
		if(!powerStatus){
			chrome.alarms.clear("updateDDNS", function (wasCleared) {
				console.log("updateDDNS alarm clear");
			});
			return;
		}
		var info = obj.info;
		var token = info.token;
		var hostname = info.hostname;
		var oldIP = info.oldIP || "";
		if (token && hostname) {
			//get IP to reduce duplicate update
			var xhr = new XMLHttpRequest();
			xhr.open('GET', 'http://checkip.amazonaws.com/' );
			xhr.onreadystatechange = function(){
				if (xhr.readyState == XMLHttpRequest.DONE) {
					if(xhr.status == 200) {
						if(oldIP !== xhr.responseText) {
							info.oldIP = xhr.responseText;
							chrome.storage.local.set({'info':info},function(){
								updateCsieIoDDNS(token, hostname);
							});

						}
					}
					else{//if we can't IP, still update , server not need IP
						info.oldIP = "";
						chrome.storage.local.set({'info':info},function(){
							updateCsieIoDDNS(token, hostname);
						});
					}
					/* */

				}
			};
			xhr.send();
		} else {
			console.error("onAlarm:  token or hostname setting error");
			chrome.alarms.clear("updateDDNS", function (wasCleared) {
				console.log("updateDDNS alarm clear");
				chrome.storage.local.set({'powerStatus':false});
			});

		}
	});
});
function init() {
	chrome.storage.local.get("info", function (obj) {
		var info = obj.info;
		var updateInterval;
		updateInterval = info.updateInterval || 60;
		chrome.alarms.create(alarmName, {
			delayInMinutes: parseInt(updateInterval),
			periodInMinutes: parseInt(updateInterval)
		});
	});
}


function updateCsieIoDDNS(token, hostname, noti) {//params.noti can only be true or not set
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'https://csie.io/update?hn=' + hostname + '&token=' + token + '&ip=' );
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			if (xhr.status == 200) {
				chrome.storage.local.get("info",function(obj){
					var info=obj.info || {};
					if (info.option_useLineNotification || info.option_useLocalNotification ) {
						noti = {};
						noti.useLocal = info.option_useLocalNotification;
						if(info.lineToken){
							if(info.lineToken !== "") {
								noti.useLine = info.option_useLineNotification;
								noti.lineToken = info.lineToken;
							}
						}

						notification(xhr.responseText , noti);
					}
				});
			} else {
				console.error(xhr.responseText);
			}
		}
	};
	xhr.send();
}
/**
 *
 * @param {string} data
 * @param {{useLocal:Boolean, useLine: Boolean, lineToken: string}} notiOptions
 */
function notification(data , notiOptions) {
	if(notiOptions.useLocal || !notiOptions) {
		var mesg = "fail";
		if (data == "OK") {
			var ip = obj.info.oldIP || "";
			mesg = "csie.io DDNS update success";
		} else if (data == "KO") {
			mesg = "Wrong token or hostname!\nPlease check again.";
		}
		var opt = {
			type: "basic",
			title: "csie.io DDNS update",
			message: mesg,
			iconUrl: "img/csieio-128.png"

		};

		chrome.notifications.create("id" + Math.random(), opt, function (id) {
			console.log(id);
		});
	}
	if(notiOptions.useLine && notiOptions.lineToken != ""){
		chrome.storage.local.get( "info", function (obj) {
			var ip = obj.info.oldIP || "";
			if(ip === ""){
				return;
			}
			var xhr = new XMLHttpRequest();
			xhr.open('GET', 'https://csie.io/lineme?token=' + notiOptions.lineToken + "&msg=" + "偵測到IP改變，新的IP為:" + ip);
			xhr.onreadystatechange = function () {
				if (xhr.readyState == XMLHttpRequest.DONE) {
				}
			};
			xhr.send();
		});
	}

}
/*
function updateCsieIoDDNS(token, hostname , noti) {//params.noti can only be true or not set, just for force update
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'https://csie.io/update?hn=' + hostname + '&token=' + token + '&ip=' );
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			if (xhr.status == 200) {
				//console.log(xhr.responseText);
				chrome.storage.local.get("info",function(obj){
						var info=obj.info || {};
						noti = noti || info.option_useLocalNotification;
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
*/
chrome.app.runtime.onLaunched.addListener(function(){
		chrome.app.window.create('option.html', {
				'innerBounds': {
						'width': 750,
						'height': 500
				}
		});

});
