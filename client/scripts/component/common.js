'use strict';

/*©agpl*************************************************************************
*                                                                              *
* This file is part of FRIEND UNIFYING PLATFORM.                               *
*                                                                              *
* This program is free software: you can redistribute it and/or modify         *
* it under the terms of the GNU Affero General Public License as published by  *
* the Free Software Foundation, either version 3 of the License, or            *
* (at your option) any later version.                                          *
*                                                                              *
* This program is distributed in the hope that it will be useful,              *
* but WITHOUT ANY WARRANTY; without even the implied warranty of               *
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the                 *
* GNU Affero General Public License for more details.                          *
*                                                                              *
* You should have received a copy of the GNU Affero General Public License     *
* along with this program.  If not, see <http://www.gnu.org/licenses/>.        *
*                                                                              *
*****************************************************************************©*/

var library = window.library || {};
var hello = window.hello || {};
library.component = library.component || {};

/* EVENT EMITTER

For prototype extension. Your object gains the ability to emit events 
to listeners registered through this interface

*/

(function( ns, undefined ) {
	ns.EventEmitter = function( eventSink ) {
		if ( !( this instanceof ns.EventEmitter ))
			return new ns.EventEmitter();
		
		var self = this;
		self._eventSink = eventSink;
		self.eventToListener = {};
		self.eventListeners = {};
		
		self._eventEmitterInit();
	}
	
	
	// Added to objects public interface
	
	ns.EventEmitter.prototype.on = function( event, listener ) {
		var self = this;
		var id = friendUP.tool.uid( 'listener' );
		var listenerIds = self.eventToListener[ event ];
		if ( !listenerIds ) {
			self.eventToListener[ event ] = [];
		}
		
		self.eventToListener[ event ].push( id );
		self.eventListeners[ id ] = listener;
		
		return id;
	}
	
	ns.EventEmitter.prototype.once = function( event, listener ) {
		var self = this;
		var onceieId = self.on( event, onceie );
		
		function onceie( arrrgs ) {
			var args = self._getArgs( arguments );
			listener.apply( null, args );
			self.off( onceieId );
		}
	}
	
	ns.EventEmitter.prototype.off = function( listenerId ) {
		var self = this;
		var listener = self.eventListeners[ listenerId ];
		if ( !listener )
			return;
		
		// remove from listener map
		delete self.eventListeners[ listenerId ];
		
		// remove from events listener id list
		var events = Object.keys( self.eventToListener );
		events.some( searchListenerIdList );
		function searchListenerIdList( event ) {
			var listenerIds = self.eventToListener[ event ];
			var index = listenerIds.indexOf( listenerId );
			if ( index === -1 )
				return false;
			
			removeListener( event, index );
			return true;
		}
		
		function removeListener( event, index ) {
			self.eventToListener[ event ].splice( index, 1 );
		}
	}
	
	ns.EventEmitter.prototype.release = function( type ) {
		var self = this;
		if ( !type )
			all();
		else
			ofType( type );
		
		function all() {
			self.eventListeners = {};
			self.eventToListener = {};
		}
		
		function ofType( type ) {
			var lids = self.eventToListener[ type ];
			if ( !lids || !lids.length )
				return;
			
			lids.forEach( remove );
			delete self.eventToListener[ type ];
			
			function remove( lid ) {
				delete self.eventListeners[ lid ];
			}
		}
	}
	
	// emit can take any number of arguments
	// the first MUST be the event type / listener id
	// all extra arguments will be passed on to the handler
	ns.EventEmitter.prototype.emit = function() {
		var self = this;
		var args = self._getArgs( arguments );
		var event = args.shift();
		var listenerIds = self.eventToListener[ event ];
		let caught = false;
		if ( !listenerIds || !listenerIds.length ) {
			if ( self._eventSink )
				emitOnDefault( event, args );
			
			console.log( 'emit - caught: ' + event + ' - ' + caught.toString());
			return caught;
		}
		
		caught = listenerIds.reduce( emit, false );
		if ( !caught )
			console.log( 'emit - caught: ' + event + ' - ' + caught.toString());
		
		return caught;
		function emit( caught, listenerId ) {
			var listener = self.eventListeners[ listenerId ];
			if ( 'function' !== typeof( listener )) {
				if ( self._eventSink )
					emitOnDefault( event, args );
				
				return caught;
			}
			
			listener.apply( null, args );
			return true;
		}
		
		function emitOnDefault( type, args ) {
			args.unshift( type );
			self._eventSink.apply( null, args );
		}
	}
	
	ns.EventEmitter.prototype.closeEventEmitter = function() {
		var self = this;
		self.release();
		delete self._eventSink;
	}
	
	// Private
	
	ns.EventEmitter.prototype._eventEmitterInit = function() {
		var self = this;
		// dont remove this, js is weird
	}
	
	ns.EventEmitter.prototype._getArgs = function( argObj ) {
		var self = this;
		var args = [];
		var len = argObj.length;
		while( len-- )
			args[ len ] = argObj[ len ];
		
		return args;
	}
})( library.component );


/* EventNode

type - event to listen for on conn, and what to wrap in before sending up the tree
conn - root event source
eventSink - events are sent here if there is no handler,
onsend - callback, replaces conn in some usecases
	where a conn does not make sense or is unavailable ( ex: root of event tree )
	
inherits from EventEmitter
*/
(function( ns, undefined ) {
	ns.EventNode = function(
		type,
		conn,
		eventSink,
		onsend
	) {
		var self = this;
		self.type = type || null;
		self.conn = conn || null;
		self.onsend = onsend;
		
		ns.EventEmitter.call( self, eventSink );
		self.initEventNode();
	}
	
	ns.EventNode.prototype = Object.create( ns.EventEmitter.prototype );
	
	// public
	
	// to root
	ns.EventNode.prototype.send = function( event ) {
		var self = this;
		if ( !self.sendEvent )
			return;
		
		if ( !self.type )
			wrap = event;
		else
			var wrap = {
				type : self.type,
				data : event,
			};
		
		self.sendEvent( wrap );
	}
	
	// insert event, as if its coming from root ( emit to branches )
	ns.EventNode.prototype.handle = function( event ) {
		var self = this;
		self.emit( event.type, event.data );
	}
	
	ns.EventNode.prototype.close = function() {
		var self = this;
		self.closeEventEmitter();
		delete self.sendEvent;
		delete self.onsend;
		
		if ( self.conn )
			self.conn.release( self.type );
		
		delete self.type;
		delete self.conn;
	}
	
	// Private
	
	ns.EventNode.prototype.initEventNode = function() {
		var self = this;
		if ( self.conn && self.type ) {
			self.conn.on( self.type, handle );
			function handle( e ) { self.handle( e ); }
		}
		
		if ( self.onsend )
			self.sendEvent = sendOnHandler;
		else
			self.sendEvent = sendOnConn;
		
		function sendOnHandler( event ) {
			if ( self.onsend )
				self.onsend( event );
		}
		
		function sendOnConn( event ) {
			if ( self.conn )
				self.conn.send( event );
		}
	}
})( library.component );


// RequestNode
// ALL HANDLERS ARE EXPECTED TO RETURN PROMISES
// .request( t, d ) returns a Promise
(function( ns, undefined ) {
	ns.RequestNode = function(
		conn,
		eventSink,
		onSend
	) {
		const self = this;
		ns.EventNode.call( self,
			'request',
			conn,
			eventSink,
			onSend
		);
		
		self._requests = {};
		self.initRequestNode();
	}
	
	ns.RequestNode.prototype = Object.create( ns.EventNode.prototype );
	
	// Public
	
	ns.RequestNode.prototype.request = function( type, data ) {
		const self = this;
		return new Promise(( resolve, reject ) => {
			let reqId = friendUP.tool.uid( 'req' );
			self._requests[ reqId ] = handleResponse;
			let reqWrap = {
				requestId : reqId,
				request   : {
					type    : type,
					data    : data,
				},
			};
			self.send( reqWrap );
			
			function handleResponse( error, response ) {
				delete self._requests[ reqId ];
				if ( error )
					reject( error );
				else
					resolve( response );
			}
		});
	}
	
	// Private
	
	ns.RequestNode.prototype.initRequestNode = function() {
		const self = this;
	}
	
	ns.RequestNode.prototype.handle = function( event ) {
		const self = this;
		console.log( 'handle', event );
		if ( 'response' === event.type ) {
			self.handleResponse( event.data );
			return;
		}
		
		const reqId = event.requestId;
		const request = event.request;
		self.callListener( req )
			.then( response )
			.catch( error );
			
		function response( data ) {
			const res = {
				type : 'response',
				data : {
					requestId : reqId,
					response  : data,
				}
			};
			self.send( res );
		}
		
		function error( err ) {
			const errRes = {
				type : 'response',
				data : {
					requestId : reqId,
					error     : data,
				},
			};
			self.send( errRes );
		}
	}
	
	ns.RequestNode.prototype.handleResponse = function( event ) {
		const self = this;
		console.log( 'handleResponse', event );
		const reqId = event.requestId;
		const err = event.error || null;
		const res = err ? null : ( event.response || null );
		const handler = self._requests[ reqId ];
		if ( !handler ) {
			console.log( 'RequestNode.handleResponse - no handler for', {
				event    : event,
				handlers : self._requests,
			});
			return;
		}
		
		handler( err, res );
	}
	
	ns.RequestNode.prototype.callListener = function( req ) {
		const self = this;
		const type = req.type;
		const data = req.data;
		const listeners = self.eventToListener[ type ];
		if ( !listeners || !listeners.length )
			return error( 'ERR_NO_LISTENER' );
		
		if ( listeners.length !== 1 )
			return error( 'ERR_MULTIPLE_LISTENERS' );
		
		const lId = listeners[ 0 ];
		const listener = self.eventListeners[ lId ];
		return listener( data );
		
		function error( errMsg ) {
			return new Promise(( resolve, reject ) => {
				reject( errMsg );
			});
		}
	}
	
})( library.component );

//SubView
(function( ns, undefined ) {
	ns.SubView = function( conf ) {
		if ( !( this instanceof ns.SubView ))
			return new ns.SubView( conf );
		
		var self = this;
		self.parent = conf.parent;
		self.type = conf.type;
		self.onloaded = conf.loaded || null;
		self.onready = conf.ready || null;
		self.subscriber = {};
		
		self.init();
	}
	
	ns.SubView.prototype.init = function() {
		var self = this;
		self.parent.on( self.type, handleMessage );
		
		function handleMessage( msg ) { self.handleMessage( msg ); }
	}
	
	ns.SubView.prototype.on = function( event, handler ) {
		var self = this;
		self.subscriber[ event ] = handler;
	}
	
	ns.SubView.prototype.off = function( event ) {
		var self = this;
		if ( self.subscriber[ event ])
			delete self.subscriber[ event ];
	}
	
	ns.SubView.prototype.allOff = function() {
		self = this;
		self.subscriber = {};
	}
	
	ns.SubView.prototype.close = function() {
		var self = this;
		if ( self.parent.off )
			self.parent.off( self.type );
		if ( self.parent.release )
			self.parent.release( self.type );
		
		delete self.onloaded;
		delete self.onready;
		delete self.subscriber;
	}
	
	ns.SubView.prototype.handleMessage = function( msg ) {
		var self = this;
		
		if ( !msg || !msg.type) {
			console.log( 'SubView.handleMessage - invalid: ', msg );
			return;
		}
		
		var handler = self.subscriber[ msg.type ];
		
		if ( !handler ) {
			self.unhandled( msg );
			return;
		}
		
		handler( msg.data || null );
	}
	
	ns.SubView.prototype.unhandled = function( msg ) {
		var self = this;
		if ( msg.type == 'loaded' && self.onloaded ) {
			self.onloaded( msg.data );
			return;
		}
		
		if ( msg.type == 'ready' && self.onready ) {
			self.onready( msg.data );
			return;
		}
		
		//console.log( 'subview.' + self.type + '.handleMessage - no handler for', msg );
	}
	
	ns.SubView.prototype.send = function( msg ) {
		var self = this;
		var wrap = {
			type : self.type,
			data : msg
		};
		
		self.parent.send( wrap );
	}
})( library.component );


// IDENTITY
(function( ns, undefined ) {
	ns.Identity = function( conf ) {
		if ( !( this instanceof ns.Identity ))
			return new ns.Identity( conf );
		
		var self = this;
		self.init( conf );
	}
	
	// Public
	
	ns.Identity.prototype.updateAvatar = function( avatar ) {
		const self = this;
		self.avatar = avatar;
		self.fupConf.Image = avatar;
		// TODO ? self.emit( 'avatar', self.avatar );
	}
	
	// Private
	
	ns.Identity.prototype.avatar    = '../gfx/avatar_blue.png';
	ns.Identity.prototype.avatarAlt = '../gfx/avatar_grey.png';
	
	ns.Identity.prototype.init = function( conf ) {
		var self = this;
		if ( conf.UniqueID || conf.ID )
			self.fromFCUser( conf );
		else
			self.fromIdentity( conf );
		
	}
	
	ns.Identity.prototype.fromFCUser = function( conf ) {
		const self = this;
		self.fupConf = conf;
		self.fupId   = conf.ID;
		self.fUserId = conf.UniqueID;
		self.name    = library.tool.htmlDecode( conf.FullName );
		self.alias   = conf.Name;
		self.email   = conf.Email;
		self.avatar  = conf.Image; // || self.avatar;
		self.level   = conf.Level;
		
	}
	
	ns.Identity.prototype.fromIdentity = function( conf ) {
		const self = this;
		self.fupConf = {
			ID       : conf.fupId,
			UniqueID : conf.fUserId,
			FullName : conf.name,
			Name     : conf.alias,
			Email    : conf.email,
			Image    : conf.avatar, // || self.avatar,
			Level    : conf.level,
		};
		
		self.fupId   = conf.fupId;
		self.fUserId = conf.fUserId;
		self.name    = conf.name;
		self.alias   = conf.alias;
		self.email   = conf.email;
		self.avatar  = conf.avatar, // || self.avatar;
		self.level   = conf.level;
	}
	
})( library.component );

/* Filter */
(function( ns, undefined ) {
	ns.Filter = function() {
		const self = this;
	}
	
	ns.Filter.prototype.filter = function( filter, pool ) {
		const self = this;
		return self.baseFilter( filter, pool );
	}
	
	ns.Filter.prototype.inverseFilter = function( filter, pool ) {
		const self = this;
		return self.baseFilter( filter, pool, true );
	}
	
	// Private
	
	ns.Filter.prototype.baseFilter = function( filter, pool, inverse ) {
		const filterRX = new RegExp( filter, 'i' );
		inverse = inverse || false;
		
		if ( !pool || !pool.length )
			return [];
		
		return pool.filter( item => {
			if ( item.name.match( filterRX ))
				return !inverse;
			
			if ( item.email && item.email.match( filterRX ))
				return !inverse;
			
			if ( item.alias && item.alias.match( filterRX ))
				return !inverse;
			
			return inverse;
		});
	}
	
})( library.component );

/*
	IdCahce
*/
(function( ns, undefined ) {
	ns.IdCache = function( conn, identities ) {
		const self = this;
		self.conn = null;
		self.ids =  identities || {};
		self.idList = [];
		
		self.init( conn );
	}
	
	// Public
	
	ns.IdCache.prototype.close = function() {
		const self = this;
		self.conn.close();
		delete self.conn;
		delete self.ids;
		delete self.idList;
	}
	
	ns.IdCache.prototype.get = function( clientId ) {
		const self = this;
		return new Promise(( resolve, reject ) => {
			let id = self.ids[ clientId ];
			if ( id ) {
				resolve( id );
				return;
			}
			
			self.req.request( 'get', clientId )
				.then( idBack )
				.catch( idSad );
			
			function idBack( id ) {
				self.add( id );
				resolve( id );
			}
			
			function idSad( err ) {
				console.log( 'IdCache.get idSad', err );
				reject( 'ERR_ERR_ERR' );
			}
		});
	}
	
	ns.IdCache.prototype.update = function( idMap ) {
		const self = this;
		console.log( 'idCache.update', idMap );
	}
	
	// Pri<ate
	
	ns.IdCache.prototype.init = function( parentConn ) {
		const self = this;
		self.conn = new library.component.EventNode( 'identity', parentConn );
		self.req = new library.component.RequestNode( self.conn );
		self.conn.on( 'add', e => self.add( e ));
		self.conn.on( 'update', e => self.update( e ));
		
	}
	
	ns.IdCache.prototype.add = function( id ) {
		const self = this;
		if ( !id || !id.clientId )
			return;
		
		self.ids[ id.clientId ] = id;
	}
	
	ns.IdCache.prototype.update = function( event ) {
		const self = this;
		console.log( 'IdCache.update - NYI', event );
	}
	
})( library.component );


// CallStatus
(function( ns, undefined ) {
	ns.CallStatus = function( containerId ) {
		const self = this;
		self.containerId = containerId;
		self.statusKlass = '';
		library.component.EventEmitter.call( self );
		
		self.init();
	}
	
	ns.CallStatus.prototype = Object.create( 
		library.component.EventEmitter.prototype );
	
	// Public
	
	ns.CallStatus.prototype.setUserLive = function( isLive ) {
		const self = this;
		console.log( 'setUSerLive', [ self.userLive, isLive ]);
		if ( self.userLive === isLive )
			return;
		
		self.userLive = isLive;
		self.update( 'user' );
	}
	
	ns.CallStatus.prototype.setContactLive = function( isLive ) {
		const self = this;
		console.log( 'setContactLive', [ self.contactLive, isLive ]);
		if ( self.contactLive === isLive )
			return;
		
		self.contactLive = isLive;
		self.update( 'contact' );
	}
	
	ns.CallStatus.prototype.close = function() {
		const self = this;
		const el = self.el;
		delete self.el;
		if ( el )
			el.parentNode.removeChild( el );
		
		delete self.containerId;
	}
	
	// Pri>ate
	
	ns.CallStatus.prototype.init = function() {
		const self = this;
		if ( !hello.template )
			throw new Error( 'hello.template not available' );
		
		const parent = document.getElementById( self.containerId );
		if ( !parent )
			throw new Error( 'container not found' );
		
		const elId = friendUP.tool.uid( 'call' );
		const conf = {
			id : elId,
		};
		self.el = hello.template.getElement( 'call-status-tmpl', conf );
		parent.appendChild( self.el );
		self.status = self.el.querySelector( '.call-status' );
		//self.statusIcon = self.status.querySelector( 'i' );
		self.inc = self.el.querySelector( '.call-incoming' );
		self.acceptVideo = self.inc.querySelector( '.accept-video' );
		self.acceptAudio = self.inc.querySelector( '.accept-audio' );
		self.out = self.el.querySelector( '.call-outgoing' );
		self.live = self.el.querySelector( '.call-live' );
		
		self.acceptVideo.addEventListener( 'click', startVideo, false );
		self.acceptAudio.addEventListener( 'click', startAudio, false );
		
		self.current = null;
		
		self.out.addEventListener( 'click', outClick, false );
		
		function outClick( e ) {
			e.preventDefault();
			e.stopPropagation();
			console.log( 'outClick', e );
			self.emit( 'show' );
		}
		
		function startVideo( e ) {
			e.preventDefault();
			e.stopPropagation();
			self.emit( 'video' );
		}
		
		function startAudio( e ) {
			e.preventDefault();
			e.stopPropagation();
			self.emit( 'audio' );
		}
	}
	
	ns.CallStatus.prototype.update = function( from ) {
		const self = this;
		self.clearCurrent();
		if ( !self.userLive && !self.contactLive ) {
			self.setInactive();
			return;
		}
		
		/*
		if ( self.userLive && self.contactLive ) {
			self.setLive();
			return;
		}
		*/
		
		if ( self.userLive ) {
			self.setOutgoing();
			return;
		}
		
		if ( self.contactLive )
			if ( 'contact' === from )
				self.setIncoming( true );
			else
				self.setIncoming();
	}
	
	ns.CallStatus.prototype.setInactive = function() {
		const self = this;
		self.el.classList.toggle( 'hidden', true );
		//self.status.classList.toggle( 'hidden', true );
	}
	
	ns.CallStatus.prototype.setIncoming = function( notify ) {
		const self = this;
		console.log( 'setIncoming', notify );
		if ( notify )
			self.emit( 'notify', true );
		
		self.setStatus( 'Available' );
		self.inc.classList.toggle( 'hidden', false );
		self.current = self.inc;
	}
	
	ns.CallStatus.prototype.setOutgoing = function() {
		const self = this;
		console.log( 'setOutGoing' );
		self.setStatus( 'Available' );
		self.out.classList.toggle( 'hidden', false );
		self.current = self.out;
	}
	
	ns.CallStatus.prototype.setLive = function() {
		const self = this;
		self.setStatus( 'DangerText' );
	}
	
	ns.CallStatus.prototype.setStatus = function( status ) {
		const self = this;
		self.el.classList.toggle( 'hidden', false );
		return;
		console.log( 'setStatus', {
			current : self.statusKlass,
			status  : status,
		});
		self.status.classList.toggle( 'hidden', false );
		if ( self.statusKlass === status )
			return;
		
		if ( self.statusKlass )
			self.status.classList.toggle( self.statusKlass, false );
		
		self.status.classList.toggle( status, true );
		self.statusKlass = status;
	}
	
	ns.CallStatus.prototype.clearCurrent = function() {
		const self = this;
		if ( self.current )
			self.current.classList.toggle( 'hidden', true );
		
		self.current = null;
	}
	
})( library.component );
