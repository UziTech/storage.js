function test(name, value, pass) {
	var stringify = window.storage.stringify(value);
	var parse = window.storage.parse(stringify);
	console.log("%c" + name.toUpperCase(), "color: #00f");
	console.log("value: ", value);
	console.log("stringify: ", stringify);
	console.log("parse: ", parse);
	if (typeof pass === "function") {
		var passing = false;
		try {
			passing = pass(value, stringify, parse);
		} catch (ex) {
			console.error(ex);
			passing = false;
		}
		if (passing) {
			console.log("%cPASS", "color: #0f0");
		} else {
			console.error("FAIL");
		}
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
test("object", {1: 1, 2: 2, 3: 3}, function (test, string, result) {
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
	return JSON.stringify({$infnan: 0}) === string && typeof result === "number" && isNaN(result);
});
test("infinity", window.Infinity, function (test, string, result) {
	return JSON.stringify({$infnan: 1}) === string && test === result;
});
test("-infinity", -window.Infinity, function (test, string, result) {
	return JSON.stringify({$infnan: -1}) === string && test === result;
});
test("date", new Date(), function (test, string, result) {
	return JSON.stringify({$date: test.getTime()}) === string && test.getTime() === result.getTime();
});
test("regexp", /i/g, function (test, string, result) {
	return JSON.stringify({$regexp: test.toString()}) === string && test.toString() === result.toString();
});
test("undefined", undefined, function (test, string, result) {
	return JSON.stringify({$undefined: 0}) === string && typeof result === "undefined";
});
test("named function", function diff_1(a, b) {
	if (a < b) {
		return b - a;
	}
	return a - b;
}, function (test, string, result) {
	return test.name === result.name && JSON.stringify({$function: test.toString()}) === string && result(1, 3) === 2;
});
test("anonymous function", function (a, b) {
	return a + b;
}, function (test, string, result) {
	return JSON.stringify({$function: test.toString()}) === string && result(1, 2) === 3;
});
test("escape", {$date: 9271384}, function (test, string, result) {
	var newObj = {};
	for (var i in test) {
		newObj[i] = JSON.stringify(test[i]);
	}
	return JSON.stringify({$escape: newObj}) === string && test.$date === result.$date;
});
test("null", null, function (test, string, result) {
	return "null" === string && test === result;
});
test("binary", new TextEncoder("utf-8").encode("Hello"), function (test, string, result) {
	var pass = true;
	if (JSON.stringify({$binary: window.storage.base64.encode(test)}) !== string) {
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
