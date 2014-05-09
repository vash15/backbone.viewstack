Backbone View Stack
==================

Need browserify to work

## Dependency
* jQuery
* Underscore
* Backbone


## Installation

    bower install backbone.viewstack --save

## Usage

```js

var _ = require("underscore");
var $ = require('jquery');
var BackBone  = require("backbone");
var ViewStack = require('viewstack');


var viewStack = new ViewStack({ el: "#application" });
viewStack.clearStack(); // Empty stack view
viewStack.render(); // Render view

// ...

viewStack.pushView( new Backbone.View() ); // Insert new view

// ...

viewStack.popView();


```
