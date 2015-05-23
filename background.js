var alarmName = "updateDDNS";
var updateInterval = parseInt(localStorage.getItem("updateInterval")) || 1;
chrome.alarms.create(alarmName, {
	delayInMinutes : updateInterval,
	periodInMinutes : updateInterval
});

chrome.alarms.onAlarm.addListener(function(alarm) {
	if (alarm.name !== "updateDDNS") {
		return false;
	}
	var usePrivateIP = localStorage.getItem("option_usePrivateIP");
	if (usePrivateIP === "true") {
		getLocalIPs(function(privateIPs) {
			var ip = privateIPs[0];
			var token = localStorage.getItem("token");
			var hostname = localStorage.getItem("hostname");
			if (ip && token && hostname) {
				updateCsieIoDDNS(ip, token, hostname);
			} else {
				console.error("onAlarm: ip or token or hostname setting error");
				chrome.alarms.clear("updateDDNS", function(wasCleared) {
					console.error("updateDDNS alarm clear");
				});
			}
		});
		return ;
	}
	// not privateIP
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "http://api.hostip.info/get_json.php");
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			if (xhr.status == 200) {
				console.log(xhr.responseText);
				var data;
				try {
					data = JSON.parse(xhr.responseText);
				} catch(e) {
					console.error("parse Json error@onAlarm");
					return false;
				}
				var ip = data.ip;
				var token = localStorage.getItem("token");
				var hostname = localStorage.getItem("hostname");
				if (ip && token && hostname) {
					updateCsieIoDDNS(ip, token, hostname);
				} else {
					console.error("onAlarm: ip or token or hostname setting error");
					chrome.alarms.clear("updateDDNS", function(wasCleared) {
						console.error("updateDDNS alarm clear");
					});
				}
			} else {
				console.error("fail:" + data);
			}
		}
	};
	xhr.send();

});

function updateCsieIoDDNS(ip, token, hostname) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'https://csie.io/update?hn=' + hostname + '&token=' + token + '&ip=' + ip);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			if (xhr.status == 200) {
				console.log(xhr.responseText);
			} else {
				console.error(xhr.responseText);
			}
		}
	};
	xhr.send();
}

chrome.browserAction.onClicked.addListener(function() {
	var optionhUrl = chrome.extension.getURL('option.html');
	chrome.tabs.create({
		url : optionhUrl
	});
});
chrome.runtime.onInstalled.addListener(function(details) {
	localStorage.clear();
	var optionhUrl = chrome.extension.getURL('option.html');
	chrome.tabs.create({
		url : optionhUrl
	});

});

/*
 * about function getLocalIPs
 *
 * source code form : http://stackoverflow.com/questions/18572365/get-local-ip-of-a-device-in-chrome-extension
 * author : Rob W
 * 
 */
function getLocalIPs(callback) {
    var ips = [];

    var RTCPeerConnection = window.RTCPeerConnection ||
        window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

    var pc = new RTCPeerConnection({
        // Don't specify any stun/turn servers, otherwise you will
        // also find your public IP addresses.
        iceServers: []
    });
    // Add a media line, this is needed to activate candidate gathering.
    pc.createDataChannel('');
    
    // onicecandidate is triggered whenever a candidate has been found.
    pc.onicecandidate = function(e) {
        if (!e.candidate) {
            // Candidate gathering completed.
            callback(ips);
            return;
        }
        var ip = /^candidate:.+ (\S+) \d+ typ/.exec(e.candidate.candidate)[1];
        if (ips.indexOf(ip) == -1) // avoid duplicate entries (tcp/udp)
            ips.push(ip);
    };
    pc.createOffer(function(sdp) {
        pc.setLocalDescription(sdp);
    }, function onerror() {});
}
