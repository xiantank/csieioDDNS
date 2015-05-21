document.addEventListener('DOMContentLoaded', function() {

	var ip = document.getElementById("ip");
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

	//add listenser for save
	var save = document.getElementById("save");
	save.addEventListener("click", saveInfo);

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

	localStorage.setItem('hostname', hostname.value);
	localStorage.setItem('token', token.value);
	localStorage.setItem('ip', ip.value);
	localStorage.setItem('updateInterval', updateInterval.value);

	chrome.alarms.create("updateDDNS", {
		delayInMinutes : parseInt(updateInterval.value),
		periodInMinutes : parseInt(updateInterval.value)
	});

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