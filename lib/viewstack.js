
var $ = require('jquery');
var _ = require("underscore");
var Backbone = require("backbone");

var ViewStack = module.exports = Backbone.View.extend({

	_stack: null,
	_stackReplace: null,
	_current: null,
	_length: null,
	_baseZIndex: 0,

	initialize: function initialize(options){
		if (!options || (!options.context && !options.shared))
			throw new Error('Cannot initialize ViewStack without options.context');

		this._context = options.context || options.shared;
		this._stack   = [];
		this._stackReplace = [];
		this._current = null;
		this.$el.empty();
	},

	initStack: function initStack(){
		if ( this._length === null ){
			this._length = this._stack.length;
			return this;
		}
			
		this.clearStack( this._length );
		return this;
	},

	render: function render(){
		return this;
	},

	getView: function getView(){
		return this._stack.length > 0 ? this._stack[ this._stack.length - 1 ] : null;
	},

	getViewActive: function getViewActive(){
		return this._current;
	},

	// pushView
	// Aggiunge una view all'applicazione con z-Index più alto
	pushView: function pushView( newView, options ){
		options = _.defaults(options || {
			deactivateCurrentView: true
		});

		// Controllo se è la stessa view che sto cercando di pushare
		if ( this._current === newView ) return this;

		var zIndex = this.getZIndex();

		if ( options && options.replace == true ){

			if ( this._current ){

				var popped = this._stack.pop();

				this._stackReplace.push( popped );

				popped.$el.detach();

				// Setto lo z-index
				if ( newView.setZindex )
					newView.setZindex( zIndex );
				else
					newView.$el.css("z-index", zIndex);

				this._stack.push( newView );

				this.$el.append( newView.el );

				// Lancio l'evento onDeactivate se è impostato
				if ( this._current && this._current.onDeactivate && options.deactivateCurrentView === true)
					this._current.onDeactivate();

				// setto la view Corrente
				this._current = newView;
				// 
				newView.render();
			}

		}else{

			// Setto lo z-index
			if ( newView.setZindex )
				newView.setZindex( zIndex );
			else
				newView.$el.css("z-index", zIndex);
			// aggiungo allo stack
			this._stack.push( newView );
			// Appendo alla view dell'applicazione
			this.$el.append( newView.el );

			// Lancio l'evento onDeactivate se è impostato
			if ( this._current && this._current.onDeactivate && options.deactivateCurrentView === true)
				this._current.onDeactivate();

			// setto la view Corrente
			this._current = newView;
			// 
			newView.render();

			if ( this._current && this._current.onActivate ) 
				this._current.onActivate(true);

		}

		// Scateno l'evento active per dire alla view che è attiva
		if ( this._current ) {
			this._current.trigger("active");
		}

		this
			.refreshUrl(options.url)
			.trigger('pushed', newView);
		return this;
	},

	// popView 
	// Rimuove l'ultima view dello stack
	popView: function popView(poppedView, options){
		if (!(poppedView instanceof Backbone.View) && typeof options === "undefined" ) {
			options = poppedView;
			poppedView = undefined;
		}

		if (!options)
			options = {};

		var self 	    = this,
			currentView = self._current;

		if (!poppedView)
			poppedView = currentView;

		if (!options.animated){
			if ( poppedView.onPop ) poppedView.onPop();
			poppedView.trigger('pop');
			return self._popView(poppedView);
		}

		self._popView(poppedView, false);

		if ( !options.animatedName ){
			poppedView.$el.one('webkitAnimationEnd mozAnimationEnd msAnimationEnd animationend', function (e) {
				if ( poppedView.onPop )
					poppedView.onPop();
				poppedView.trigger('pop');
				poppedView.destroy();
				poppedView.trigger("deactive");
			});
		}else{
			// Viene usata nei casi di più animazioni nella view. Cos' mi assicuro di distruggerla solo dopo aver
			// terminato l'animazione desiderata
			poppedView.$el.on('webkitAnimationEnd mozAnimationEnd msAnimationEnd animationend', function (e) {
				if ( e && e.originalEvent && e.originalEvent.animationName == options.animatedName ){
					poppedView.$el.off('webkitAnimationEnd mozAnimationEnd msAnimationEnd animationend');
					if ( poppedView.onPop )
						poppedView.onPop();
					poppedView.trigger('pop');
					poppedView.destroy();
					poppedView.trigger("deactive");
				}
			});
		}
		poppedView.$el.addClass('pop');

		return poppedView;
	},

	// Update page URL
	refreshUrl: function refreshUrl(url) {
		var context = this._context;

		if (!url) {
			var stack = this._stack;
			var aChunck;
			url = [];
			_.each(stack, function (aView) {
				aChunck = _.result(aView, 'url');
				if (aChunck)
					url.push(aChunck);
			});
			url = url.join('/');
		}

		if ( context && context.page && typeof url == "string" && !_.isEmpty(url) )
			context.page.navigate(url, { trigger: false });

		return this;
	},

	// clearStack 
	// Pulisce tutto lo stack dalle view
	clearStack: function clearStack(length){
		if (!length) length = 0;
		while ( this._stack.length > length ){
			this.popView();
		}
	},
	
	size: function size(){
		return this._stack.length;
	},
	
	//
	// Private
	// 

	_popView: function _popView(poppedView, destroy) {

		if ( typeof destroy == "undefined" )
			destroy = true;

		if ( typeof poppedView !== "undefined" ){
			var index = _.indexOf(this._stack, poppedView);
			delete this._stack[ index ];
			this._stack = _.compact(this._stack);
		}else{
			poppedView = this._stack.pop();
		}

		if ( poppedView && destroy ) {
			poppedView.destroy();
			poppedView.trigger("deactive");
		}

		// Stack replace
		if ( this._stackReplace.length > 0 ){
			this.pushView( this._stackReplace.pop() );
		}else{
			// Assegno la nuova view corrente
			this._current = this._stack[ this._stack.length-1 ];
			if ( this._current && this._current.onActivate ) 
				this._current.onActivate(false);
		}

		this
			.refreshUrl()
			.trigger('popped', poppedView);

		return poppedView;
	},

	exists: function exists(classType) {
		var result = _.find(this._stack, function (aView) {
			return aView instanceof classType;
		});
		return !!result;
	},

	indexOf: function indexOf(view) {
		return _.indexOf(this._stack, view);
	},

	getFirstInstanceFromClassType: function getFirstInstanceFromClassType(classType) {
		return _.find(this._stack, function (aView) {
			return aView instanceof classType;
		});
	},

	popViewFromClassType: function popViewFromClassType(classType, options) {
		var self = this;
		var instances = _.filter(this._stack, function (aView) {
			return aView instanceof classType;
		});
		_.forEach(instances, function (anInstance) {
			self.popView(anInstance, options);
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
			this.popView(this._stack[i], options);
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

	getZIndex: function () {
		return (this._stack.length * 100) + 100 + this._baseZIndex;
	},

	setBaseZIndex: function (value) {
		this._baseZIndex = parseInt(value);
		return this;
	},

	getBaseZIndex: function () {
		return this._baseZIndex;
	}

});


ViewStack.middleware = function middleware(options){
	if (!options) 
		options = {};

	return function(context, next){
		options.context = context;
		var viewStack = new ViewStack(options);
		viewStack.clearStack(); // Pulisco dalle eventuali view appese
		viewStack.render(); // Renderizzo la view base application
		context.viewstack = viewStack;
		next();
	};
}
