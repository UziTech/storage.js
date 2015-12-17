/*
 * Author: Tony Brix, https://tony.brix.ninja
 * License: MIT
 * Version: 1.0.0
 */
;
(function (window, undefined) {
	window.storage = {};
	Object.defineProperties(window.storage, {
		setItem: {
			value: function (item, value) {
				var args = arguments;
				if (args.length > 2) {
					var obj = window.storage.getItem(item) || {};
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
				window.storage.define(item);
				return localStorage.setItem(item, window.storage.stringify(value));
			}
		},
		getItem: {
			value: function (item) {
				return window.storage.parse(localStorage.getItem(item));
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
				for (var i in window.storage) {
					delete window.storage[i];
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
				if (!window.storage.hasOwnProperty(item)) {
					Object.defineProperty(window.storage, item, {
						enumerable: true,
						get: function () {
							return window.storage.getItem(item);
						},
						set: function (value) {
							return window.storage.setItem(item, value);
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
						return typeof window.Uint8Array !== 'undefined' && obj instanceof window.Uint8Array || (obj && obj.hasOwnProperty('$Uint8ArrayPolyfill'));
					},
					toJSONValue: function (obj) {
						return {$binary: window.storage.base64.encode(obj)};
					},
					fromJSONValue: function (obj) {
						return window.storage.base64.decode(obj.$binary);
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
						return (typeof obj === "number" && isNaN(obj)) || obj === window.Infinity || obj === -window.Infinity;
					},
					toJSONValue: function (obj) {
						var sign;
						if (obj === window.Infinity) {
							sign = 1;
						} else if (obj === -window.Infinity) {
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
						var matches = obj.$function.match(/^function\s?(\w*)\(([^)]*)\)\s*{([\s\S]*)}$/);
						var name = matches[1];
						var args = matches[2];
						var body = matches[3];
						//var arr = args.split(",");
						//arr.push(body);
						//return Function.apply(null, arr);

						//allow named functions
						return eval("(function(){ return function " + name + "(" + args + "){ " + body + " }; })()");
					}
				},
				escape: {// Function
					matchJSONValue: function (obj) {
						return obj.hasOwnProperty('$escape') && Object.keys(obj).length === 1;
					},
					matchObject: function (obj) {
						for (var i in window.storage.converters) {
							if (window.storage.converters[i].matchJSONValue(obj)) {
								return true;
							}
						}
						return false;
					},
					toJSONValue: function (obj) {
						var newObj = {};
						for (var i in obj) {
							newObj[i] = window.storage.stringify(obj[i]);
						}
						return {$escape: newObj};
					},
					fromJSONValue: function (obj) {
						var newObj = {};
						for (var i in obj.$escape) {
							newObj[i] = window.storage.parse(obj.$escape[i]);
						}
						return newObj;
					}
				}
			}
		},
		stringify: {
			value: function (obj) {
				//check for circular reference.
				if (window.storage.isCyclic(obj)) {
					throw "Cannot store cyclic objects";
				}
				function ToStringable(obj) {
					if (obj !== null) {
						for (var i in window.storage.converters) {
							if (window.storage.converters[i].matchObject(obj)) {
								return window.storage.converters[i].toJSONValue(obj);
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
					}
					return obj;
				}
				return JSON.stringify(ToStringable(obj));
			}
		},
		parse: {
			value: function (str) {
				function ToObject(obj) {
					if (obj !== null && typeof obj === "object") {
						for (var i in window.storage.converters) {
							if (window.storage.converters[i].matchJSONValue(obj)) {
								return window.storage.converters[i].fromJSONValue(obj);
							}
						}
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
		},
		base64: {
			value: {
				encode: function (array) {
					return Base64.encode(array);
				},
				decode: function (str) {
					return Base64.decode(str);
				}
			}
		}
	});

	// modified from https://github.com/meteor/meteor/blob/devel/packages/base64/base64.js
	// Base 64 encoding

	var BASE_64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

	var BASE_64_VALS = {
		"=": -1
	};

	for (var i = 0; i < BASE_64_CHARS.length; i++) {
		BASE_64_VALS[BASE_64_CHARS.charAt(i)] = i;
	}

	var Base64 = {
		encode: function (array) {
			if (typeof array === "string") {
				var str = array;
				array = new Uint8Array(new ArrayBuffer(str.length));
				for (var i = 0; i < str.length; i++) {
					var ch = str.charCodeAt(i);
					if (ch > 0xFF) {
						throw new Error(
								"Not ascii. Base64.encode can only take ascii strings.");
					}
					array[i] = ch;
				}
			}
			var answer = [];
			var a = null;
			var b = null;
			var c = null;
			var d = null;
			for (var i = 0; i < array.length; i++) {
				switch (i % 3) {
					case 0:
						a = (array[i] >> 2) & 0x3F;
						b = (array[i] & 0x03) << 4;
						break;
					case 1:
						b = b | (array[i] >> 4) & 0xF;
						c = (array[i] & 0xF) << 2;
						break;
					case 2:
						c = c | (array[i] >> 6) & 0x03;
						d = array[i] & 0x3F;
						answer.push(BASE_64_CHARS.charAt(a));
						answer.push(BASE_64_CHARS.charAt(b));
						answer.push(BASE_64_CHARS.charAt(c));
						answer.push(BASE_64_CHARS.charAt(d));
						a = null;
						b = null;
						c = null;
						d = null;
						break;
				}
			}
			if (a !== null) {
				answer.push(BASE_64_CHARS.charAt(a));
				answer.push(BASE_64_CHARS.charAt(b));
				if (c === null)
					answer.push('=');
				else
					answer.push(BASE_64_CHARS.charAt(c));
				if (d === null)
					answer.push('=');
			}
			return answer.join("");
		},
		decode: function (str) {
			var len = Math.floor((str.length * 3) / 4);
			if (str.charAt(str.length - 1) === '=') {
				len--;
				if (str.charAt(str.length - 2) === '=')
					len--;
			}
			var arr = new Uint8Array(new ArrayBuffer(len));

			var one = null;
			var two = null;
			var three = null;

			var j = 0;

			for (var i = 0; i < str.length; i++) {
				var c = str.charAt(i);
				var v = BASE_64_VALS[c];
				switch (i % 4) {
					case 0:
						if (v < 0)
							throw new Error('invalid base64 string');
						one = v << 2;
						break;
					case 1:
						if (v < 0)
							throw new Error('invalid base64 string');
						one = one | (v >> 4);
						arr[j++] = one;
						two = (v & 0x0F) << 4;
						break;
					case 2:
						if (v >= 0) {
							two = two | (v >> 2);
							arr[j++] = two;
							three = (v & 0x03) << 6;
						}
						break;
					case 3:
						if (v >= 0) {
							arr[j++] = three | v;
						}
						break;
				}
			}
			return arr;
		}
	};

	for (var i in localStorage)
	{
		window.storage.define(i);
	}
//TODO: set window.storage.item = {test:""}; with object.observe?
})(window);
