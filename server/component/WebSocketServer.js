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

var WSS = require( 'ws' ).Server;
var log = require( './Log')( 'WebSocketServer' );
var ns = {};

(function ( ns, undefined ) {
	ns.WebSocketServer = function( conf ) {
		if ( !( this instanceof ns.WebSocketServer ))
			return new ns.WebSocketServer( conf );
		
		const self = this;
		self.conf = conf;
		
		if ( self.conf.tls )
			return self.createSecure();
		else
			return self.createPlain();
	}
	
	ns.WebSocketServer.prototype.createSecure = function() {
		var self = this;
		var https = require( 'https' );
		var httpsOptions = {
			key : self.conf.tls.key,
			cert : self.conf.tls.cert,
		};
		var port = self.conf.port;
		var httpsServer = https.createServer( httpsOptions, fakeListen ).listen( port );
		var wss = new WSS({ server : httpsServer });
		return wss;
		
		function fakeListen() {}
	}
	
	ns.WebSocketServer.prototype.createPlain = function() {
		var self = this;
		var port = self.conf.port;
		var wss = new WSS({ port : port });
		return wss;
	}
})( ns );


module.exports = ns.WebSocketServer;