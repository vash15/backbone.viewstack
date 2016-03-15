Backbone View Stack
==================

Backbone View Stack is a simple way to manage the view into web and mobile application. It is based entirely on a navigation stack.



![View Stack](ViewStack.png)



## Demo

Coming soon...

## Dependencies

* Underscore
* Backbone

## Installation

    $ bower install backbone.viewstack --save

## API

### initialize([options])
It's the initialize of Backbone.View.

Options:

- `context` this is the context of the application. It's a global object of the application. We suggest using the package `$ bower install context-utils --save`.
- `zIndex` is the base value from where the ViewStack to increase the z-index. Default: `0`.
- `zIndexGap` is the value that indicates how much must increase the z-index for each `pushView`. Default: `100`.


### initStack
Initialize stack emptying it from view.

### clearStack([length])
It cleans up the stack up to a certain index. The `length` parameter is optional. Default: `0`.

### size
Return the total of views contained into stack.

### exists(classType)
Checks if there is at least one view within the stack with the `classType`.

### indexOf(view)
Return the stack index of a given instance of view.

### getView
Return the last view.

### getViewActive
Return the active view.
Ritorna la view attiva. It can be active only one view.

### getViewAtIndex(index)
Return the view at index.

### getFirstInstanceFromClassType(classType)
Return the first instance view from `classType`.

### getZIndex
Return the z-index of view stack.

### setBaseZIndex(zIndex)
Set the z-indx of start.

### getBaseZIndex
Return the z-index of start.

### pushView(view [,options])
Add an instance of a view to the ViewStack.

Options:
- `render` if `true` viewstack rendered the view after append it into the DOM. Default: `true`.
- `animatePreviousView` it indicates whether animate the previous view when deactivate. Default: `true`.
- `animated` it indicates whether the view is animated and has to wait for the end of the animation to trigger hooks. Default: `false`
- `url` it indicates the url referenced by view. It's not mandatory.


### popView([view] [,options])
Rimuove una istanza di view dal viewstack. Il paramentro `view` non è obbligatorio, e se non viene passato la view eliminata sarà l'ultima inserita. Comunque è buona norma passare sempre l'istanza della view che si vuole eliminare.

Options:
- `animated` indica se la view è animata e deve aspettare la fine dell'animazione per scatenare gli hook. Default: `false`


### popViewFromClassType(classType [,options])
Rimuove una view partendo dalla suo tipo. Se ci sono più view con la stesso tipo verranno rimosse tutte.

### popViewToInstance(instance [,options])
Rimuove tutte le view dallo stack fino all'instanza desiderata.

Options:
- `popInstance` se impostato a `true` l'istanza passata verrà a sua volta eliminata. Default `true`.


### refreshUrl([url])
Metodo per aggiornare l'url a cui fa riferimento la view attiva. Se non gli viene passato nessun paramentro, il metodo scorrerà tutto lo stack di view componendo l'url tramite il metodo `url()` delle view.


## Hook
Questa serie di hook vengono dichiarati all'interno delle view stesse. Sono delle utility e stati che vengo richiamati dal viewstack in determinate fasi. Ad esempio se si vuole eseguire del codice prima che la view venga attivata si può implementare il metodo `onBeforeActivate`.


### onBeforePush
Viene richiamato prima di aggiungere la view al DOM e allo stack.

### onPush
Viene richiamato subito dopo aver appeso la view al DOM della pagina e accodato allo stack.

### onBeforeActivate(firstTime)
Viene richiamato prima dell'attivazione della view. Il paramentro impostato a `true` indica che la view è appena stata creata e aggiunta. Quando è a `false` indica che sta tornando attiva.

### onActivate(firstTime)
Viene richiamato quando la view è attiva. Se la view ha un'animazione di ingresso, il metodo viene richiamato solamente dopo il termine dell'animazione.
Ci sono quattro modi in cui il metodo può essere richiamato:

- Senza animazione. Viene richiamato subito dopo `onBeforeActivate`
- Animazione CSS. Viene richiamato dopo aver ricevuto l'evento `animationend`.
- Più di un'animazione CSS. In questo caso è possibile dire al hook di aspettare la fine di una determinata animazione CSS passandogli il nome. Il metodo da utilizzare è `getAnimationPushDuration` e far ritornare una stringa con il nome dell'animazione.
- Animazione gestita dal Javascript. Per impostare il tempo di esecuzione dell'animazione utilizzare il metodo `getAnimationPushDuration` e far ritornare un tempo in millisecondi.

### onBeforeDeactivate
Viene richiamato prima di disattivare la view. In questo caso non viene distrutta e rimossa dal DOM ma è solamente in secondo piano.
Un suggerimento che posso dare è quello di disattivare gli eventi della view e evenutali scroll i questa fase.

### onDeactivate
Viene richiamto quando la view è stata disattivata. Se la view viene disattivata con animazione attiva ( `viewstack.popView(myView,{animated: true})` ), il metodo verrà richiamato solamente dopo il termine dell'animazione.
Ci sono quattro modi in cui il metodo può essere richiamato:

- Senza animazione. Viene richiamato subito dopo `onBeforeDeactivate`
- Animazione CSS. Viene richiamato dopo aver ricevuto l'evento `animationend`.
- Più di un'animazione CSS. In questo caso è possibile dire al hook di aspettare la fine di una determinata animazione CSS passandogli il nome. Il metodo da utilizzare è `getAnimationPopDuration` e far ritornare una stringa con il nome dell'animazione.
- Animazione gestita dal Javascript. Per impostare il tempo di esecuzione dell'animazione utilizzare il metodo `getAnimationPopDuration` e far ritornare un tempo in millisecondi.

### onBeforePop
Viene richiamato prima di rimuovere la view dal DOM.

### onPop
Viene richiamato dopo aver eseguito le varie animazioni di uscita e rimosso la view dal DOM e dallo stack.


### getAnimationPushDuration
È una util che può ritornare la duarata dell'animazione in millisecndi oppure una stringa che indica il nome dell'animazione CSS d'attendere.

### getAnimationPopDuration
È una util che può ritornare la duarata dell'animazione in millisecndi oppure una stringa che indica il nome dell'animazione CSS d'attendere.

## Usage

```javascript

var _         = require("underscore");
var BackBone  = require("backbone");
var ViewStack = require('viewstack');

// Declare a Home page view
var HomePageView = new Backbone.View({

	className: 'home-page',

	initialize: function initialize(options) {
		this.options = _.defaults(options||{}, {title: ''});
	},

	render: function render() {

		this.$el.empty().html( '<h1>' + this.options.title + '</h1>' );

		return this;
	},

	destroy: function destroy() {
		if (this.options.removeOnDestroy)
			this.remove();
		else {
			this.undelegateEvents();
		}
		this.off();
		if (this.onDestroy)
			this.onDestroy();
	},

	onBeforePush: function() {
		console.log("onBeforePush");
	},

	onPush: function() {
		console.log("onPush");
	},

	onBeforeActivate: function() {
		console.log("onBeforeActivate");
	},

	onActivate: function() {
		console.log("onActivate");
	},

	onBeforeDeactivate: function() {
		console.log("onBeforeDeactivate");
	},

	onDeactivate: function() {
		console.log("onDeactivate");
	},

	onBeforePop: function() {
		console.log("onBeforePop");
	},

	onPop: function() {
		console.log("onPop");
	}

});


// Initialize stack width elememt id
var viewStack = new ViewStack({ el: "#application" });
viewStack.clearStack(); // Empty stack view
viewStack.render(); // Render view

// Create a view
var hpView = new HomePageView({
	title: 'Hello World!!'
});

viewStack.pushView( hpView ); // Push a view

setTimeout(function(){
	viewStack.popView( hpView ); // Pop a view
}, 5000);

```


## Licence

Released under MIT License (MIT) Copyright (c) 2014-2016 Matteo Baggio & Michele Belluco
