window.storage = {};
Object.defineProperties(window.storage, {
	setItem: {
		value: function (item, value) {
			var args = arguments;
			if (args.length > 2) {
				var obj = storage.getItem(item) || {};
				var next = obj;
				if (next === null || typeof next !== "object") {
					throw "'" + item + "' is not an object";
				}
				for (var i = 1; i < args.length - 2; i++) {
					if (!next.hasOwnProperty(args[i])) {
						next[args[i]] = {};
					}
					next = next[args[i]];
					if (next === null || typeof next !== "object") {
						throw "'" + args[i] + "' is not an object";
					}
				}
				next[args[args.length - 2]] = args[args.length - 1];
				value = obj;
			}
			storage.define(item);
			return localStorage.setItem(item, storage.stringify(value));
		}
	},
	getItem: {
		value: function (item) {
			return storage.parse(localStorage.getItem(item));
		}
	},
	removeItem: {
		value: function (item) {
			return localStorage.removeItem(item);
		}
	},
	clear: {
		value: function () {
			var ret = localStorage.clear();
			for (var i in storage) {
				delete storage[i];
			}
			return ret;
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
	isCyclic: {
		//modified from http://blog.vjeux.com/2011/javascript/cyclic-object-detection.html
		value: function (obj) {
			var seenObjects = [];
			var loopStarter;
			var keyString = "";
			var loopFinished = false;
			function detect(obj) {
				if (obj && typeof obj === "object") {
					if (seenObjects.includes(obj)) {
						loopStarter = obj;
						return true;
					}
					seenObjects.push(obj);
					for (var key in obj) {
						if (obj.hasOwnProperty(key) && detect(obj[key])) {
							if (!loopFinished) {
								keyString = "." + key + keyString;
								if (loopStarter === obj) {
									loopFinished = true;
								}
							}
							return true;
						}
					}
					seenObjects.pop();
				}
				return false;
			}
			var cyclic = detect(obj);
			if (cyclic) {
				console.log(loopStarter, keyString.substring(1));
			}
			return cyclic;
		}
	},
	//modified from https://www.meteor.com/ejson
	converters: {
		value: {
			date: {// Date
				matchJSONValue: function (obj) {
					return obj.hasOwnProperty('$date') && Object.keys(obj).length === 1;
				},
				matchObject: function (obj) {
					return obj instanceof Date;
				},
				toJSONValue: function (obj) {
					return {$date: obj.getTime()};
				},
				fromJSONValue: function (obj) {
					return new Date(obj.$date);
				}
			},
			regexp: {// RegExp
				matchJSONValue: function (obj) {
					return obj.hasOwnProperty('$regexp') && Object.keys(obj).length === 1;
				},
				matchObject: function (obj) {
					return obj instanceof RegExp;
				},
				toJSONValue: function (obj) {
					return {$regexp: obj.toString()};
				},
				fromJSONValue: function (obj) {
					var matches = obj.$regexp.match(/^\/((?:\\\/|[^/])+)\/([gimy]*)$/);
					return new RegExp(matches[1], matches[2]);
				}
			},
			binary: {// Binary
				matchJSONValue: function (obj) {
					return obj.hasOwnProperty('$binary') && Object.keys(obj).length === 1;
				},
				matchObject: function (obj) {
					return typeof Uint8Array !== 'undefined' && obj instanceof Uint8Array || (obj && obj.hasOwnProperty('$Uint8ArrayPolyfill'));
				},
				toJSONValue: function (obj) {
					return {$binary: Base64.encode(obj)};
				},
				fromJSONValue: function (obj) {
					return Base64.decode(obj.$binary);
				}
			},
			undefined: {// Undefined
				matchJSONValue: function (obj) {
					return obj.hasOwnProperty('$undefined') && Object.keys(obj).length === 1;
				},
				matchObject: function (obj) {
					return typeof obj === "undefined";
				},
				toJSONValue: function () {
					return {$undefined: 0};
				},
				fromJSONValue: function () {
					return;
				}
			},
			infnan: {// NaN, Infinity, -Infinity
				matchJSONValue: function (obj) {
					return obj.hasOwnProperty('$infnan') && Object.keys(obj).length === 1;
				},
				matchObject: function (obj) {
					return (typeof obj === "number" && isNaN(obj)) || obj === Infinity || obj === -Infinity;
				},
				toJSONValue: function (obj) {
					var sign;
					if (obj === Infinity) {
						sign = 1;
					} else if (obj === -Infinity) {
						sign = -1;
					} else {
						sign = 0;
					}
					return {$infnan: sign};
				},
				fromJSONValue: function (obj) {
					return obj.$infnan / 0;
				}
			},
			function: {// Function
				matchJSONValue: function (obj) {
					return obj.hasOwnProperty('$function') && Object.keys(obj).length === 1;
				},
				matchObject: function (obj) {
					return typeof obj === "function";
				},
				toJSONValue: function (obj) {
					return {$function: obj.toString()};
				},
				fromJSONValue: function (obj) {
					var matches = obj.$function.match(/^function[^(]*\(([^)]*)\)\s*{([\s\S]*)}$/);
					var args = matches[1].replace(/[\s/*]/g, "");
					var body = matches[2].replace(/\r?\n|\r/g, "");
					return eval("new Function(\"" + args.split(", ").join("\", \"") + "\", \"" + body + "\")");
				}
			},
			escape: {// Function
				matchJSONValue: function (obj) {
					return obj.hasOwnProperty('$escape') && Object.keys(obj).length === 1;
				},
				matchObject: function (obj) {
					for (var i in storage.converters) {
						if (storage.converters[i].matchJSONValue(obj)) {
							return true;
						}
					}
					return false;
				},
				toJSONValue: function (obj) {
					var newObj = {};
					for(var i in obj){
						newObj[i] = storage.stringify(obj[i]);
					}
					return {$escape: newObj};
				},
				fromJSONValue: function (obj) {
					var newObj = {};
					for(var i in obj.$escape){
						newObj[i] = storage.parse(obj.$escape[i]);
					}
					return newObj;
				}
			}
		}
	},
	stringify: {
		value: function (obj) {
			//check for circular reference.
			if (storage.isCyclic(obj)) {
				throw "Cannot store cyclic objects";
			}
			function ToStringable(obj) {
				for (var i in storage.converters) {
					if (storage.converters[i].matchObject(obj)) {
						return storage.converters[i].toJSONValue(obj);
					}
				}

				if (typeof obj === "object") {
					if (obj instanceof Array) {
						var temp = [];
						for (var i = 0; i < obj.length; i++) {
							temp.push(ToStringable(obj[i]));
						}
						return temp;
					} else {
						var temp = {};
						for (var i in obj) {
							temp[i] = ToStringable(obj[i]);
						}
						return temp;
					}
				}
				return obj;
			}
			return JSON.stringify(ToStringable(obj));
		}
	},
	parse: {
		value: function (str) {
			function ToObject(obj) {
				for (var i in storage.converters) {
					if (storage.converters[i].matchJSONValue(obj)) {
						return storage.converters[i].fromJSONValue(obj);
					}
				}

				if (typeof obj === "object") {
					if (obj instanceof Array) {
						for (var i = 0; i < obj.length; i++) {
							obj[i] = ToObject(obj[i]);
						}
					} else {
						for (var i in obj) {
							obj[i] = ToObject(obj[i]);
						}
					}
				}
				return obj;
			}
			return ToObject(JSON.parse(str));
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
