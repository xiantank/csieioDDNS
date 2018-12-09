"use strict";
let ddnsManager;

chrome.runtime.onInstalled.addListener(function (details) {
	if (details.reason === "update") {
		// convert old version storage to current version
		chromeLocalStorageGet("info").then((info = {}) => {
			let config = {};
			config.hostname = info.hostname;
			config.ddnsToken = info.token;
			config.imToken = info.lineToken;
			config.interval = info.updateInterval;
			config.notifyStrategy = [];
			if (info.option_useLineNotification) config.notifyStrategy.push("line");
			if (info.option_useLocalNotification) config.notifyStrategy.push("chrome");
			chromeLocalStorageSet({config: config});
		});
	}
});

function init() {
	let csieIoDDNS = new CsieIoDDns();
	ddnsManager = new DDNSManager(csieIoDDNS);

	listenExtensionActions();
	listenFromOptions();
}
function listenExtensionActions() {
	chrome.browserAction.onClicked.addListener(() => {
		const optionhUrl = chrome.extension.getURL("option.html");
		chrome.tabs.create({
			url: optionhUrl,
		});
	});
}

function optionsMessageHandler(message) {
	if (message.config) {
		return chromeLocalStorageSet({config: message.config}).then(()=> {
			return ddnsManager.resetConfig();
		});
	} else if (message.powerStatus !== undefined) {
		if (message.powerStatus === true) {
			return chromeLocalStorageSet({'powerStatus': true});
		} else {
			return chromeLocalStorageSet({'powerStatus': false});
		}
	}
}

function listenFromOptions() {
	chrome.runtime.onMessage.addListener(function (message) {
		return optionsMessageHandler(message).then(()=> {
			ddnsManager.restart();
		});
	});
}
function chromeLocalStorageGet(keys) {
	return new Promise((resolve)=> {
		chrome.storage.local.get(keys, (items)=> {
			if (typeof keys === "string") {
				return resolve(items[keys]);
			}
			if (Array.isArray(keys)) {
				return resolve(keys.map((key)=> {
					return items[key];
				}));
			}
		});
	});
}

function chromeLocalStorageSet(items) {
	return new Promise((resolve)=> {
		chrome.storage.local.set(items, ()=> {
			return resolve();
		});
	});
}
async function getLocalIP() {
	const privateIPs = await getLocalIPs();
	return privateIPs[0];
}
function getLocalIPs() {
	return new Promise((resolve, reject) => {
		const ips = [];
		const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
		const pc = new RTCPeerConnection({
			iceServers: [],
		});
		pc.createDataChannel("");
		pc.onicecandidate = function (e) {
			if (!e.candidate) {
				resolve(ips);
				return;
			}
			const ip = /(\d+\.\d+\.\d+\.\d+)/.exec(e.candidate.candidate)[1];
			if (ips.indexOf(ip) == -1) ips.push(ip);
		};
		pc.createOffer((sdp) => {
			pc.setLocalDescription(sdp);
		}, () => {});
	});
}
class DDNSManager { // alarms manage, refresh config from chrome.storage
	constructor(csieIoDDNS) {
		this.ddns = csieIoDDNS;
		this.alarmName = "updateDDNS";
		this.interval = 60;
		this.resetConfig().then(()=> {
			this.restart();
		});

		chrome.alarms.onAlarm.addListener((alarm) => {
			console.log(new Date(), "alarm !");
			if (!alarm) {
				return;
			}
			if (alarm.name !== this.alarmName) {
				return;
			}
			chromeLocalStorageGet("oldIP").then((oldIP)=> {
				this.resetConfig().then(()=> {
					this.ddns.update(oldIP);
				});
			});

		});
	}

	resetConfig() {
		return chromeLocalStorageGet("config").then((config)=> {
			if (config.hostname) {
				this.ddns.hostname = config.hostname;
			}
			if (config.ddnsToken) {
				this.ddns.ddnsToken = config.ddnsToken;
			}
			if (config.imToken) {
				this.ddns.imToken = config.imToken;
			}
			if (config.notifyStrategy) {
				this.ddns.notifyStrategy = config.notifyStrategy;
			}
			if (config.interval) {
				if (this.interval !== config.interval) {
					this.interval = config.interval;
				}
			}
		});
	}

	restart() {
		return chromeLocalStorageGet("powerStatus").then((powerStatus)=> {
			if (powerStatus) {
				this.start();
			} else {
				this.stop();
			}
		});
	}

	start() {
		console.log("start running");
		chrome.alarms.create(this.alarmName, {
			when: Date.now() + 3000,
			periodInMinutes: Math.floor(this.interval)
		});

	}

	stop() {
		chrome.alarms.clear(this.alarmName, function (wasCleared) {
			console.log("updateDDNS alarm clear: ", wasCleared);
			console.log("stop running");
		});
	}

}

class CsieIoDDns { // getIp, updateDDNS, notification strategy
	/**
	 *
	 * @param [config]
	 * * @param {string} [config.hostname] - what hostname to updateDDNS
	 * @param {string} [config.ddnsToken] - use to updateDDNS
	 * @param {string} [config.IMToken] - use to send notification to IM server
	 * @param {(string|string[])} [config.notifyStrategy] - what im should use; allow [chrome, fb, line]
	 */
	constructor(config) {
		config = config || {};
		this.hostname = config.hostname || "";
		this.ddnsToken = config.ddnsToken || "";
		this.imToken = config.imToken || "";
		this._notifyStrategy = config.notifyStrategy || [];
		this.ip = "";
	}

	get notifyStrategy() {
		return this._notifyStrategy.slice();
	}

	set notifyStrategy(strategy) {
		if (!strategy || (typeof strategy !== "string" && !Array.isArray(strategy))) {
			this._notifyStrategy = [];
			return;
		}
		if (typeof strategy === "string") {
			strategy = [strategy];
		}
		this._notifyStrategy = strategy;
	}

	update(oldIP) {
		return this.getPublicIP().then(currentIP=> {
			if (!currentIP) {// can not get public ip but still update ddns
				return this._updateDDNS();
			}
			if (currentIP !== oldIP) { // ip change
				return this._updateDDNS().then(msg=> {
					if (msg === "OK") {
						chromeLocalStorageSet({oldIP: currentIP});
						return this.notification(`偵測到IP改變，新的IP為: ${currentIP}`);
					} else if (msg === "KO") {
						return this.notification(`更新發生錯誤，請檢查並且更新您的設定`);
					} else {
						return Promise.reject(new Error(msg));
					}
				});
			}
		}).catch(error=> {
			console.error(error);
		})
	}

	_updateDDNS() {
		return request(`https://csie.io/update?hn=${this.hostname}&token=${this.ddnsToken}&ip=`, {cache: 'no-cache'});
	}

	getPublicIP() {
		return request("http://checkip.amazonaws.com/", {cache: 'no-cache'}).then(responseText=> {
			return responseText.trim();
		}).catch(e=> {
			console.log("getPublicIP fail", e);
			return "";
		});
	}


	notification(msg, notifyStrategy = this.notifyStrategy) {
		return Promise.all(notifyStrategy.map((notifyMethod)=> {
			return this["notify" + notifyMethod](msg);
		}));
	}

	notifychrome(msg) {
		return new Promise((resolve)=> {
			let option = {
				type: "basic",
				title: "csie.io DDNS update",
				message: msg,
				iconUrl: "../img/csieio-128.png"

			};
			chrome.notifications.create(option, function (id) {
				resolve();
			});
		});
	}

	notifyfb(msg) {
		return this.notifyIM("fb", msg);
	}

	notifyline(msg) {
		return this.notifyIM("line", msg);
	}

	notifyIM(im, msg) {
		return request(`https://csie.io/msgme?token=${this.imToken}&im=${im}&msg=${msg}`, {cache: 'no-cache'});
	}
}

init();

function request(url, ...args) {
	if (false) {
		return fetch(url, ...args).then(response=> {
			if (response.status >= 200 && response.status < 300) {
				return response.text();
			} else {
				console.error(response);
				return "";
			}
		});
	}
	return new Promise((resolve, reject)=> {
		let xhr = new XMLHttpRequest();
		xhr.open('GET', url);
		xhr.onreadystatechange = function () {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if (xhr.status == 200) {
					resolve(xhr.responseText);
				}
				else {
					console.log(xhr.status, xhr);
					reject(xhr.responseText);
				}

			}
		};
		xhr.send();
	});
}
