# storage.js
localStorage for pretty much anything using ejson

# Overview
A local storage option that allows storing and retrieving any object, array, function, undefined, regexp, date, string, number, and binary using [ejson](http://docs.meteor.com/api/ejson.html)

# Installation

```html
<script src="\path\to\storage.js"></script>
```

# Usage

```javascript
storage.setItem("a", {this:1});
//storage.a === {"this": 1}

storage.a.this
//1

storage.a.this = 2;
//does not work
//storage.a === {"this": 1}

var a = storage.a;
a.this = 2;
storage.a = a;
//does work
//storage.a === {"this": 2}

storage.setItem("a", "this", 3);
//storage.a === {"this": 3}

storage.setItem("a", "that", 3);
//storage.a === {"this": 3, "that": 3}

storage.setItem("a", "the", "other", "thing", 4);
//storage.a === {"this": 3, "that": 3, "the": {"other": {"thing": 4}}}

storage.a = {this: 1, that: 2};
//storage.a === {"this": 1, "that": 2}

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

storage.value(i);
storage[storage.key(i)];
//returns the ith keys object
```

## sessionStorage

You can use this with sessionStorage as well using storage.session.get/setItem()

# Testing

For more examples of what objects can be stored go to [the tests](https://storage.js.org/test.html)
