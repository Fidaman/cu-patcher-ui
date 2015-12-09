/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Sender from './Sender';
import messageType from '../constants/messageType';

class Message {
  id: number;
  time: Date;
  message: string;
  roomName: string;
  type: messageType;
  sender: Sender;

  constructor(id: number, time: Date, message: string, roomName: string, type: messageType, sender: Sender) {
    this.id = id;
    this.time = time;
    this.message = message;
    this.roomName = roomName;
    this.sender = sender;
    this.type = type;
  }
}

export default Message;
