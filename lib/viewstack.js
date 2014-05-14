;(function(){

var _ = require("underscore");
var $ = require('jquery');
var BackBone = require("backbone");

var ViewStack = module.exports = BackBone.View.extend({

	_stack: null,
	_stackReplace: null,
	_current: null,

	initialize: function initialize(){
		this._stack   = [];
		this._stackReplace = [];
		this._current = null;
		this.$el.empty();
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

		// Controllo se è la stessa view che sto cercando di pushare
		if ( this._current === newView ) return this;


		if ( options && options.replace == true ){

			if ( this._current ){

				var popped = this._stack.pop();

				this._stackReplace.push( popped );

				popped.$el.detach();

				// Calcolo il nuovo z-Index che è incrementale
				var zIndex = (this._stack.length*100) + 100;
				// Setto lo z-index
				if ( newView.setZindex )
					newView.setZindex( zIndex );
				else
					newView.$el.css("z-index", zIndex);

				this._stack.push( newView );

				this.$el.append( newView.el );

				// setto la view Corrente
				this._current = newView;
				// 
				newView.render();


			}

		}else{

			if ( this._current && this._current.onActivate ) 
				this._current.onActivate();

			// Calcolo il nuovo z-Index che è incrementale
			var zIndex = (this._stack.length*100) + 100;
			// Setto lo z-index
			if ( newView.setZindex )
				newView.setZindex( zIndex );
			else
				newView.$el.css("z-index", zIndex);
			// aggiungo allo stack
			this._stack.push( newView );
			// Appendo alla view dell'applicazione
			this.$el.append( newView.el );
			// setto la view Corrente
			this._current = newView;
			// 
			newView.render();

		}

		// Scateno l'evento active per dire alla view che è attiva
		if ( this._current )
        	this._current.trigger("active");

		this
			.refreshUrl()
			.trigger('pushed', newView);
		return this;
	},

	
	// popView 
	// Rimuove l'ultima view dello stack
	popView: function popView(){

		var self 	   = this,
			poppedView = self._current;

		if ( !poppedView || !poppedView.onDeactivate )
			return self._popView();

		poppedView.onDeactivate(function(){
			self._popView();
		});
		return poppedView;

	},

	// refresh
	// Aggiorna l'url se la view corrette ce l'ha settata
	refreshUrl: function refreshUrl(){
		var shared = this.getShared();
		if ( typeof shared !== "undefined" && this._current && this._current.url ){
			shared.app.navigate(_.result(this._current, 'url'));
		}	
		return this;
	},

	// clearStack 
	// Pulisce tutto lo stack dalle view
	clearStack: function clearStack(){
		
		while( this._stack.length > 0 ){
			this.popView();
		}

		return this;
	},


	//
	// Private
	// 

	_popView: function _popView(){
		var popped = this._stack.pop();
		if (popped) {
            popped.destroy();
            popped.trigger("deactive");
        }

        // Assegno la nuova view corrente
        this._current = this._stack[ this._stack.length-1 ];

        if ( this._stackReplace.length > 0 ){
        	this.pushView( this._stackReplace.pop() );
        }

        this
			.refreshUrl()
			.trigger('popped', popped);

		return popped;
	}

});


ViewStack.middleware = function middleware(options){
	return function(shared, next){
		var viewStack = new ViewStack(options);
		viewStack.clearStack(); // Pulisco dalle eventuali view appese
		viewStack.setShared( shared ); // setto lo shared object
		viewStack.render(); // Renderizzo la view base application
		shared.viewstack = viewStack;
		next();
	}

}

})();