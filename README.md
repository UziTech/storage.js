# storage.js
localStorage for objects

# Overview
A local storage option that allows storing and retrieving any object including functions, undefineds, regexps, dates, string, numbers

# Usage

storage.setItem("a", {this:1});
//storage.a === {"this": 1}

storage.setItem("a", "that", 2);
//storage.a === {"this": 1, "that": 2}
