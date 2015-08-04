document.addEventListener('DOMContentLoaded', function() {
		chrome.storage.local.get(["info", "powerStatus"],function(obj){
				var info=obj.info||{};
				info.powerStatus = obj.powerStatus;
				init(info);
		});
});
function ddnsStop(){
	var powerStatus = document.getElementById("powerStatus");
	powerStatus.className = "powerOFF";
	powerStatus.src = chrome.runtime.getURL("img/power_off.png");
	powerStatus.title = "Not running";
	chrome.storage.local.set({'powerStatus':false});
	chrome.alarms.clear("updateDDNS");
	cancelBackground();
}
function ddnsStart(){
	if(token.value === "" || hostname.value === "" ){
		ddnsStop();
		return;
	}
	askBackground(function(){
		if(chrome.runtime.lastError){
			ddnsStop();
		}
		chrome.storage.local.get("info",function(obj){
			var info=obj.info||{};
			var updateInterval = info.updateInterval || 60;
			if(isEmptyObject(info)){
				saveInfo();
			}
			chrome.alarms.create("updateDDNS", {
				delayInMinutes : parseInt(updateInterval),
				periodInMinutes : parseInt(updateInterval)
			});
			chrome.alarms.get("updateDDNS",function(alarm){
				if(alarm){
					var powerStatus = document.getElementById("powerStatus");
					powerStatus.className = "powerON";
					powerStatus.src=powerStatus.src=chrome.runtime.getURL("img/power_on.png");
					powerStatus.title = "正在運行中...";
					console.log(alarm);
				}
				else{
					console.log("no alarm:"+alarm);
				}
			});
			updateCsieIoDDNS(info.token,info.hostname, true);
		});
		chrome.storage.local.set({'powerStatus':true});

	});




}
function init(info){
	//add listenser for save
	var save = document.getElementById("save");

	save.addEventListener("click", saveInfo);


	//load state for isNotification
	var useNotification = document.getElementById("useNotification");
	useNotification.checked = (info.option_useLocalNotification ) ? true : false;

	//load state for line Notification
	var useLineNotification = document.getElementById("useLineNotification");
	useLineNotification.checked = (info.option_useLineNotification ) ? true : false;
	var lineToken = document.getElementById("lineToken");
	lineToken.value = info.lineToken || "";

	//display saved value
	var hostname = document.getElementById("hostname");
	var token = document.getElementById("token");
	var updateInterval = document.getElementById("updateInterval");

	hostname.value = info.hostname || "";
	token.value = info.token || "";
	updateInterval.value = info.updateInterval || 60;

	/* show advance setting*/
	var advOptionTopbar = document.getElementById('advOptionTopbar');
	var advOptContainer = document.getElementById('advOptionContainer');
	advOptContainer.style.display = "none";
	advOptionTopbar.addEventListener("click" , function(e){
		if(advOptContainer.style && advOptContainer.style.display == "none"){
			advOptContainer.style.display = "block";
			advOptionTopbar.innerHTML = '-' + advOptionTopbar.innerText.slice(1);
		}else{
			advOptContainer.style.display = "none";
			advOptionTopbar.innerHTML = '+' + advOptionTopbar.innerText.slice(1);
		}
		e.stopPropagation();
	}, false);

	//load state for isNotification
	var powerStatus = document.getElementById("powerStatus");
	if(info.powerStatus == true){
		ddnsStart();
	}
	else{
		ddnsStop();
	}
	powerStatus.addEventListener("click", function() {
		if(powerStatus.className === "powerON"){
			ddnsStop();
		}else{
			ddnsStart();
		}
	});

}
function askBackground(callback) {

	// Permissions must be requested from inside a user gesture, like a button's
	// click handler.
	chrome.permissions.contains({
		permissions: ['background']
	}, function(result) {
		if (result) {
			if(callback) callback();
		}
		else {
			chrome.permissions.request({
				permissions : ['background']
			}, function(granted) {
				// The callback argument will be true if the user granted the permissions.
				var opt={};
				if (granted) {
					opt = {
						type : "basic",
						title : "csie.io DDNS update",
						message : "Power ON",
						iconUrl : "img/csieio-128.png"
					};

					chrome.notifications.create("id" + Math.random(), opt, function(id) {
						console.log(id);
					});
					if(callback) callback();
				} else {
					opt = {
						type : "basic",
						title : "csie.io DDNS update",
						message : "request background permissions fail",
						iconUrl : "img/csieio-128.png"

					};

					chrome.notifications.create("id" + Math.random(), opt, function(id) {
						console.log(id);
					});
				}
			});
		}
	});

}

function cancelBackground(callback) {
	chrome.permissions.remove({
		permissions : ['background'],
	}, function(removed) {
		if (removed) {
			var opt = {
				type : "basic",
				title : "csie.io DDNS update",
				message : "Power OFF",
				iconUrl : "img/csieio-128.png"
			};
			chrome.notifications.create("id" + Math.random(), opt, function(id) {
				console.log(id);
			});
			if(callback) callback();
		} else {
		}
	});
}

function saveInfo() {
	var hostname = document.getElementById("hostname");
	var token = document.getElementById("token");
	var updateInterval = document.getElementById("updateInterval");
	var useNotification = document.getElementById("useNotification");
	var useLineNotification = document.getElementById("useLineNotification");
	var lineToken = document.getElementById("lineToken");
	var info={};
	//TODO save oldIP;



	info["option_useLocalNotification"]= useNotification.checked;
	info["option_useLineNotification"]= useLineNotification.checked;
	info["lineToken"] = lineToken.value;
	info['hostname']= hostname.value;
	info['token']= token.value;
	info['updateInterval']= updateInterval.value;

	chrome.alarms.create("updateDDNS", {
		delayInMinutes : parseInt(updateInterval.value),
		periodInMinutes : parseInt(updateInterval.value)
	});

	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'http://checkip.amazonaws.com/' );
	xhr.onreadystatechange = function(){
		if (xhr.readyState == XMLHttpRequest.DONE) {
			if(xhr.status == 200) {
				info.oldIP = xhr.responseText;
			}
			else{
				console.log(xhr.responseText);
			}
			chrome.storage.local.set({'info':info},function(){
				if(chrome.runtime.lastError){
					notification("save error!");
					return;
				}
			});
		}
	};
	xhr.send();


}


function updateCsieIoDDNS(token, hostname, noti) {//params.noti can only be true or not set
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'https://csie.io/update?hn=' + hostname + '&token=' + token + '&ip=' );
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			if (xhr.status == 200) {
					chrome.storage.local.get("info",function(obj){
							var info=obj.info || {};
							if (noti ) {
								noti = {};
								noti.useLocal = info.option_useLocalNotification;
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
 * @param {{useLocal:Boolean, useLine: Boolean}} notiOptions
 */
function notification(data , notiOptions) {
	if(notiOptions.useLocal || !notiOptions) {
		var mesg = "fail";
		if (data == "OK") {
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

}
function isEmptyObject(obj){
	return Object.keys(obj).length===0
}