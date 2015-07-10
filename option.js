document.addEventListener('DOMContentLoaded', function() {
		chrome.storage.local.get("info",function(obj){
				var info=obj.info||{};
				init(info);
		});
});
function init(info){
	//add listenser for save
	var save = document.getElementById("save");

	save.addEventListener("click", saveInfo);

	//add listenser for usePrivateIP checkbox
	var usePrivateIP = document.getElementById("usePrivateIP");
	usePrivateIP.checked = (info.option_usePrivateIP) ? true : false;

	//load state for isNotification
	var useNotification = document.getElementById("useNotification");
	useNotification.checked = (info.option_useNotification ) ? true : false;
	//load state for isNotification
	var useBackground = document.getElementById("useBackground");
	useBackground.checked = (info.option_useBackground ) ? true : false;

	//add listenser for force update
	var forceUpdate = document.getElementById("forceUpdate");
	forceUpdate.addEventListener("click", function() {
		var hostname = document.getElementById("hostname");
		var token = document.getElementById("token");
		var updateInterval = document.getElementById("updateInterval");
		var usePrivateIP = document.getElementById("usePrivateIP");
		getIP(function(ip) {
			updateCsieIoDDNS((usePrivateIP.checked) ? ip : false, token.value, hostname.value, "true");
		});
	});

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
			advOptionTopbar.innerHTML = "- advanced options";
		}else{
			advOptContainer.style.display = "none";
			advOptionTopbar.innerHTML = "+ advanced options";
		}
		e.stopPropagation();
	}, false);

}
function askBackground() {

	// Permissions must be requested from inside a user gesture, like a button's
	// click handler.
	chrome.permissions.request({
		permissions : ['background']
	}, function(granted) {
		// The callback argument will be true if the user granted the permissions.
		if (granted) {
			var opt = {
				type : "basic",
				title : "csie.io DDNS update",
				message : "run in background",
				iconUrl : "img/csieio-128.png"
			};

			chrome.notifications.create("id" + Math.random(), opt, function(id) {
				console.log(id);
			});
		} else {
			var opt = {
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

function cancelBackground() {
	chrome.permissions.remove({
		permissions : ['background'],
	}, function(removed) {
		if (removed) {
			var opt = {
				type : "basic",
				title : "csie.io DDNS update",
				message : "Not run in background",
				iconUrl : "img/csieio-128.png"
			};
			chrome.notifications.create("id" + Math.random(), opt, function(id) {
				console.log(id);
			});
		} else {
		}
	});
}

function saveInfo() {
	var hostname = document.getElementById("hostname");
	var token = document.getElementById("token");
	var updateInterval = document.getElementById("updateInterval");
	var usePrivateIP = document.getElementById("usePrivateIP");
	var useBackground = document.getElementById("useBackground");

	if (useBackground.checked) {
		askBackground();
	} else {
		cancelBackground();
	}
	var info={}


	info["option_usePrivateIP"] = usePrivateIP.checked;
	info["option_useNotification"]= useNotification.checked;
	info["option_useBackground"]= useBackground.checked;
	info['hostname']= hostname.value;
	info['token']= token.value;
	info['updateInterval']= updateInterval.value;
	chrome.storage.local.set({'info':info});

	chrome.alarms.create("updateDDNS", {
		delayInMinutes : parseInt(updateInterval.value),
		periodInMinutes : parseInt(updateInterval.value)
	});

}

function getIP(callback) {

	var usePrivateIP = document.getElementById("usePrivateIP").checked;
	if (usePrivateIP === true) {
		getLocalIPs(function(privateIP) {
			var ip_local = privateIP;
			callback(ip_local);
		});
		return;
	}

	//jsonp for ip
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "http://api.hostip.info/get_json.php");
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			if (xhr.status == 200) {
				try {
					var data = JSON.parse(xhr.responseText);
					callback(data.ip);
				} catch(e) {
					return false;
				}
			} else {
				console.error(xhr.responseText);
			}
		}
	};
	xhr.send();
}

function updateCsieIoDDNS(ip, token, hostname, noti) {//params.noti can only be true or not set, just for force update
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'https://csie.io/update?hn=' + hostname + '&token=' + token + ((ip) ? '&ip=' + ip : ""));
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			if (xhr.status == 200) {
					chrome.storage.local.get("info",function(obj){
							var info=obj.info || {};
							noti = noti || info.option_useNotification;
							if (noti ) {
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

function notification(data) {

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

function getLocalIPs(callback) {
	var ips = [];
	var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
	var pc = new RTCPeerConnection({
		iceServers : []
	});
	pc.createDataChannel('');
	pc.onicecandidate = function(e) {
		if (!e.candidate) {
			callback(ips[0]);
			return;
		}
		var ip = /(\d+\.\d+\.\d+\.\d+)/.exec(e.candidate.candidate)[1];
		if (ips.indexOf(ip) == -1)
			ips.push(ip);
	};
	pc.createOffer(function(sdp) {
		pc.setLocalDescription(sdp);
	}, function onerror() {
	});
}

