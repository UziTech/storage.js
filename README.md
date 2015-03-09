# storage.js
localStorage for objects

# Overview
A local storage option that allows storing and retrieving any object including functions, undefineds, regexps, dates, string, numbers

# Usage
```javascript
storage.setItem("a", {this:1});
//storage.a === {"this": 1}

storage.setItem("a", "that", 3);
//storage.a === {"this": 1, "that": 3}

storage.a.this = 3;
//does not work

storage.a = {"this": 1, "that": 2};
//storage.a === {"this" : 3} only works if "a" was already in local storage

storage.getItem("a");
storage.a;
storage["a"];
//{"this": 1, "that": 2}

storage.clear();
//clears all keys

storage.length;
//returns number of stored keys

storage.key(i);
//returns the ith key name
```
