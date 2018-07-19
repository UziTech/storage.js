/**
 * Author: Tony Brix, https://tony.brix.ninja
 * License: MIT
 * Version: 2.1.0
 */
;
(function (window) {
	function loadStorage(storageType) {
		var storage = {};
		Object.defineProperties(storage, {
			setItem: {
				get: function () {
					return function (item, value) {
						if (arguments.length < 2) {
							throw "Not enough arguments";
						}

						var args;
						if (item instanceof Array) {
							args = item;
						} else {
							args = Array.apply(null, arguments);
							value = args.pop();
						}
						item = args[0];

						var obj;
						if (args.length === 1) {
							obj = value;
						} else {
							obj = storage.getItem(item);
							if (typeof obj === "undefined") {
								obj = {};
							}
							var next = storage._.valueFromObject(obj);
							if (next === null || typeof next !== "object") {
								throw "'" + item + "' is not an object";
							}
							for (var i = 1; i < args.length - 1; i++) {
								if (!next.hasOwnProperty(args[i])) {
									next[args[i]] = {};
								}
								next = storage._.valueFromObject(next[args[i]]);
								if (next === null || typeof next !== "object") {
									throw "'" + args[i] + "' is not an object";
								}
							}
							next[args[args.length - 1]] = value;
						}
						storage._.define(item);
						return storageType.setItem(item, storage._.stringify(obj));
					};
				}
			},
			getItem: {
				get: function () {
					return function (item) {
						var args;
						if (item instanceof Array) {
							args = item;
						} else if (arguments.length === 1) {
							args = [arguments[0]];
						} else {
							args = Array.apply(null, arguments);
						}

						var obj = storage._.getRawItem(args);
						// TODO: traverse object and apply valueFromObject?
						return storage._.valueFromObject(obj);
					};
				}
			},
			removeItem: {
				get: function () {
					return function (item) {
						var args;
						if (item instanceof Array) {
							args = item;
						} else if (arguments.length === 1) {
							args = [arguments[0]];
						} else {
							args = Array.apply(null, arguments);
						}

						if (args.length > 1) {
							var lastItem = args.pop();
							var obj = storage.getItem(args);
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
							storage.setItem(args, obj);
						} else {
							storageType.removeItem(args[0]);
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
			length: {
				get: function () {
					return storageType.length;
				}
			},
			// plugin utility functions
			_: {
				value: {
					// modified from https://docs.meteor.com/api/ejson.html
					converters: {
						date: {
							// Date
							matchJSONValue: function (obj) {
								return obj && obj.hasOwnProperty("$date") && Object.keys(obj).length === 1;
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
								return obj && obj.hasOwnProperty("$regexp") && Object.keys(obj).length === 1;
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
								return obj && obj.hasOwnProperty("$binary") && Object.keys(obj).length === 1;
							},
							matchObject: function (obj) {
								return typeof window.Uint8Array !== "undefined" && obj instanceof window.Uint8Array || (obj && obj.hasOwnProperty("$Uint8ArrayPolyfill"));
							},
							toJSONValue: function (obj) {
								return {
									$binary: storage._.base64.encode(obj)
								};
							},
							fromJSONValue: function (obj) {
								return storage._.base64.decode(obj.$binary);
							}
						},
						undefinedObj: {
							// Undefined
							matchJSONValue: function (obj) {
								return obj && obj.hasOwnProperty("$undefined") && Object.keys(obj).length === 1;
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
								return obj && obj.hasOwnProperty("$infnan") && Object.keys(obj).length === 1;
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
						functionObj: {
							// Function
							matchJSONValue: function (obj) {
								return obj && obj.hasOwnProperty("$function") && Object.keys(obj).length === 1;
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

								// allow named functions
								return eval("(function(){ return function " + name + "(" + args + "){ " + body + " }; })()");
							}
						},
						escape: {
							// ejson
							matchJSONValue: function (obj) {
								return obj && obj.hasOwnProperty("$escape") && Object.keys(obj).length === 1;
							},
							matchObject: function (obj) {
								for (var i in storage._.converters) {
									if (typeof storage._.converters[i].matchJSONValue === "function" && storage._.converters[i].matchJSONValue(obj)) {
										return true;
									}
								}
								return false;
							},
							toJSONValue: function (obj) {
								var newObj = {};
								for (var i in obj) {
									newObj[i] = storage._.stringify(obj[i]);
								}
								return {
									$escape: newObj
								};
							},
							fromJSONValue: function (obj) {
								var newObj = {};
								for (var i in obj.$escape) {
									newObj[i] = storage._.parse(obj.$escape[i]);
								}
								return newObj;
							}
						}
					},
					valueFromObject: function (obj) {
						for (var i in storage._.converters) {
							if (typeof storage._.converters[i].matchObject === "function" && typeof storage._.converters[i].valueFromObject === "function" && storage._.converters[i].matchObject(obj)) {
								obj = storage._.converters[i].valueFromObject(obj);
							}
						}
						return obj;
					},
					jsonValueToObject: function (obj) {
						if (obj !== null && typeof obj === "object") {
							var i;
							for (i in storage._.converters) {
								if (typeof storage._.converters[i].matchJSONValue === "function" && typeof storage._.converters[i].fromJSONValue === "function" && storage._.converters[i].matchJSONValue(obj)) {
									return storage._.converters[i].fromJSONValue(obj);
								}
							}
							if (obj instanceof Array) {
								for (i = 0; i < obj.length; i++) {
									obj[i] = storage._.jsonValueToObject(obj[i]);
								}
							} else {
								for (i in obj) {
									obj[i] = storage._.jsonValueToObject(obj[i]);
								}
							}
						}
						return obj;
					},
					objectToJsonValue: function (obj) {
						if (obj !== null) {
							var i;
							for (i in storage._.converters) {
								if (typeof storage._.converters[i].matchObject === "function" && typeof storage._.converters[i].toJSONValue === "function" && storage._.converters[i].matchObject(obj)) {
									return storage._.converters[i].toJSONValue(obj);
								}
							}

							if (typeof obj === "object") {
								if (obj instanceof Array) {
									var tempArr = [];
									for (i = 0; i < obj.length; i++) {
										tempArr.push(storage._.objectToJsonValue(obj[i]));
									}
									return tempArr;
								}
								var tempObj = {};
								for (i in obj) {
									tempObj[i] = storage._.objectToJsonValue(obj[i]);
								}
								return tempObj;
							}
						}
						return obj;
					},
					getRawItem: function (item) {
						var args;
						if (item instanceof Array) {
							args = item;
						} else if (arguments.length === 1) {
							args = [arguments[0]];
						} else {
							args = Array.apply(null, arguments);
						}
						var storageItem = storageType.getItem(args[0]);
						if (storageItem === null) {
							return;
						}
						var obj = storage._.parse(storageItem);
						if (args.length > 1) {
							var next = storage._.valueFromObject(obj);
							if (next === null || typeof next !== "object") {
								throw "'" + args[0] + "' is not an object";
							}
							for (var i = 1; i < args.length - 1; i++) {
								if (!next.hasOwnProperty(args[i])) {
									return;
								}
								next = storage._.valueFromObject(next[args[i]]);
								if (next === null || typeof next !== "object") {
									throw "'" + args[i] + "' is not an object";
								}
							}
							obj = next[args[args.length - 1]];
						}
						return obj;
					},
					base64: {
						encode: function (array) {
							return Base64.encode(array);
						},
						decode: function (str) {
							return Base64.decode(str);
						}
					},

					stringify: function (obj) {
						// check for circular reference.
						if (storage._.isCyclic(obj)) {
							throw "Cannot store cyclic objects";
						}

						return JSON.stringify(storage._.objectToJsonValue(obj));
					},
					parse: function (str) {
						var obj;
						try {
							obj = JSON.parse(str);
						} catch (ex) {
							// assume str is just a string
							obj = str;
						}
						return storage._.jsonValueToObject(obj);
					},

					isCyclic: function (obj) {
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
					},

					define: function (item) {
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
				var i;
				if (typeof array === "string") {
					var str = array;
					array = new Uint8Array(new ArrayBuffer(str.length));
					for (i = 0; i < str.length; i++) {
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
				for (i = 0; i < array.length; i++) {
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

		if (window.Proxy) {
			return new Proxy(storage, {
				get: function (target, prop) {
					if (prop in target || target[prop]) {
						return target[prop];
					}
					return target.getItem(prop);
				},
				set: function (target, prop, value) {
					return target.setItem(prop, value);
				}
			});
		} else {
			return storage;
		}
	}
	var storage = loadStorage(localStorage);
	Object.defineProperties(storage, {
		session: {
			get: function () {
				return loadStorage(sessionStorage);
			}
		}
	});
	var i;
	for (i in localStorage) {
		storage._.define(i);
	}
	for (i in sessionStorage) {
		storage.session._.define(i);
	}
	Object.defineProperties(window, {
		storage: {
			get: function () {
				return storage;
			}
		}
	});
})(window);
