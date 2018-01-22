(function(root, factory) {

	if (typeof define === 'function' && define.amd) {
		define(['backbone', 'underscore'], function(Backbone, _) {
			return factory(Backbone, _);
		});
	} else if (typeof exports !== 'undefined') {
		var Backbone = require('backbone');
		var _ = require('underscore');
		module.exports = factory(Backbone, _);
	} else {
		factory(root.Backbone, root._);
	}

}(this, function(Backbone, _) {

	'use strict';

	var prefix = (function () {
		var styles = window.getComputedStyle(document.documentElement, '');
		var pre    = (Array.prototype.slice
			.call(styles)
			.join('')
			.match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
		)[1];
		var dom    = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1];
		return {
			dom: dom,
			lowercase: pre,
			css: '-' + pre + '-',
			js: pre[0].toUpperCase() + pre.substr(1)
		};
	})();

	// Refer: http://www.w3schools.com/jsref/event_animationend.asp
	// webkitAnimationEnd: Code for Chrome, Safari and Opera
	// animationend: other browser.
	// Compability: >= IE10, >= 4.0 Chrome, >= 16 Moz, >= 4.0 Safari, >= 15.0 Opera
	var _animationEnd = [ 'WebKit', 'O' ].indexOf(prefix.dom) > -1 ? 'webkitAnimationEnd' : 'animationend';


	var ViewStack = Backbone.View.extend({

		_stack        : null,
		_current      : null,
		_length       : null,
		_baseZIndex   : 0,
		_zIndexGap    : 100,

		initialize: function initialize(options){

			options = _.defaults(options||{}, {zIndexGap: 100});

			if ( _.isObject(options.context) )
				this._context = options.context;

			// The element is composed of:
			//  {
			//      view    : { instance of Backbone.View }
			//      options : { the view options }
			//  }
			this._stack        = [];
			this._current      = null;
			this.$el.empty();

			if ( _.isNumber(options.zIndex) && options.zIndex > 0 )
				this.setBaseZIndex( Math.floor(options.zIndex) );
			else
				this.setBaseZIndex(0);

			if ( _.isNumber(options.zIndexGap) && options.zIndexGap > 0 )
				this._zIndexGap = Math.floor(options.zIndexGap);
			else
			 	this._zIndexGap = 100;

		},

		initStack: function initStack(){
			if ( this._length === null ){
				this._length = this._stack.length;
				return this;
			}

			this.clearStack( this._length );
			return this;
		},

		clearStack: function clearStack(length){
			if (!length) length = 0;
			var cleared = false;
			while ( this._stack.length > length ){
				this.popView(null, { silent: true });
				cleared = true;
			}
			if (cleared) {
				this.trigger('clear', this);
			}
			return this;
		},

		size: function size(){
			return this._stack.length;
		},

		exists: function exists(classType) {
			var result = _.find(this._stack, function (element) {
				return element.view instanceof classType;
			});
			return !!result;
		},

		indexOf: function indexOf(view) {
			for (var i = this._stack.length -1; i >= 0; i--) {
				if ( this._stack[i].view === view ){
					return i;
				}
			}
			return -1;
		},

		getView: function getView(){
			if ( this._stack.length > 0 ){
				var element = this._stack[ this._stack.length - 1 ];
				if ( _.isObject(element) )
					return element.view;
			}
			return null;
		},

		getViewActive: function getViewActive(){
			return this._current;
		},

		getActiveViewWithOptions: function getActiveViewWithOptions() {
			return this._stack[ this._stack.length-1 ];
		},

		getViewAtIndex: function getViewAtIndex(index){
			var element = this._stack[index];
			if ( _.isObject(element) )
				return element.view;
			return null;
		},

		getFirstInstanceFromClassType: function getFirstInstanceFromClassType(classType) {
			var r = _.find(this._stack, function (aItem) {
				return _.isObject(aItem) && aItem.view instanceof classType;
			});
			return r ? r.view : null;
		},

		getZIndex: function () {
			return (this._stack.length * 100) + this._zIndexGap + this._baseZIndex;
		},

		setBaseZIndex: function (value) {
			this._baseZIndex = parseInt(value);
			return this;
		},

		getBaseZIndex: function () {
			return this._baseZIndex;
		},


		// Add a view to viewstack
		pushView: function pushView( newView, options ){
			if ( !(newView instanceof Backbone.View) ) {
				return this;
			}

			options = _.defaults(options || {}, {
				animatePreviousView: true,
				render: true
			});

			if ( this._current === newView )
				return this;

			var oldActiveView  = this._current;
			var zIndex         = this.getZIndex();

			if ( newView.setZindex )
				newView.setZindex( zIndex );
			else
				newView.el.style.zIndex = zIndex;

			//
			// NewView:
			// onBeforePush
			//      push into stack
			//      append in the DOM
			// onPush
			//      render
			// onBeforeActivate
			//      wait for the end of the animation. If it is not animated runs immediately.
			// onActivate
			//

			//
			// CurrentView
			// onBeforeDeactivate()
			//      animate
			// onDeactivate() ... In this hook deactivate all events, scroll, ecc
			//


			// Hook: before push
			if ( newView.onBeforePush )
				newView.onBeforePush();

			// Add to stack
			this._stack.push({
				view    : newView,
				options : options
			});

			// Append into DOM
			this.$el.append( newView.el );

			// Hook: on push
			if ( newView.onPush )
				newView.onPush();

			// Render the view
			if ( options.render )
				newView.render();

			// Set the current view
			this._current = newView;


			// Hook:Deactive old active view
			if ( options.animatePreviousView === true ) {
				this._hookDeactive( oldActiveView, options.animated );
			} else {
				if (oldActiveView.onDeactivate)
					oldActiveView.onDeactivate();
			}

			// Hook: Active new view
			this._hookActivate( newView, options.animated, true );


			// Update view's url
			this.trigger('pushed', newView).refreshUrl(options.url);

			return this;
		},

		// Remove a view from viewstack
		popView: function popView(poppedView, options){
			if (!(poppedView instanceof Backbone.View) && typeof options === "undefined" ) {
				options    = poppedView;
				poppedView = undefined;
			}

			if ( !_.isObject(options) )
				options = {};

			var self 	    = this;
			var currentView = self._current;

			if ( _.isUndefined(poppedView) || _.isNull(poppedView) )
				poppedView = currentView;


			// Hook: before pop
			if ( poppedView.onBeforePop )
				poppedView.onBeforePop();


			if ( !options.animated ){
				poppedView = self._popView(poppedView, options);
				runPopHook();
				return poppedView;
			}

			poppedView = self._popView(poppedView, options);

			if ( !poppedView )
				return null;


			var animationPopDuration = null;
			if ( poppedView.getAnimationPopDuration )
				animationPopDuration = poppedView.getAnimationPopDuration();

			if ( animationPopDuration !== null ){
				setTimeout(function(){
					runPopHook()
				}, animationPopDuration );
				poppedView.$el.addClass('pop');
				return this;
			}

			if ( _.isString(animationPopDuration) && !_.isEmpty(animationPopDuration) ){

				poppedView.$el.on(_animationEnd, function (e) {
					if ( e && e.originalEvent && e.originalEvent.animationName == animationPopDuration ){
						poppedView.$el.off(_animationEnd);
						runPopHook()
					}
				});

				poppedView.$el.addClass('pop');
				return this;
			}

			poppedView.$el.one(_animationEnd, function (e) {
				runPopHook()
			});
			poppedView.$el.addClass('pop');

			return poppedView;

			function runPopHook(destroy) {
				if ( poppedView.onPop )
					poppedView.onPop();
				poppedView.trigger('pop');
				if ( poppedView.destroy )
					poppedView.destroy();
			}
		},

		popViewFromClassType: function popViewFromClassType(classType, options) {
			var self = this;
			var instances = _.filter(this._stack, function (item) {
				return item.view instanceof classType;
			});
			_.forEach(instances, function (anInstance) {
				self.popView(anInstance.view, anInstance.options);
			});
			return this;
		},

		popViewToInstance: function popViewToInstance(instance, options) {
			options = _.defaults(options || {}, {
				popInstance: true
			});
			var indexOfViewToPop = this.indexOf(instance);
			if (indexOfViewToPop === -1) return;
			for (var i = this._stack.length - 1; shouldPopView(i); i--) {
				this.popView(this._stack[i].view, options);
			}
			return this;

			function shouldPopView(indexOfView) {
				if (indexOfView > indexOfViewToPop)
					return true;
				else if (options.popInstance && indexOfView === indexOfViewToPop)
					return true;
				else
					return false;
			}
		},


		onSwipeBack: function onSwipeBack(percent, animated) {
			var indexCurrentView = this.indexOf( this._current );
			var prevView = this.getViewAtIndex( indexCurrentView-1 );
			if ( prevView instanceof Backbone.View && prevView.move ){
				prevView.move(100-percent, 2, animated); // TODO: Mettere la costante RESTORE = 2
			}
			return this;
		},


		// Update page URL
		refreshUrl: function refreshUrl(url) {
			var context = this._context;
			if ( !_.isObject(context) )
				return this;

			if (!url) {
				var stack = this._stack;
				var aChunck;
				url = [];
				_.each(stack, function (anElement) {
					aChunck = _.result(anElement.view, 'url');
					if (aChunck)
						url.push(aChunck);
				});
				url = url.join('/');
			}

			if ( context && context.page && typeof url == "string" && !_.isEmpty(url) )
				context.page.navigate(url, { trigger: false });

			return this;
		},


		//
		// Private
		//


		_popView: function _popView(poppedView, options) {

			options = _.defaults(options || {}, {
				silent: false
			});

			var elementPoppedView = null;
			if ( poppedView instanceof Backbone.View ){
				var index = _.findIndex(this._stack, function (el) {
					return el.view == poppedView;
				});
				if ( index > -1 ){
					elementPoppedView = this._stack.splice(index, 1);
					if ( _.isArray(elementPoppedView) )
						elementPoppedView = elementPoppedView[0];
				}
			}else{
				elementPoppedView = this._stack.pop();
			}

			if ( !_.isObject(elementPoppedView) || !elementPoppedView.view ){
				return null;
			}

			poppedView = elementPoppedView.view;

			// Assegno la nuova view corrente
			var el = this._stack[ this._stack.length-1 ];
			if ( _.isObject(el) && el.view ){

				this._current = el.view;
				// Hooks activate
				this._hookActivate( this._current, !!elementPoppedView.options.animatePreviousView, false );
			}

			if (!options.silent) {
				this.trigger('popped', poppedView);
			}

			this.refreshUrl();

			return poppedView;
		},

		_hookActivate: function _hookActivate(view, animate, firstTime) {
			if ( !(view instanceof Backbone.View) )
				return this;

			// Hook on before
			if ( view.onBeforeActivate )
				view.onBeforeActivate(firstTime);


			if ( !animate ){
				runActivateHook();
				return this;
			}

			var animationPushDuration = null;

			// I get the entry animation runtime. If it is done by javascript
			if ( view.getAnimationPushDuration )
				animationPushDuration = view.getAnimationPushDuration();

			if ( _.isNumber(animationPushDuration)){
				setTimeout(function () {
					runActivateHook();
				}, animationPushDuration);
				return this;
			}

			// I wait for the end of the CSS's animation with a particular name.
			if ( !_.isEmpty(animationPushDuration) && _.isString(animationPushDuration) ){
				view.$el.on(_animationEnd, function (e) {
					if ( e && e.originalEvent && e.originalEvent.animationName == animationPushDuration ){
						poppedView.$el.off(_animationEnd);
						runActivateHook();
					}
				});
				return this;
			}

			// I wait for the end of the CSS's animation.
			view.$el.one(_animationEnd, function (e) {
				runActivateHook();
			});

			return this;

			function runActivateHook() {
				if ( view.onActivate )
					view.onActivate(firstTime);
			}

		},

		_hookDeactive: function _hookDeactive(view, animate) {
			if ( !(view instanceof Backbone.View) )
				return this;

			// Hook on before deactivate old active view
			if ( view && view.onBeforeDeactivate )
				view.onBeforeDeactivate();

			// if the request is not the animation
			if ( !animate ){
				runDeactivateHook();
				return this;
			}


			var animationPopDuration = null;

			// I get the animation runtime. If it is done by javascript
			if ( view.getAnimationPopDuration )
				animationPopDuration = view.getAnimationPopDuration();

			if ( _.isNumber(animationPopDuration) ){
				setTimeout(function () {
					runDeactivateHook();
				}, animationPopDuration);
				return this;
			}

			// I wait for the end of the CSS's animation with a particular name.
			if ( !_.isEmpty(animationPopDuration) && _.isString(animationPopDuration) ){
				view.$el.on(_animationEnd, function (e) {
					if ( e && e.originalEvent && e.originalEvent.animationName == animationPopDuration ){
						poppedView.$el.off(_animationEnd);
						runDeactivateHook();
					}
				});
				return this;
			}

			// I wait for the end of the CSS's animation.
			view.$el.one(_animationEnd, function (e) {
				runDeactivateHook();
			});

			return this;

			function runDeactivateHook(){
				if ( view.onDeactivate )
					view.onDeactivate();
			}
		}

	});


	ViewStack.middleware = function middleware(options){
		if (!options)
			options = {};

		return function(context, next){
			options.context = context;
			var vs = new ViewStack(options);
			vs.clearStack();
			vs.render();
			context.viewstack = vs;
			next();
		};
	};

	return ViewStack;

}));
