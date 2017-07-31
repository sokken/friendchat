/*©agpl*************************************************************************
*                                                                              *
* Friend Unifying Platform                                                     *
* ------------------------                                                     *
*                                                                              * 
* Copyright 2014-2016 Friend Software Labs AS, all rights reserved.            *
* Hillevaagsveien 14, 4016 Stavanger, Norway                                   *
* Tel.: (+47) 40 72 96 56                                                      *
* Mail: info@friendos.com                                                      *
*                                                                              *
*****************************************************************************©*/

'use strict';

var api = api || {};
var friendUP = window.friendUP || {};
var Doors = window.Doors || {};
var friend = window.friend || {};

// dummy View to collect .run() handler from application
//window.View = {};

// ViewEvent
(function( ns, undefined )
{
	ns.ViewEvent = function()
	{
		if ( !( this instanceof ns.ViewEvent ))
			return new ns.ViewEvent();
		
		var self = this;
		self.listener = {};
		
		self.eventInit();
	}
	
	ns.ViewEvent.prototype.eventInit = function()
	{
		var self = this;
		self.eventMap = {
			'focus'        : focus,
			'blur'         : blur,
			'initappframe' : initialize,
			'initialize'   : initialize,
			'notify'       : notify,
			'register'     : register,
			'viewtheme'    : viewtheme,
			'refreshtheme' : systemTheme,
		};
		
		function close( e ) { self.close( e ); }
		function focus( e ) { self.focus( e ); }
		function blur( e ) { self.blur( e ); }
		function initialize( e ) { self.initialize( e ); }
		function notify( e ) { self.notify( e ); }
		function register( e ) { self.register( e ); }
		function viewtheme( e ) { self.handleViewTheme( e ); }
		function systemTheme( e ) { self.handleSystemTheme( e ); }
		
		self.notifyMap = {
			'activateview' : activated,
			'deactivateview' : deactivated,
		};
		
		function activated( e ) { self.activated( e ); }
		function deactivated( e ) { self.deactivated( e ); }
		
		window.addEventListener( 'message', receiveEvent, false );
		function receiveEvent( e ) { self.receiveEvent( e ); }
	}
	
	ns.ViewEvent.prototype.receiveEvent = function( e ) {
		var self = this;
		var msg = friendUP.tool.objectify( e.data );
		if ( !msg ) {
			console.log( 'view.receiveEvent - no msg for event', e );
			return;
		}
		msg.origin = e.origin;
		var handler = self.eventMap[ msg.command ];
		if ( !handler )
		{
			self.viewEvent( msg );
			return;
		}
		
		handler( msg );
	}
	
	ns.ViewEvent.prototype.viewEvent = function( msg )
	{
		var self = this;
		var handler = self.listener[ msg.type ];
		if ( !handler ) {
			self.receiveMessage( msg );
			return;
		}
		
		handler( msg.data );
	}
	
	ns.ViewEvent.prototype.notify = function( msg )
	{
		var self = this;
		var handler = self.notifyMap[ msg.method ];
		if ( !handler ) {
			console.log( 'unkown notify event', msg );
			return;
		}
		
		handler( msg );
	}
	
	ns.ViewEvent.prototype.on = function( event, handler )
	{
		var self = this;
		self.listener[ event ] = handler;
	}
	
	ns.ViewEvent.prototype.off = function( event )
	{
		var self = this;
		if ( self.listener[ event ])
			delete self.listener[ event ];
	}
	
	ns.ViewEvent.prototype.allOff = function()
	{
		var self = this;
		self.listener = {};
	}
	
})( api );

// View
(function( ns, undefined )
{
	ns.View = function()
	{
		if ( !( this instanceof ns.View ))
			return new ns.View( conf );
		
		api.ViewEvent.call( this );
		
		var self = this;
		self.id = null;
		self.applicationId = null;
		self.authId = null;
		self.parentOrigin = null;
		self.domain = null;
		self.locale = null;
		self.themePath  = null;
		self.viewTheme = null;
		self.run = null;
		self.isActive = null;
		self.deviceType = '';
		
		self.scriptsLoaded = false;
		self.cssLoaded = false;
		
		self.init();
	}
	
	ns.View.prototype = Object.create( api.ViewEvent.prototype );
	
	// public
	
	ns.View.prototype.setBody = function( conf ) {
		const self = this;
		if ( !friend.template )
			friend.template = new friendUP.gui.TemplateManager();
		
		const frags = document.getElementById( 'fragments' );
		if ( !frags )
			return false;
		
		var fragStr = frags.innerHTML;
		fragStr = View.i18nReplaceInString( fragStr );
		friend.template.addFragments( fragStr );
		conf = conf || {};
		const el = friend.template.getElement( 'body-tmpl', conf );
		document.body.appendChild( el );
		return true;
	}
	
	ns.View.prototype.loaded = function() {
		const self = this;
		self.sendMessage({
			type : 'loaded',
		});
	}
	
	ns.View.prototype.ready = function() {
		const self = this;
		self.sendMessage({
			type : 'ready',
		});
	}
	
	ns.View.prototype.close = function( msg )
	{
		var self = this;
		self.sendMessage({
			type : 'close',
		});
	}
	
	ns.View.prototype.focus = function( msg ) {
		var self = this;
		//console.log( 'view.focus', msg );
	}
	
	ns.View.prototype.blur = function( msg ) {
		var self = this;
		//console.log( 'view.blur', msg );
	}
	
	// private
	
	ns.View.prototype.init = function() {
		var self = this;
		self.addAPIScripts();
		document.addEventListener( 'readystatechange', checkState, false );
		function checkState( e ) {
			//e.stopPropagation();
			if ( 'interactive' === document.readyState ) {
				self.setIsLoading( true );
			}
			
			if ( document.readyState === 'complete' ) {
			}
		}
	}
	
	ns.View.prototype.triggerReflow = function( el ) {
		var self = this;
		if ( !el ) {
			console.log( 'View.triggerReflow - no element' );
			return;
		}
		
		//console.log( 'triggerReflow', el.offsetHeight );
	}
	
	ns.View.prototype.setIsLoading = function( isLoading ) {
		var self = this;
		document.body.classList.toggle( 'Loading', isLoading );
	}
	
	ns.View.prototype.buildFileUrl = function( path ) {
		var self = this;
		var pre = '/system.library/file/read/?path=';
		var post = '&authid=' + self.authId + '&mode=rb';
		var url =  pre + path + post;
		return url;
	}
	
	// undefined will fall back on what is set before ( likey window config ).
	// empty filepath, filepath.length === 0, will unset, same as removeViewTheme.
	// filepath will be set
	ns.View.prototype.setViewTheme = function( filepath ) {
		var self = this;
		// remove current
		self.removeViewTheme();
		// set new filepath if defined,
		// abort if viewTheme is not set at all
		if ( typeof( filepath ) !== 'undefined' )
			self.viewTheme = filepath;
		
		if ( !self.viewTheme || !self.viewTheme.length )
			return;
		
		var url = self.buildFileUrl( self.viewTheme );
		var css = document.createElement( 'link' );
		css.type = 'text/css';
		css.rel = 'stylesheet';
		css.id = 'css-app-theme';
		document.head.appendChild( css );
		css.href = url;
	}
	
	ns.View.prototype.removeViewTheme = function() {
		var self = this;
		var element = document.getElementById( 'css-app-theme' );
		if ( !element )
			return;
		
		element.parentNode.removeChild( element );
	}
	
	ns.View.prototype.checkAllLoaded = function() {
		var self = this;
		if ( !self.scriptsLoaded || !self.cssLoaded )
			return;
		
		if ( self.run ) {
			self.run();
			self.run = null;
		}
		
		self.setIsLoading( false );
		self.activate();
		self.send({
			type: 'notify',
		});
	}
	
	ns.View.prototype.initialize = function( conf )
	{
		var self = this;
		self.id = conf.viewId;
		self.applicationId = conf.applicationId;
		self.authId = conf.authId;
		self.parentOrigin = conf.origin;
		self.domain = conf.domain;
		self.locale = conf.locale;
		self.theme  = conf.theme;
		self.config = conf.viewConf;
		
		self.detectDeviceType();
		self.setBaseCss( baseCssLoaded );
		if ( self.config )
			self.handleConf();
		
		document.body.addEventListener( 'mousedown', activate, false );
		function activate( e ) { self.activate( e ); }
		
		function baseCssLoaded() {
			self.cssLoaded = true;
			self.checkAllLoaded();
		}
	}
	
	ns.View.prototype.addAPIScripts = function() {
		var self = this;
		// scripts
		var scripts = [
			'io/cajax.js', // dependency for cssparser.js
			'utils/engine.js',
			'utils/tool.js',
			'utils/cssparser.js',
			'gui/template.js',
		];
		var path = '/webclient/js/';
		var pathArr = scripts.map( setPath );
		var scriptPath = pathArr.join( ';' );
		var script = document.createElement( 'script' );
		script.onload = systemScriptsLoaded;
		script.type = 'text/javascript';
		script.src = scriptPath;
		document.head.appendChild( script );
		
		function setPath( script ) { return path + script; }
		function systemScriptsLoaded() {
			self.scriptsLoaded = true;
			self.checkAllLoaded();
		}
	}
	
	ns.View.prototype.setBaseCss = function( callback ) {
		var self = this;
		if ( self.theme )
			self.themePath = '/themes/' + self.theme;
		else
			self.themePath = '/webclient/theme';
		
		var themedScrollbars = self.themePath + '/scrollbars.css';
		var compiledTheme = self.themePath + '/theme_compiled.css';
		var css = {
			'css-font-awesome' : '/webclient/css/font-awesome.min.css',
			'css-system-scrollbars' : themedScrollbars,
			'css-system-theme' : compiledTheme,
		};
		
		if ( self.viewTheme )
			css[ 'css-app-theme' ] = self.viewTheme;
		
		self.loadCss( css, callback );
	}
	
	ns.View.prototype.loadCss = function( idFileMap, callback ) {
		var self = this;
		var filesLeft = 0;
		load( idFileMap );
		
		function load( cssMap ) {
			var ids = Object.keys( cssMap );
			ids.forEach( setCss );
			function setCss( id ) {
				removeIfExists( id );
				filesLeft++;
				var path = cssMap[ id ];
				var css = document.createElement( 'link' );
				css.type = 'text/css';
				css.rel = 'stylesheet';
				css.id = id;
				document.head.appendChild( css );
				css.href = path;
				css.onload = loaded;
				
				function loaded() {
					filesLeft--;
					if ( !filesLeft && callback )
						callback();
				}
			}
		}
		
		function removeIfExists( id ) {
			var el = document.getElementById( id );
			if ( !el )
				return;
			
			el.parentNode.removeChild( el );
		}
	}
	
	ns.View.prototype.handleConf = function() {
		var self = this;
		if ( self.config.viewTheme )
			self.setViewTheme( self.config.viewTheme );
		
		if ( self.config.translations )
			self.translations = self.config.translations;
	}
	
	ns.View.prototype.setDeviceType = function( type ) {
		var self = this;
		self.deviceType = type;
		//console.log( 'deviceType set to', type );
	}
	
	ns.View.prototype.detectDeviceType = function() {
		var self = this;
		var type = 'desktop'; // default
		var test = [
			'VR',
			'Mobile',
		]; // priority list
		var rxBody = test.join( '|' );
		var rx = new RegExp( '(' + rxBody + ')', 'g' );
		var ua = window.navigator.userAgent;
		var match = ua.match( rx );
		if ( match )
			type = get( test, match );
		
		self.setDeviceType( type );
		
		function get( test, match ) {
			var type = '';
			test.some( is );
			return type;
			
			function is( value ) {
				if ( -1 === match.indexOf( value ))
					return false;
				
				type = value;
				return true;
			}
		}
	}
	
	ns.View.prototype.activate = function() {
		var self = this;
		var msg = {
			method : 'activate',
		};
		self.sendViewEvent( msg );
	}
	
	ns.View.prototype.activated = function()
	{
		var self = this;
		self.viewEvent({
			type : 'focus',
			data : true,
		});
		
		self.isActive = true;
		document.body.classList.add( 'activated' );
	}
	
	ns.View.prototype.deactivated = function()
	{
		var self = this;
		self.viewEvent({
			type : 'focus',
			data : false,
		});
		
		self.isActive = false;
		document.body.classList.remove( 'activated' );
	}
	
	ns.View.prototype.handleViewTheme = function( msg ) {
		var self = this;
		var data = msg.data;
		if ( data.type === 'set' )
			self.setViewTheme( data.data );
		else
			self.removeViewTheme();
	}
	
	ns.View.prototype.handleSystemTheme = function( data ) {
		var self = this;
		self.setIsLoading( true );
		self.theme = data.theme;
		self.setBaseCss( setBack );
		function setBack() {
			self.setIsLoading( false );
		}
	}
	
	ns.View.prototype.sendMessage = function( data, callback )
	{
		var self = this;
		if ( !self.id )
			throw new Error( 'View not yet initialized' );
		
		var msg = { data : data };
		if ( callback ) {
			var callbackId = friendUP.tool.uid();
			msg.data.callback = callbackId;
			self.on( callbackId, callback );
		}
		
		self.send( msg );
	}
	
	ns.View.prototype.sendViewEvent = function( msg )
	{
		var self = this;
		msg.type = 'view';
		self.send( msg );
	}
	
	ns.View.prototype.send = function( msg )
	{
		const self = this;
		msg.viewId = self.id;
		msg.applicationId = self.applicationId;
		
		const msgString = friendUP.tool.stringify( msg );
		window.parent.postMessage( msgString, self.parentOrigin );
	}
	
	ns.View.prototype.receiveMessage = function( msg )
	{
		var self = this;
		/*
		console.log( 'View.receiveMessage - '
			+ ' provide your own implementation of this function'
			+ ' to receive unhandled messages in your view', msg );
		*/
	}
	
	// Get a translated string
	ns.View.prototype.i18n = function( string )
	{
		if( this.translations && this.translations[string] )
			return this.translations[string];
		return string;
	}
	
	// Search and execute replacements in string
	ns.View.prototype.i18nReplaceInString = function( str )
	{
		var pos = 0;
		while ( ( pos = str.indexOf( "{i18n_", pos ) ) >= 0 )
		{
			var pos2 = str.indexOf( "}", pos );
			if ( pos2 >=0 )
			{
				var key = str.substring( pos + 1, pos2 );
				str = str.substring( 0, pos ) + View.i18n( key ) + str.substring( pos2 + 1 );
				pos = pos2 + 1;
			}
			else
			{
				break;
			}
		}
		return str;
	}
	
})( api );

window.View = new api.View();

