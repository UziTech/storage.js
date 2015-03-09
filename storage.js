window.storage = {};
Object.defineProperties(window.storage, {
	setItem: {
		value: function (item, value) {
			var args = arguments;
			if (args.length > 2) {
				var obj = storage.getItem(item) || {};
				var next = obj;
				for (var i = 1; i < args.length - 2; i++) {
					if (!next.hasOwnProperty(args[i])) {
						next[args[i]] = {};
					}
					next = next[args[i]];
				}
				next[args[args.length - 2]] = args[args.length - 1];
				value = obj;
			}
			storage.define(item);
			return localStorage.setItem(item, this.stringify(value));
		}
	},
	getItem: {
		value: function (item) {
			return this.parse(localStorage.getItem(item));
		}
	},
	removeItem: {
		value: function (item) {
			return localStorage.removeItem(item);
		}
	},
	clear: {
		value: function () {
			return localStorage.clear();
		}
	},
	key: {
		value: function (key) {
			return localStorage.key(key);
		}
	},
	define: {
		value: function (item) {
			if (!storage.hasOwnProperty(item)) {
				Object.defineProperty(window.storage, item, {
					enumerable: true,
					get: function () {
						return storage.getItem(item);
					},
					set: function (value) {
						return storage.setItem(item, value);
					}
				});
			}
		}
	},
	stringify: {
		value: function (obj) {
			function ToString(obj, recursiveCall) {
				//TODO: better type to string to reduce overlap with actual strings
				//TODO: test circulation
				var str;
				if (typeof obj === "object") {
					if (obj instanceof Date) {
						str = "DATE:" + obj.toString();
					} else if (obj instanceof RegExp) {
						str = "REGEXP:" + obj.toString();
					} else {
						var temp = {};
						for (var i in obj) {
							temp[i] = ToString(obj[i], true);
						}
						if (!recursiveCall) {
							str = JSON.stringify(temp);
						} else {
							str = temp;
						}
					}
				} else if (typeof obj === "undefined") {
					str = "UNDEFINED:";
				} else if (typeof obj === "function") {
					str = "FUNCTION:" + obj.toString();
				} else if (!recursiveCall) {
					str = JSON.stringify(obj);
				} else {
					str = obj;
				}
				return str;
			}
			return ToString(obj);
		}
	},
	parse: {
		value: function (str) {
			//TODO: better detection of types
			var obj = JSON.parse(str);
			for (var i in obj) {
				if (typeof obj[i] === "string") {
					if (obj[i].indexOf("DATE:") === 0) {
						var date = new Date(obj[i].substring(5));
						if (!isNaN(date.getTime())) {
							obj[i] = date;
						}
					} else if (obj[i].indexOf("REGEXP:") === 0) {
						var matches = obj[i].match(/^REGEXP:\/((?:\\\/|[^/])+)\/([gimy]*)$/);
						if (matches !== null) {
							obj[i] = new RegExp(matches[1], matches[2]);
						}
					} else if (obj[i] === "UNDEFINED:") {
						obj[i] = undefined;
					} else if (obj[i].indexOf("FUNCTION:") === 0) {
						var matches = obj[i].match(/^FUNCTION:function[^(]*\(([^)]*)\)\s*{([\s\S]*)}$/);
						if (matches !== null) {
							var args = matches[1].replace(/[\s/*]/g, "");
							var body = matches[2].replace(/\r?\n|\r/g, "");
							obj[i] = eval("new Function(\"" + args.split(", ").join("\", \"") + "\", \"" + body + "\")");
						}
					}
				}
			}
			return obj;
		}
	},
	length: {
		get: function () {
			return localStorage.length;
		}
	}
});
for (var i in localStorage)
{
	storage.define(i);
}
//TODO: set storage.item = {test:""}; with object.observe?
