var npm_url = 'http://search.npmjs.org';

chrome.browserAction.onClicked.addListener(function(tab) {
  selectOrCreateTab(npm_url);
});
chrome.omnibox.onInputEntered.addListener(function(text) {
  searchOnNPM(text);
});
chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
  var obj = getSuggestions(text);
  var suggestions = [];
  for(var i = 0, len = obj.rows.length; i < len; i++) {
    var tmp = {
      content : obj.rows[i].key,
      description : obj.rows[i].key + ' - ' + obj.rows[i].value.description
    };
    suggestions.push(tmp);
  }
  suggest(suggestions);
});
/*
 * Get suggestions from search.npm.org
 */
function getSuggestions(text) {
  var query = npm_url + '/_list/search/search?startkey=%22' + text + '%22&endkey=%22' + text + 'ZZZZZZZZZZZZZZZZZZZ%22&limit=20';
  var xhr = new XMLHttpRequest();
  xhr.open("GET", query, false);
  xhr.send();
  return JSON.parse(xhr.responseText);
}

/*
 * Search on search.npm.org
 */
function searchOnNPM(text) {
  var target_url = encodeURI(npm_url + '/#/' + text);
  selectOrCreateTab(target_url);
}

/*
 * Create tab
 */
function selectOrCreateTab(url) {
  chrome.tabs.getAllInWindow(null, function(tabs) {
    for(var i = 0, len = tabs.length; i < len; i++) {
      if(tabs[i].url == url) {
        chrome.tabs.update(tabs[i].id, {
          selected : true
        });
        return;
      }
    }
    chrome.tabs.create({
      url : url
    });
  });
}

// Default settings
if(!localStorage.getItem('settings')) {
  var settings = {
    notify : true,
    display : 5
  };
  localStorage.setItem('settings', JSON.stringify(settings));
}

/*
 * Check NPM update
 */
var notified = {};
function loadFeed() {
  var settings = JSON.parse(localStorage.getItem('settings'));
  if(settings.notify) {
    var query = npm_url + '/_view/updated?descending=true&limit=10';
    var xhr = new XMLHttpRequest();
    xhr.open("GET", query, false);
    xhr.send();
    var res = JSON.parse(xhr.responseText);
    var rows = res.rows;
    for(var i = 0; i < rows.length; i++) {
      var name = rows[i].id;
      var desc = getDescription(name);
      if(desc.version) {
        name += ' ' + desc.version;
      }
      var message = desc.description;
      var link = npm_url + '/#/' + rows[i].id;
      if(!notified[name]) {
        notify(name, message, link, settings.display);
        notified[name] = true;
      }
    }
  }
  setTimeout(loadFeed, 10000);
}

function getDescription(name) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", npm_url + '/api/' + name, false);
  xhr.send();
  var res = JSON.parse(xhr.responseText);
  var desc = res.description || '';
  var disttag = res['dist-tags'] || {};
  var version = disttag.latest;
  return {
    'description' : desc,
    'version' : version
  };
}

loadFeed();

function notify(title, message, link, display) {
  if(webkitNotifications.checkPermission() == 0) {
    var n = webkitNotifications.createNotification('icons/npm-32.png', title, message);
    n.onclick = function() {
      selectOrCreateTab(link);
      n.cancel();
    };
    n.ondisplay = function() {
      setTimeout(function() {
        n.cancel();
      }, display * 1000);
    };
    n.show();
  } else {
    webkitNotifications.requestPermission();
  }
}