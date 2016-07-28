/*
 * Author: Tony Brix, https://tony.brix.ninja
 * License: MIT
 * Version: 1.1.2
 */
/* eslint block-scoped-var: 0 */
;
(function (window) {
	function loadStorage(storageType) {
		var storage = {};
		Object.defineProperties(storage, {
			setItem: {
				get: function () {
					return function (item, value) {
						if (arguments.length > 2) {
							var obj = storage.getItem(item) || {};
							var next = obj;
							if (next === null || typeof next !== "object") {
								throw "'" + item + "' is not an object";
							}
							for (var i = 1; i < arguments.length - 2; i++) {
								if (!next.hasOwnProperty(arguments[i])) {
									next[arguments[i]] = {};
								}
								next = next[arguments[i]];
								if (next === null || typeof next !== "object") {
									throw "'" + arguments[i] + "' is not an object";
								}
							}
							next[arguments[arguments.length - 2]] = arguments[arguments.length - 1];
							value = obj;
						}
						storage.define(item);
						return storageType.setItem(item, storage.stringify(value));
					};
				}
			},
			getItem: {
				get: function () {
					return function (item) {
						var obj = storage.parse(storageType.getItem(item));
						if (arguments.length > 1) {
							var next = obj;
							if (next === null || typeof next !== "object") {
								throw "'" + item + "' is not an object";
							}
							for (var i = 1; i < arguments.length - 1; i++) {
								if (!next.hasOwnProperty(arguments[i])) {
									return;
								}
								next = next[arguments[i]];
								if (next === null || typeof next !== "object") {
									throw "'" + arguments[i] + "' is not an object";
								}
							}
							next = next[arguments[arguments.length - 1]];
							obj = next;
						}
						return obj;
					};
				}
			},
			removeItem: {
				get: function () {
					return function (item) {
						if (arguments.length > 1) {
							var args = Array.apply(null, arguments);
							var lastItem = args.pop();
							var obj = storage.getItem.apply(null, args);
							if (typeof obj === "undefined") {
								return;
							}
							if (obj === null || typeof obj !== "object") {
								throw "'" + args[args.length - 1] + "' is not an object";
							}
							if (!obj.hasOwnProperty(lastItem)) {
								return;
							}
							delete obj[lastItem];
							args.push(obj);
							storage.setItem.apply(null, args);
						} else {
							return storageType.removeItem(item);
						}
					};
				}
			},
			clear: {
				get: function () {
					return function () {
						var ret = storageType.clear();
						for (var i in storage) {
							delete storage[i];
						}
						return ret;
					};
				}
			},
			key: {
				get: function () {
					return function (key) {
						return storageType.key(key);
					};
				}
			},
			value: {
				get: function () {
					return function (key) {
						return storage.getItem(storageType.key(key));
					};
				}
			},
			define: {
				get: function () {
					return function (item) {
						if (!storage.hasOwnProperty(item)) {
							Object.defineProperty(storage, item, {
								enumerable: true,
								configurable: true,
								get: function () {
									return storage.getItem(item);
								},
								set: function (value) {
									return storage.setItem(item, value);
								}
							});
						}
					};
				}
			},
			isCyclic: {
				// modified from http://blog.vjeux.com/2011/javascript/cyclic-object-detection.html
				get: function () {
					return function (obj) {
						var seenObjects = [];
						var loopStarter;
						var keyString = "";
						var loopFinished = false;

						function detect(obj) {
							if (obj && typeof obj === "object") {
								for (var i = 0; i < seenObjects.length; i++) {
									if (obj === seenObjects[i]) {
										loopStarter = obj;
										return true;
									}
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
					};
				}
			},
			// modified from https://www.meteor.com/ejson
			converters: {
				value: {
					date: {
						// Date
						matchJSONValue: function (obj) {
							return obj.hasOwnProperty("$date") && Object.keys(obj).length === 1;
						},
						matchObject: function (obj) {
							return obj instanceof Date;
						},
						toJSONValue: function (obj) {
							return {
								$date: obj.getTime()
							};
						},
						fromJSONValue: function (obj) {
							return new Date(obj.$date);
						}
					},
					regexp: {
						// RegExp
						matchJSONValue: function (obj) {
							return obj.hasOwnProperty("$regexp") && Object.keys(obj).length === 1;
						},
						matchObject: function (obj) {
							return obj instanceof RegExp;
						},
						toJSONValue: function (obj) {
							return {
								$regexp: obj.toString()
							};
						},
						fromJSONValue: function (obj) {
							var matches = obj.$regexp.match(/^\/((?:\\\/|[^/])+)\/([gimy]*)$/);
							return new RegExp(matches[1], matches[2]);
						}
					},
					binary: {
						// Binary
						matchJSONValue: function (obj) {
							return obj.hasOwnProperty("$binary") && Object.keys(obj).length === 1;
						},
						matchObject: function (obj) {
							return typeof window.Uint8Array !== "undefined" && obj instanceof window.Uint8Array || (obj && obj.hasOwnProperty("$Uint8ArrayPolyfill"));
						},
						toJSONValue: function (obj) {
							return {
								$binary: storage.base64.encode(obj)
							};
						},
						fromJSONValue: function (obj) {
							return storage.base64.decode(obj.$binary);
						}
					},
					undefinedObj: {
						// Undefined
						matchJSONValue: function (obj) {
							return obj.hasOwnProperty("$undefined") && Object.keys(obj).length === 1;
						},
						matchObject: function (obj) {
							return typeof obj === "undefined";
						},
						toJSONValue: function () {
							return {
								$undefined: 0
							};
						},
						fromJSONValue: function () {
							return;
						}
					},
					infnan: {
						// NaN, Infinity, -Infinity
						matchJSONValue: function (obj) {
							return obj.hasOwnProperty("$infnan") && Object.keys(obj).length === 1;
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
							return {
								$infnan: sign
							};
						},
						fromJSONValue: function (obj) {
							return obj.$infnan / 0;
						}
					},
					function: {
						// Function
						matchJSONValue: function (obj) {
							return obj.hasOwnProperty("$function") && Object.keys(obj).length === 1;
						},
						matchObject: function (obj) {
							return typeof obj === "function";
						},
						toJSONValue: function (obj) {
							return {
								$function: obj.toString()
							};
						},
						fromJSONValue: function (obj) {
							var matches = obj.$function.match(/^function\s?(\w*)\(([^)]*)\)\s*{([\s\S]*)}$/);
							// check arrow function
							if (!matches) {
								matches = obj.$function.match(/^()\(?([^)=]*?)\)?\s*=>\s*([\s\S]*?)\s*$/);
								var hasCurlys = matches[3].match(/^{([\s\S]*)}$/);
								if (hasCurlys) {
									matches[3] = hasCurlys[1];
								} else {
									matches[3] = "return " + matches[3];
								}
							}
							var name = matches[1];
							var args = matches[2];
							var body = matches[3];
							// var arr = args.split(",");
							// arr.push(body);
							// return Function.apply(null, arr);

							// allow named functions
							return eval("(function(){ return function " + name + "(" + args + "){ " + body + " }; })()");
						}
					},
					escape: {
						// ejson
						matchJSONValue: function (obj) {
							return obj.hasOwnProperty("$escape") && Object.keys(obj).length === 1;
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
							for (var i in obj) {
								newObj[i] = storage.stringify(obj[i]);
							}
							return {
								$escape: newObj
							};
						},
						fromJSONValue: function (obj) {
							var newObj = {};
							for (var i in obj.$escape) {
								newObj[i] = storage.parse(obj.$escape[i]);
							}
							return newObj;
						}
					}
				}
			},
			stringify: {
				get: function () {
					return function (obj) {
						// check for circular reference.
						if (storage.isCyclic(obj)) {
							throw "Cannot store cyclic objects";
						}

						function ToStringable(obj) {
							if (obj !== null) {
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
									}
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
					};
				}
			},
			parse: {
				get: function () {
					return function (str) {
						function ToObject(obj) {
							if (obj !== null && typeof obj === "object") {
								for (var i in storage.converters) {
									if (storage.converters[i].matchJSONValue(obj)) {
										return storage.converters[i].fromJSONValue(obj);
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
					};
				}
			},
			length: {
				get: function () {
					return storageType.length;
				}
			},
			base64: {
				get: function () {
					return {
						encode: function (array) {
							return Base64.encode(array);
						},
						decode: function (str) {
							return Base64.decode(str);
						}
					};
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
						default:
							throw "This shouldn't happen";
					}
				}
				if (a !== null) {
					answer.push(BASE_64_CHARS.charAt(a));
					answer.push(BASE_64_CHARS.charAt(b));
					if (c === null)
						answer.push("=");
					else
						answer.push(BASE_64_CHARS.charAt(c));
					if (d === null)
						answer.push("=");
				}
				return answer.join("");
			},
			decode: function (str) {
				var len = Math.floor((str.length * 3) / 4);
				if (str.charAt(str.length - 1) === "=") {
					len--;
					if (str.charAt(str.length - 2) === "=")
						len--;
				}
				var arr = new Uint8Array(len);

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
								throw new Error("invalid base64 string");
							one = v << 2;
							break;
						case 1:
							if (v < 0)
								throw new Error("invalid base64 string");
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
						default:
							throw "This shouldn't happen";
					}
				}
				return arr;
			}
		};
		// TODO: set storage.item = {test:""}; with object.observe?

		return storage;
	}
	var storage = loadStorage(localStorage);
	Object.defineProperties(storage, {
		session: {
			get: function () {
				return loadStorage(sessionStorage);
			}
		}
	});
	for (var i in localStorage) {
		storage.define(i);
	}
	for (var i in sessionStorage) {
		storage.session.define(i);
	}
	window.storage = storage;
})(window);
