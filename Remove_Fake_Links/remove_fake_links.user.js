// ==UserScript==
// @name        Remove fake links
// @description Remove tracking redirects like http://www.google.com/url?... and http://clck.yandex.ru/redir/...
// @author      Infocatcher
// @version     0.2.0pre11 - 2015-01-07
// @run-at      document-start
// @namespace   dev/null
// @include     http://www.google.*/search?*
// @include     https://www.google.*/search?*
// @include     http://www.google.*/webhp?*
// @include     https://www.google.*/webhp?*
// @include     http://www.google.*/#*q=*
// @include     https://www.google.*/#*q=*
// @include     http://www.google.*/?*
// @include     https://www.google.*/?*
// @include     http://www.google.*/
// @include     https://www.google.*/
// @include     https://encrypted.google.com/search?*
// @include     https://encrypted.google.com/#*q=*
// @include     http://www.google.*/imgres?*
// @include     https://www.google.*/imgres?*
// @include     http://groups.google.com/*
// @include     https://groups.google.com/*
// @include     http://docs.google.com/document/*
// @include     https://docs.google.com/document/*
// @include     http://yandex.*/yandsearch?*
// @include     https://yandex.*/yandsearch?*
// @include     http://market.yandex.ru/model.xml?*
// @include     https://market.yandex.ru/model.xml?*
// @include     http://mail.yandex.*/*
// @include     https://mail.yandex.*/*
// @include     http://www.mts.ru/*
// @include     http://4pda.ru/*
// @include     http://*.deviantart.com/*
// @include     https://*.deviantart.com/*
// @include     https://addons.mozilla.org/*
// @include     https://www.facebook.com/*
// @grant       none
// ==/UserScript==

(function() {

var _debug = true; // Show debug messages in Web Console
var isNoScript = window.getComputedStyle(document.createElement("noscript"), null).display != "none";
var exclude;
// Uncomment following to leave "Warning - visiting this web site may harm your computer!"
//exclude = /^https?:\/\/(?:www\.)google\.[\w.]+\/interstitial\?url=http\S+$/;
var deleted = "__deleted__"; // Prefix to rename attributes

// You can comment two following lines to increase performance
window.addEventListener("mouseover", clearLink, true);
window.addEventListener("focus", clearLink, true);
window.addEventListener("mousedown", clearLink, true);
window.addEventListener("unload", function destroy(e) {
	window.removeEventListener(e.type, destroy, false);
	window.removeEventListener("mouseover", clearLink, true);
	window.removeEventListener("focus", clearLink, true);
	window.removeEventListener("mousedown", clearLink, true);
}, false);

// Based on code from https://github.com/Infocatcher/Bookmarklets/blob/master/showAnchors.js
var setTimeout = window.setTimeout;
if(isNoScript) {
	if("postMessage" in window) {
		setTimeout = function fakeTimeout(callback) {
			var key = "removeTrackingLinksFakeTimeout#" + Math.random().toFixed(16).substr(2);
			window.addEventListener("message", function onMessage(e) {
				if(e.data !== key)
					return;
				var origin = e.origin;
				if(!origin || location.href.substr(0, origin.length) !== origin)
					return;
				window.removeEventListener("message", onMessage, false);
				callback();
			}, false);
			window.postMessage(key, location.href);
		}
	}
	else {
		setTimeout = function(callback) {
			callback();
		};
	}
}

function clearLink(e) {
	var a = getLink(e);
	if(!a)
		return;

	renameAttr(a, "onclick", /(^|\W)location\.replace\(/);
	renameAttr(a, "onmousedown");
	renameAttr(a, "data-vdir-href"); // mail.yandex.ru
	renameAttr(a, "data-orig-href"); // mail.yandex.ru

	var h = a.href;
	var host = location.hostname;
	if( // See https://github.com/Infocatcher/UserScripts/issues/5
		host == "addons.mozilla.org"
		&& (
			!/^\w+:\/+(?:[\w-]+\.)*mozilla\.(?:net|org)\//.test(h) // Only for external links
			|| /^https?:\/\/forums\.mozilla\.org\//.test(h)
		)
	) {
		var $ = window.$ // Greasemonkey
			|| typeof unsafeWindow != "undefined" && unsafeWindow.$ // Scriptish
			|| null;
		if($) try {
			$(a).unbind("click");
			_log("Remove jQuery handlers for \"click\" event");
		}
		catch(e) {
			setTimeout(function() { throw e; }, 0);
		}
	}
	if(host == "www.facebook.com") // See https://github.com/Infocatcher/UserScripts/issues/6
		renameAttr(a, "onclick", "=http") && renameAttr(a, "onmouseover");
	if(exclude && exclude.test(h))
		return;
	if(/^https?:\/\/(?:\w+\.)?google\.[\w.]+\/.*=(https?(?::|%3A)[^?&#]+)/.test(h)) {
		var _h = RegExp.$1;
		if(!/^https?:\/\/(?:\w+\.)?google\.[\w.]+\/(?:search|imgres)\?/.test(h))
			a.href = decode(_h);
	}
	else if(/^https?:\/\/clck\.yandex\.\w+\/redir\/.*?(?:\*|%3D)(http\S+)$/.test(h)) {
		var _h = RegExp.$1;
		a.href = /^https?%3A/.test(_h) ? decode(_h) : _h;
	}
	else if(
		/^https?:\/\/r\.mail\.yandex\.net\/url(s)?\/[^\/]+\/([^?]+)$/.test(h)
		|| /https?:\/\/news\.yandex\.ru\/yandsearch\?.*url(s)?=([^?]+)$/.test(h)
	)
		a.href = "http" + RegExp.$1 + "://" + decode(RegExp.$2);
	else if(/^https?:\/\/ads\.adfox\.ru\/.*goLink\?.*@(http\S+)$/.test(h))
		a.href = RegExp.$1;
	else if(/^https?:\/\/4pda\.ru\/[^#]+=(http[^?&#\/]+)/.test(h))
		a.href = decode(RegExp.$1);
	else if(/^https?:\/\/(?:\w+\.)*deviantart\.com\/.*\/outgoing\?(\S+)$/.test(h))
		a.href = RegExp.$1;
	else if(/^https?:\/\/outgoing\.mozilla\.org\/.*\/(\w+(?::|%3A)\S+)$/.test(h))
		a.href = decode(RegExp.$1);
	else if(/^https?:\/\/(?:\w+\.)*facebook\.com\/[^#]+=(http[^?&#\/]+)/.test(h))
		a.href = decode(RegExp.$1);
	if(a.href == h)
		return;
	_log("Override link:\n" + h + "\n=> " + a.href);
	// Force update link in status bar
	if(e.type == "focus") {
		a.ownerDocument.documentElement.focus();
		setTimeout(function() {
			a.focus();
		}, 0);
	}
	else if(e.type == "mouseover") {
		var orig = a.hasAttribute("style") && a.getAttribute("style");
		a.style.visibility = "hidden";
		setTimeout(function() {
			if(orig !== false)
				a.setAttribute("style", orig);
			else
				a.removeAttribute("style");
		}, 0);
	}
}
function getLink(e) {
	for(var a = e.target; a && a.localName; a = a.parentNode)
		if(a.localName.toLowerCase() == "a")
			return a.href && a;
	return null;
}
function decode(s) {
	try {
		return decodeURIComponent(s);
	}
	catch(e) {
		setTimeout(function() { throw e; }, 0);
	}
	return s;
}
function renameAttr(node, attr, check) {
	if(!node.hasAttribute(attr))
		return false;
	var orig = node.getAttribute(attr);
	var skip = false;
	switch(typeof check) {
		case "string": skip = orig.indexOf(check) == -1; break;
		case "object": skip = !check.test(orig);
	}
	if(skip)
		return false;
	node.setAttribute(deleted + attr, orig);
	node.removeAttribute(attr);
	return true;
}

function _log(s) {
	_log = _debug && "console" in window && "log" in console
		? function(s) {
			console.log("[Remove fake links] " + s);
		}
		: function(s) {
		};
	return _log.apply(this, arguments);
}

})();