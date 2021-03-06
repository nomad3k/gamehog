/* eslint-disable no-unused-vars */

import validate from 'validation-unchained';
// import uuid from 'uuid/v4';

import * as ServerActions from '../server/store/actions';
// import * as Types from './store/types';
import * as SharedActions from '../shared/store/actions';
import * as State from '../shared/store/state';
import * as Events from '../shared/events';
import * as Rooms from './rooms';

import { ok, badRequest, invalidRequest, invalidOperation, authRequired,
  anonRequired, notImplemented } from './responses';

export default function controller({ store, io, passwords }) {
  if (!store) throw new Error('missing parameter: store');
  if (!io) throw new Error('missing parameter: store');
  if (!passwords) throw new Error('missing parameter: passwords');

  return function(client) {
    if (!client) throw new Error('Missing Argument: client');

    client.on_auth = function(message, handler) {
      client.on(message, function(args, callback) {
        if (!client.user) return callback(authRequired());
        handler(client.user, args, callback);
      });
    };

    client.on_anon = function(message, handler) {
      client.on(message, function(args, callback)
      {
        if (client.user) return callback(anonRequired());
        handler(args, callback);
      });
    };

    // ------------------------------------------------------------------------
    // Connection
    // ------------------------------------------------------------------------

    (function() {
      client.emit(Events.SYSTEM, { message: 'Welcome' });
      io.to(Rooms.CONNECTED).emit(Events.CLIENT_CONNECTED, {
        id: client.id,
        message: 'Connected'
      });
      store.dispatch(SharedActions.clientConnected(client));
    })();

    client.on(Events.DISCONNECT, function() {
      io.to(Rooms.CONNECTED).emit(Events.CLIENT_DISCONNECTED, {
        id: client.id,
        message: 'Disconnected'
      });
      store.dispatch(SharedActions.clientDisconnected(client));
      if (client.user) {
        const { userName } = client.user;
        const pd = SharedActions.playerDisconnected({ userName });
        store.dispatch(pd);
        io.to(Rooms.CONNECTED).emit(Events.EVENT, pd);
      }
    });

    // ------------------------------------------------------------------------
    // RESYNC_STATE
    // ------------------------------------------------------------------------

    client.on_auth(Events.STATE_RESYNC, function(user, message, callback) {
      const state = store.getState().shared.toJS();
      callback(ok(state));
    });

    // ------------------------------------------------------------------------
    // AUTH_REGISTER
    // ------------------------------------------------------------------------

    client.on_anon(Events.AUTH_REGISTER, function(args, callback) {
      const { errors, data } = validate(args, {
        strict: true,
        rules: {
          userName: { type: String, required: true },
          password: { type: String, required: true, length: { min: 6, max: 255 } },
          playerName: { type: String, required: true },
          characterName: { type: String, required: true }
        }
      });
      if (errors) return callback(badRequest(errors));
      const { userName, password, playerName, characterName } = data;
      const user = store.getState().shared.getIn([State.USERS, userName]);
      if (user) return callback(invalidOperation({ userName: ['User exists.'] }));

      const pr = SharedActions.playerRegistered({
        userName, playerName, characterName
      });
      const ur = ServerActions.userRegistered({
        userName, password: passwords.hash(password)
      });
      store.dispatch(ur);
      store.dispatch(pr);
      io.to(Rooms.CONNECTED).emit(Events.EVENT, pr);
      callback(ok());
    });

    // -------------------------------------------------------------------------
    // AUTH_UNREGISTER
    // -------------------------------------------------------------------------

    client.on_auth(Events.AUTH_UNREGISTER, function(user, args, callback) {
      const uu = ServerActions.userUnregistered({ userName: user.userName });
      const pu = SharedActions.playerUnregistered({ userName: user.userName });
      store.dispatch(uu);
      store.dispatch(pu);
      io.to(Rooms.CONNECTED).emit(Events.EVENT, pu);
      client.leave(Rooms.CONNECTED);
      delete client.user;
      callback(ok());
    });

    // -------------------------------------------------------------------------
    // AUTH_LOGIN
    // -------------------------------------------------------------------------

    client.on_anon(Events.AUTH_LOGIN, function(args, callback) {
      const { errors, data } = validate(args, {
        strict: true,
        rules: {
          userName: { type: String, required: true },
          password: { type: String, required: true }
        }
      });
      if (errors) {
        return callback(badRequest(errors));
      }
      const { server, shared } = store.getState();
      const user = server.getIn([State.USERS, data.userName]);
      if (!user || user.get('password') != passwords.hash(data.password)) {
        return callback(invalidRequest({ userName: ['Unknown Username or Password'] }));
      }
      const player = shared.getIn([State.PLAYERS, data.userName]);
      if (player.get('connected')) {
        return callback(invalidRequest({ userName: ['Player already connected']}));
      }
      client.user = { userName: data.userName };
      const e = SharedActions.playerConnected({ userName: data.userName });
      store.dispatch(e);
      io.to(Rooms.CONNECTED).emit(Events.EVENT, e);
      client.join(Rooms.CONNECTED);
      callback(ok(client.user));
    });

    // -------------------------------------------------------------------------
    // AUTH_LOGOUT
    // -------------------------------------------------------------------------

    client.on_auth(Events.AUTH_LOGOUT, function(user, args, callback) {
      const pd = SharedActions.playerDisconnected({ userName: user.userName });
      delete client.user;
      store.dispatch(pd);
      io.to(Rooms.CONNECTED).emit(Events.EVENT, pd);
      client.leave(Rooms.CONNECTED);
      callback(ok());
    });

  }
}
