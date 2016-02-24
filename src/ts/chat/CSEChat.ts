/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
 
import {Client, Element} from 'node-xmpp-client';
import Config from './Config';
import EventEmitter from '../core/EventEmitter';
import Message from './Message'
import Sender from './Sender'
import messageType from './messageType';

class CSEChat  {

  client: xmpp.Client;
  config: Config;
  eventEmitter: EventEmitter = new EventEmitter();
  private _reconnect: boolean = true;
  private _idCounter: number = 0;
  private _pingc: number = 0;
  private _pings: any = {};
  private _pingsInFlight: number = 0;
  private _pinger: number;

  constructor(config = <Config>{}) {
    this.config = config;
  }

  connect() {
    if (this.client) return;
    this.config.init();
    this.client = new Client({
      websocket: {url: this.config.websocketUrl},
        jid: this.config.jid,
        password: this.config.getPassword(),
    });
    this._initializeEvents();
    return this.client;
  }

  disconnect() {
    if (!this.client) return;
    if (this._pinger) {
      clearInterval(this._pinger);
      this._pinger = null;
    }
    this._reconnect = false;
    this.client.reconnect = false;
    this.client.removeAllListeners('disconnect');
    this.client.removeAllListeners('online');
    this.client.removeAllListeners('stanza');
    this.client.end();
    this.client = null;
  }
    
  sendMessageToRoom(message: string, roomName: string) {
    if (!this.client) return;
    this.client.send(new Element('message', {
      to: roomName + '@' + this.config.service + '.' + this.config.address, 
      type: 'groupchat'
    }).c('body').t(message));
  }

  sendMessageToUser(message: string, userName: string) {
    if (!this.client) return;
    this.client.send(new Element('message', {
      to: userName + '@' + this.config.address, 
      type: 'chat'
    }).c('body').t(message));
  }

  joinRoom(roomName: string) {
    if (!this.client) return;
    this.client.send(new Element('presence', {
      to: roomName + '/' + this.config.getNick()
    }).c('x', { xmlns: 'http://jabber.org/protocol/muc' }));
  }
  leaveRoom(roomName: string) {
    if (!this.client) return;
    this.client.send(new Element('presence', {
      from: this.config.jid,
      to: roomName + '/' + this.config.getNick(),
      type: 'unavailable'
    }));
  }

  // alias eventEmitter
  on(event:string, callback: (data: any) => void) : any {
    return this.eventEmitter.on(event, callback);
  }

  once(event:string, callback: (data: any) => void) : any {
    return this.eventEmitter.listenOnce(event, callback);
  }

  removeListener(event:any) : void {
    this.eventEmitter.removeListener(event);
  }
 
  // PRIVATE METHODS (as private as they can be)

  _initializeEvents() {
    if (!this.client) throw new Error('No connection to initialize');

    this.client.on('error', (error) => {
      switch(error.code) {
        case 'EADDRNOTAVAIL':
        case 'ENOTFOUND':
          this.eventEmitter.emit('error', 'Unable to connect to server at' + this.config.address);
          break;
        case 'ETIMEOUT':
          this.eventEmitter.emit('error', 'Connection timed out.');
          break;
        default:
          this.eventEmitter.emit('error', error);
          break;
      }
    });

    this.client.on('online', () => {

      // handle server assigned resource
      this.config.resource = this.client.jid._resource;
      this.config.jid = this.client.jid.toString();

      this.eventEmitter.emit('online');
      // send global presence
      this.client.send(new Element('presence', {type: 'available'}).c('show').t('chat'));
      this._keepalive();
    }, this);

    this.client.on('disconnect', () => {
      this.client = null;
      this.eventEmitter.emit('disconnect', this._reconnect);
      if (this._reconnect) this.connect();
    });

    this.client.on('stanza', (stanza) => this._processStanza(stanza));
  }

  // called when we connect.  Initialise the ping response map, the inflight count
  // and if the interval time is not running, start the interval timer.
  _keepalive() {
    this._pings = {};
    this._pingsInFlight = 0;
    if (!this._pinger) {
      this._pinger = setInterval(() => {
        // every 10 seconds, send a ping stanza
        this._ping((ping: any) => {
          delete ping.pong; // dont pass handler to listener
          this.eventEmitter.emit('ping', ping);
        });
      }, 10000);
    }
  }

  _ping(pong: (ping: any) => void) {

    // If inflight is not 0, then we have a ping that was not responded to
    // so decide what to do (atm we disconnect)
    if (this._pingsInFlight > 0) {

      // not got response to last ping, disconnect, stop ping timer
      // and trigger an error condition.
      this.disconnect();
      clearInterval(this._pinger);
      this._pinger = null;
      this.eventEmitter.emit('error', 'Ping timed out');
      return;
    }

    // Create a new ping message
    const id = this._pingc++;
    this.client.send(new Element('iq', {
      from: this.config.jid,
      to: this.config.serviceAddress,
      id: id,
      type: 'get'
    }).c('ping', { xmlns: 'urn:xmpp:ping' }));

    // register this ping and callback, and count inflight pings
    // so we can tell if we have any outstanding
    this._pings[id] = { id: id, pong: pong, now: Date.now() };
    this._pingsInFlight ++;
  }

  // handle the ping response.  Lookup the ping in the ping map, if there
  // then decrement inflight count (this ping just landed) and call the pong
  // handler, finally remove the ping from the ping map.
  _pong(stanza:Element) {
    const id = stanza.attrs.id;
    const ping = this._pings[id];
    if (ping) {
      this._pingsInFlight --;
      ping.pong(ping);
      delete this._pings[id];    // reclaim memory
    }
  }

  // #########################################################################

  _processStanza(stanza:Element) {

    // if error?
    if (stanza.attrs.type === 'error') {
      return;
    }

    if (stanza.is('message'))
    {
      switch(stanza.attrs.type) {
        case 'groupchat':
          this.eventEmitter.emit('groupmessage', this._parseMessageGroup(stanza));
          break;
        case 'chat':
          this.eventEmitter.emit('message', this._parseMessageChat(stanza));
          break;
      }
      return;
    }

    if (stanza.is('presence')) {
      const x = stanza.getChild('x');
      if (!x) return;
      const status = x.getChild('status');
      if (status) return;
      this.eventEmitter.emit('presence', this._parsePresence(stanza));
      return;
    }

    if (stanza.is('iq')) {
      if (stanza.attrs.type === 'result') {
        const ping = stanza.getChild('ping');
        if (ping) {
          this._pong(stanza);
        }
      }
    }
      
  }
    
  _parseMessageGroup(stanza:Element) {

    const body = stanza.getChild('body');
    const message = body ? body.getText() : '';
    const cseflags = stanza.getChild('cseflags');
    const isCSE = cseflags ? cseflags.attrs.cse : false;


    const fromArr = stanza.attrs.from.split('/');
    const room = fromArr[0];
    const roomName = room.split('@')[0];
    const sender = fromArr[1];
    const senderName = sender.split('@')[0];

    let s = new Sender(0, sender, senderName, isCSE);
    return new Message(this._idCounter++, new Date(), message, roomName, messageType.MESSAGE_GROUP, s);
  }

  _parseMessageChat(stanza:Element) {

    const body = stanza.getChild('body');
    const message = body ? body.getText() : '';
    const nick = stanza.getChild('nick');
    const senderName = nick ? nick.getText() : '';
    const cseflags = stanza.getChild('cseflags');
    const isCSE = cseflags ? cseflags.attrs.cse : false;

    let s = new Sender(0, senderName, nick, isCSE);
    return new Message(this._idCounter++, new Date(), message, senderName, messageType.MESSAGE_CHAT, s);
  }

  _parsePresence(stanza:Element) {
    const x = stanza.getChild('x');
    const status = x.getChild('status');
    const role = x.getChild('item').attrs.role;

    const fromArr = stanza.attrs.from.split('/');
    const room = fromArr[0];
    const roomName = room.split('@')[0];
    const sender = fromArr[1];
    const senderName = sender.split('@')[0];

    const cseflags = stanza.getChild('cseflags');
    const isCSE = cseflags ? cseflags.attrs.cse : false;

    let s = new Sender(0, sender, senderName, isCSE);
     
    if (stanza.attrs.type=="unavailable"){
         return new Message(this._idCounter++, new Date(), "", roomName, messageType.UNAVAILIBLE, s);
    }
    return new Message(this._idCounter++, new Date(), "", roomName, messageType.AVAILIBLE, s);
  }
}

export {
  Config,
  CSEChat
}
export default CSEChat;
