function test(name, value, pass) {
	var stringify = storage.stringify(value);
	var parse = storage.parse(stringify);
	console.log("%c" + name.toUpperCase(), "color: #00f");
	console.log("value: ", value);
	console.log("stringify: ", stringify);
	console.log("parse: ", parse);
	if (pass(value, stringify, parse)) {
		console.log("%cPASS", "color: #0f0");
	} else {
		console.error("FAIL");
	}
}
var tests = {
	string: "hi",
	array: [1, 2, 3],
	object: {1: 1, 2: 2, 3: 3},
	number: 1,
	nan: NaN,
	infinity: Infinity,
	"-infinity": -Infinity,
	date: new Date(),
	regexp: /i/g,
	undefined: undefined,
	function: function (a, b) {
		return a + b;
	},
	escape: {$date: 9271384},
	null: null
};

test("string", tests.string, function (test, string, result) {
	return JSON.stringify(test) === string && test === result;
});
test("array", tests.array, function (test, string, result) {
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
test("object", tests.object, function (test, string, result) {
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
test("number", tests.number, function (test, string, result) {
	return test === +string && test === result;
});
test("nan", tests.nan, function (test, string, result) {
	return JSON.stringify({$infnan: 0}) === string && typeof result === "number" && isNaN(result);
});
test("infinity", tests.infinity, function (test, string, result) {
	return JSON.stringify({$infnan: 1}) === string && test === result;
});
test("-infinity", tests["-infinity"], function (test, string, result) {
	return JSON.stringify({$infnan: -1}) === string && test === result;
});
test("date", tests.date, function (test, string, result) {
	try {
		return JSON.stringify({$date: test.getTime()}) === string && test.getTime() === result.getTime();
	} catch (ex) {
		return false;
	}
});
test("regexp", tests.regexp, function (test, string, result) {
	return JSON.stringify({$regexp: test.toString()}) === string && test.toString() === result.toString();
});
test("undefined", tests.undefined, function (test, string, result) {
	return JSON.stringify({$undefined: 0}) === string && typeof result === "undefined";
});
test("function", tests.function, function (test, string, result) {
	try {
		return JSON.stringify({$function: test.toString()}) === string && result(1, 2) === 3;
	} catch (ex) {
		return false;
	}
});
test("escape", tests.escape, function (test, string, result) {
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
test("null", tests.null, function (test, string, result) {
	return "null" === string && test === result;
});
