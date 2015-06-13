document.addEventListener('DOMContentLoaded', function() {
	changeIPInput();
	document.getElementById("ip").disabled=true;
	//add listenser for save
	var save = document.getElementById("save");
	
	save.addEventListener("click", saveInfo);
	
	//add listenser for usePrivateIP checkbox
	var usePrivateIP = document.getElementById("usePrivateIP");
	usePrivateIP.checked = (localStorage.getItem("option_usePrivateIP") == "true")?true:false;
	changeIPInput();
	
	usePrivateIP.addEventListener('change', function(){
		if(usePrivateIP.checked){
			changeIPInput();
		}
		else{
			changeIPInput();			
		}
	});
	//load state for isNotification	
	var useNotification = document.getElementById("useNotification");
	useNotification.checked = (localStorage.getItem("option_useNotification") == "true")?true:false;



	//add listenser for force update
	var forceUpdate = document.getElementById("forceUpdate");
	forceUpdate.addEventListener("click", function() {
		var hostname = document.getElementById("hostname");
		var token = document.getElementById("token");
		var ip = document.getElementById("ip");
		var updateInterval = document.getElementById("updateInterval");
		var usePrivateIP = document.getElementById("usePrivateIP");
		updateCsieIoDDNS((usePrivateIP.checked)?ip.value:false, token.value, hostname.value , "true");
	});

	//display saved value
	var hostname = document.getElementById("hostname");
	var token = document.getElementById("token");
	var ip = document.getElementById("ip");
	var updateInterval = document.getElementById("updateInterval");

	hostname.value = localStorage.getItem('hostname', hostname.value);
	token.value = localStorage.getItem('token', token.value);
	/*	don't show token in option 
	 token.value = localStorage.getItem('token', token.value).replace(/(.*?-)(.*)/g, function ($0, $1, $2) {
        return $1 + (new Array($2.length + 1).join("*"));
    });
    */
	ip.value = localStorage.getItem('ip', ip.value);
	updateInterval.value = localStorage.getItem('updateInterval', updateInterval.value) || 60;

	//check isSave before leave
	
	window.addEventListener("beforeunload", function(e) {
		var unSaveMsg = "Not save yet!";

		if (localStorage.getItem('hostname', hostname.value) && localStorage.getItem('token', token.value) && localStorage.getItem('ip', ip.value) && localStorage.getItem('updateInterval', updateInterval.value)) {
			return undefined;
		}

		(e || window.event).returnValue = unSaveMsg;
		return unSaveMsg;
	});

});

function saveInfo() {
	var hostname = document.getElementById("hostname");
	var token = document.getElementById("token");
	var ip = document.getElementById("ip");
	var updateInterval = document.getElementById("updateInterval");
	var usePrivateIP = document.getElementById("usePrivateIP");
	
	localStorage.setItem("option_usePrivateIP",usePrivateIP.checked);
	localStorage.setItem("option_useNotification",useNotification.checked);
	
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
	var usePrivateIP = document.getElementById("usePrivateIP").checked;
	if (usePrivateIP === true) {
		getLocalIPs(function(privateIPs) {
			var ip_local = privateIPs[0];
			ip.value = ip_local;
		});
		return ;
	}

	//jsonp for ip
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "http://api.hostip.info/get_json.php");
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			if (xhr.status == 200) {
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
function updateCsieIoDDNS(ip, token, hostname , noti) {//params.noti can only be true or not set, just for force update
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'https://csie.io/update?hn=' + hostname + '&token=' + token + ((ip)?'&ip='+ip:"")  );
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			if (xhr.status == 200) {
				//console.log(xhr.responseText);
				noti = noti || localStorage.getItem("option_useNotification");
				if(noti == "true"){
					notification(xhr.responseText);
				}

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

function getLocalIPs(callback) {
    var ips = [];
    var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    var pc = new RTCPeerConnection({
        iceServers: []
    });
    pc.createDataChannel('');
    pc.onicecandidate = function(e) {
        if (!e.candidate) {
            callback(ips);
            return;
        }
        var ip = /(\d+\.\d+\.\d+\.\d+)/.exec(e.candidate.candidate)[1];
        if (ips.indexOf(ip) == -1)
            ips.push(ip);
    };
    pc.createOffer(function(sdp) {
        pc.setLocalDescription(sdp);
    }, function onerror() {});
}
