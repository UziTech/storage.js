function test(name, value, pass) {
	var stringify = storage.stringify(value);
	var parse = storage.parse(stringify);
	console.log("%c" + name.toUpperCase(), "color: #00f");
	console.log("value: ", value);
	console.log("stringify: ", stringify);
	console.log("parse: ", parse);
	if (typeof pass === "function") {
		if (pass(value, stringify, parse)) {
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
test("nan", NaN, function (test, string, result) {
	return JSON.stringify({$infnan: 0}) === string && typeof result === "number" && isNaN(result);
});
test("infinity", Infinity, function (test, string, result) {
	return JSON.stringify({$infnan: 1}) === string && test === result;
});
test("-infinity", -Infinity, function (test, string, result) {
	return JSON.stringify({$infnan: -1}) === string && test === result;
});
test("date", new Date(), function (test, string, result) {
	try {
		return JSON.stringify({$date: test.getTime()}) === string && test.getTime() === result.getTime();
	} catch (ex) {
		return false;
	}
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
	try {
		return test.name === result.name && JSON.stringify({$function: test.toString()}) === string && result(1, 3) === 2;
	} catch (ex) {
		return false;
	}
});
test("anonymous function", function (a, b) {
	return a + b;
}, function (test, string, result) {
	try {
		return JSON.stringify({$function: test.toString()}) === string && result(1, 2) === 3;
	} catch (ex) {
		return false;
	}
});
test("escape", {$date: 9271384}, function (test, string, result) {
	try {
		var newObj = {};
		for (var i in test) {
			newObj[i] = JSON.stringify(test[i]);
		}
		return JSON.stringify({$escape: newObj}) === string && test.$date === result.$date;
	} catch (ex) {
		return false;
	}
});
test("null", null, function (test, string, result) {
	return "null" === string && test === result;
});
