;
(function (undef) {
	"use strict";

	var tests = {
		passed: 0,
		failed: 0
	};

	function log(text, style, error) {
		if (!(text instanceof Array)) {
			text = [text];
		}
		var consoleDiv = document.getElementById("console");
		var div = document.createElement("div");
		var styles = "";
		if (style) {
			for (var name in style) {
				div.style[name] = style[name];
				styles += name + ": " + style[name];
			}
		}
		for (var i = 0; i < text.length; i++) {
			var t = text[i] + "";
			if (t === "[object Object]") {
				t = JSON.stringify(text[i]);
			}
			if (text[i] instanceof Array) {
				t = "Array(" + text[i].length + ") [" + t + "]";
			}
			if (text[i] instanceof Uint8Array) {
				t = "Uint8Array(" + text[i].length + ") [" + t + "]";
			}
			if (i > 0) {
				t = " " + t;
			}
			div.textContent += t;
		}
		consoleDiv.append(div);

		if (error) {
			console.error(error);
		} else {
			if (styles) {
				text[0] = "%c" + text[0];
				text.push(styles);
				console.log.apply(null, text);
			} else {
				console.log.apply(null, text);
			}
		}
	}

	function test(name, value, pass) {
		var stringify = window.storage._.stringify(value);
		var parse = window.storage._.parse(stringify);
		log(name.toUpperCase(), { color: "#00f" });
		log(["value:", value]);
		log(["stringify:", stringify]);
		log(["parse:", parse]);
		if (typeof pass === "function") {
			var passing = false;
			try {
				passing = pass(value, stringify, parse);
			} catch (ex) {
				log(ex.getMessage(), { color: "#f00" }, ex);
				passing = false;
			}
			if (passing) {
				tests.passed++;
				log("PASS", { color: "#0f0" });
			} else {
				tests.failed++;
				log("FAIL", { color: "#f00" }, "FAIL");
			}
			log("", { margin: "0 0 1.2em 0" });
		}
	}

	test("string", "string", function (test, string, result) {
		return JSON.stringify(test) === string && test === result;
	});

	test("array", [1, 2, 3], function (test, string, result) {
		var pass = true;
		if (JSON.stringify(test) !== string) {
			pass = false;
		}
		if (test.length !== result.length) {
			pass = false;
		}
		for (var i = 0; i < test.length; i++) {
			if (test[i] !== result[i]) {
				pass = false;
			}
		}
		return pass;
	});

	test("object", { 1: 1, 2: 2, 3: 3 }, function (test, string, result) {
		var pass = true;
		if (JSON.stringify(test) !== string) {
			pass = false;
		}
		for (var i in test) {
			if (test[i] !== result[i]) {
				pass = false;
			}
		}
		return pass;
	});

	test("number", 1, function (test, string, result) {
		return test === +string && test === result;
	});

	test("nan", window.NaN, function (test, string, result) {
		return JSON.stringify({ $infnan: 0 }) === string && typeof result === "number" && isNaN(result);
	});

	test("infinity", window.Infinity, function (test, string, result) {
		return JSON.stringify({ $infnan: 1 }) === string && test === result;
	});

	test("-infinity", -window.Infinity, function (test, string, result) {
		return JSON.stringify({ $infnan: -1 }) === string && test === result;
	});

	test("date", new Date(), function (test, string, result) {
		return JSON.stringify({ $date: test.getTime() }) === string && test.getTime() === result.getTime();
	});

	test("regexp", /i/g, function (test, string, result) {
		return JSON.stringify({ $regexp: test.toString() }) === string && test.toString() === result.toString();
	});

	test("undefined", undef, function (test, string, result) {
		return JSON.stringify({ $undefined: 0 }) === string && typeof result === "undefined";
	});

	test("named function", function diff_1(a, b) {
		if (a < b) {
			return b - a;
		}
		return a - b;
	}, function (test, string, result) {
		return test.name === result.name && JSON.stringify({ $function: test.toString() }) === string && result(1, 3) === 2;
	});

	test("anonymous function", function (a, b) {
		return a + b;
	}, function (test, string, result) {
		return JSON.stringify({ $function: test.toString() }) === string && result(1, 2) === 3;
	});

	test("arrow function with curlys", (a, b) => {
		return a + b;
	}, function (test, string, result) {
		return JSON.stringify({ $function: test.toString() }) === string && result(1, 2) === 3;
	});

	test("arrow function no curlys", (a, b) => a + b, function (test, string, result) {
		return JSON.stringify({ $function: test.toString() }) === string && result(1, 2) === 3;
	});

	test("arrow function no parens", a => a + 1, function (test, string, result) {
		return JSON.stringify({ $function: test.toString() }) === string && result(1) === 2;
	});

	test("escape", { $date: 9271384 }, function (test, string, result) {
		var newObj = {};
		for (var i in test) {
			newObj[i] = JSON.stringify(test[i]);
		}
		return JSON.stringify({ $escape: newObj }) === string && test.$date === result.$date;
	});

	test("null", null, function (test, string, result) {
		return "null" === string && test === result;
	});

	test("binary", new Uint8Array([72, 101, 108, 108, 111]), function (test, string, result) {
		var pass = true;
		if (JSON.stringify({ $binary: window.storage._.base64.encode(test) }) !== string) {
			pass = false;
		} else if (test.length !== result.length || !result instanceof window.Uint8Array) {
			pass = false;
		} else {
			for (var i = 0; i < test.length; i++) {
				if (test[i] !== result[i]) {
					pass = false;
				}
			}
		}
		return pass;
	});

	log("PASSED: " + tests.passed, { color: "#0f0" });
	log("FAILED: " + tests.failed, { color: "#f00" });

})();
