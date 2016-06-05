document.addEventListener('DOMContentLoaded', function () {
	chrome.storage.local.get(["config", "powerStatus"], function (obj) {
		var config = obj.config || {};
		config.powerStatus = obj.powerStatus;
		init(config);
	});
});
function ddnsStop() {
	var powerStatus = document.getElementById("powerStatus");
	powerStatus.className = "powerOFF";
	powerStatus.src = chrome.runtime.getURL("img/power_off.png");
	powerStatus.title = "Not running";
	cancelBackground();
	return new Promise(resolve=> {
		chrome.runtime.sendMessage({powerStatus: false});

	});
}
function ddnsStart() {
	if (token.value === "" || hostname.value === "") {
		ddnsStop();
		return;
	}
	askBackground(function () {
		if (chrome.runtime.lastError) {
			ddnsStop();
		}

		return new Promise(resolve=> {
			chrome.runtime.sendMessage({powerStatus: true});
			let powerStatus = document.getElementById("powerStatus");
			powerStatus.className = "powerON";
			powerStatus.src = powerStatus.src = chrome.runtime.getURL("img/power_on.png");
			powerStatus.title = "正在運行中...";
		});
	});
}
function init(info) {
	//add listenser for save
	var save = document.getElementById("save");

	save.addEventListener("click", saveInfo);

	//load state for isNotification
	var useNotification = document.getElementById("useNotification");
	useNotification.checked = info.notifyStrategy && (info.notifyStrategy.indexOf("chrome") !== -1 );

	//load state for IM Notification
	var useLineNotification = document.getElementById("useLineNotification");
	useLineNotification.checked = info.notifyStrategy && (info.notifyStrategy.indexOf("line") !== -1 );

	var useFBNotification = document.getElementById("useFBNotification");
	useFBNotification.checked = info.notifyStrategy && (info.notifyStrategy.indexOf("fb") !== -1 );

	var imToken = document.getElementById("imToken");
	imToken.value = info.imToken || "";

	//display saved value
	var hostname = document.getElementById("hostname");
	var token = document.getElementById("token");
	var updateInterval = document.getElementById("updateInterval");

	hostname.value = info.hostname || "";
	token.value = info.ddnsToken || "";
	updateInterval.value = info.interval || 60;

	/* show advance setting*/
	var advOptionTopbar = document.getElementById('advOptionTopbar');
	var advOptContainer = document.getElementById('advOptionContainer');
	advOptContainer.style.display = "none";
	advOptionTopbar.addEventListener("click", function (e) {
		if (advOptContainer.style && advOptContainer.style.display == "none") {
			advOptContainer.style.display = "block";
			advOptionTopbar.innerHTML = '-' + advOptionTopbar.innerText.slice(1);
		} else {
			advOptContainer.style.display = "none";
			advOptionTopbar.innerHTML = '+' + advOptionTopbar.innerText.slice(1);
		}
		e.stopPropagation();
	}, false);

	//load state for isNotification
	var powerStatus = document.getElementById("powerStatus");
	if (info.powerStatus == true) {
		ddnsStart();
	}
	else {
		ddnsStop();
	}
	powerStatus.addEventListener("click", function () {
		if (powerStatus.className === "powerON") {
			ddnsStop();
		} else {
			ddnsStart();
		}
	});
}
function askBackground(callback) {

	// Permissions must be requested from inside a user gesture, like a button's
	// click handler.
	chrome.permissions.contains({
		permissions: ['background']
	}, function (result) {
		if (result) {
			if (callback) callback();
		}
		else {
			chrome.permissions.request({
				permissions: ['background']
			}, function (granted) {
				// The callback argument will be true if the user granted the permissions.
				var opt = {};
				if (granted) {
					opt = {
						type: "basic",
						title: "csie.io DDNS update",
						message: "Power ON",
						iconUrl: "img/csieio-128.png"
					};

					chrome.notifications.create("id" + Math.random(), opt, function (id) {
						console.log(id);
					});
					if (callback) callback();
				} else {
					opt = {
						type: "basic",
						title: "csie.io DDNS update",
						message: "request background permissions fail",
						iconUrl: "img/csieio-128.png"

					};
					chrome.notifications.create("id" + Math.random(), opt, function (id) {
						console.log(id);
					});
				}
			});
		}
	});
}

function cancelBackground(callback) {
	chrome.permissions.remove({
		permissions: ['background']
	}, function (removed) {
		if (removed) {
			var opt = {
				type: "basic",
				title: "csie.io DDNS update",
				message: "Power OFF",
				iconUrl: "img/csieio-128.png"
			};
			chrome.notifications.create("id" + Math.random(), opt, function (id) {
				console.log(id);
			});
			if (callback) callback();
		} else {
		}
	});
}

function saveInfo() {
	var hostname = document.getElementById("hostname").value;
	var token = document.getElementById("token").value;
	var updateInterval = document.getElementById("updateInterval").value;
	var useNotification = document.getElementById("useNotification").checked;
	var useLineNotification = document.getElementById("useLineNotification").checked;
	let useFBNotification = document.getElementById("useFBNotification").checked;
	var lineToken = document.getElementById("imToken").value;

	var info = {};

	let config = {};
	config.hostname = hostname;
	config.ddnsToken = token;
	config.imToken = lineToken;
	config.interval = updateInterval;
	config.notifyStrategy = [];
	if (useLineNotification) config.notifyStrategy.push("line");
	if (useFBNotification) config.notifyStrategy.push("fb");
	if (useNotification) config.notifyStrategy.push("chrome");

	return new Promise((resolve)=> {
		chrome.runtime.sendMessage({config: config}, ()=> {
			return resolve();
		});
	});



}
