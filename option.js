document.addEventListener('DOMContentLoaded', function() {

	
	
	changeIPInput();

	//add listenser for save
	var save = document.getElementById("save");
	save.addEventListener("click", saveInfo);
	
	//add listenser for usePrivateIP checkbox
	var usePrivateIP = document.getElementById("usePrivateIP");
	usePrivateIP.addEventListener('change', function(){
		if(usePrivateIP.checked){
			localStorage.setItem("option_usePrivateIP","true");
			changeIPInput();
		}
		else{
			localStorage.setItem("option_usePrivateIP","false");
			changeIPInput();			
		}
	});

	//add listenser for force update
	var forceUpdate = document.getElementById("forceUpdate");
	forceUpdate.addEventListener("click", function() {
		var hostname = document.getElementById("hostname");
		var token = document.getElementById("token");
		var ip = document.getElementById("ip");
		var updateInterval = document.getElementById("updateInterval");
		updateCsieIoDDNS(ip.value, token.value, hostname.value);
	});

	//display saved value
	var hostname = document.getElementById("hostname");
	var token = document.getElementById("token");
	var ip = document.getElementById("ip");
	var updateInterval = document.getElementById("updateInterval");

	hostname.value = localStorage.getItem('hostname', hostname.value);
	token.value = localStorage.getItem('token', token.value);
	ip.value = localStorage.getItem('ip', ip.value);
	updateInterval.value = localStorage.getItem('updateInterval', updateInterval.value);

	//check isSave before leave
	/*
	window.addEventListener("beforeunload", function(e) {
		var unSaveMsg = "Not save yet!";

		if (localStorage.getItem('hostname', hostname.value) && localStorage.getItem('token', token.value) && localStorage.getItem('ip', ip.value) && localStorage.getItem('updateInterval', updateInterval.value)) {
			return undefined;
		}

		(e || window.event).returnValue = unSaveMsg;
		return unSaveMsg;
	});*/

});

function saveInfo() {
	var hostname = document.getElementById("hostname");
	var token = document.getElementById("token");
	var ip = document.getElementById("ip");
	var updateInterval = document.getElementById("updateInterval");

	localStorage.setItem('hostname', hostname.value);
	localStorage.setItem('token', token.value);
	localStorage.setItem('ip', ip.value);
	localStorage.setItem('updateInterval', updateInterval.value);

	chrome.alarms.create("updateDDNS", {
		delayInMinutes : parseInt(updateInterval.value),
		periodInMinutes : parseInt(updateInterval.value)
	});

}
function changeIPInput(){
	
	
	var ip = document.getElementById("ip");
	var usePrivateIP = localStorage.getItem("option_usePrivateIP");
	if (usePrivateIP === "true") {
		getLocalIPs(function(privateIPs) {
			var ip_local = privateIPs[0];
			ip.value = ip_local;
		});
		return ;
	}

	
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "http://api.hostip.info/get_json.php");
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			if (xhr.status == 200) {
				console.log(xhr.responseText);
				try {
					var data = JSON.parse(xhr.responseText);
					ip.value = data.ip;
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
