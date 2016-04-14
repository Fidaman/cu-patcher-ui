/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import ChatLine from './ChatLine';
import RoomId from './RoomId';
import ChatRoomInfo from './ChatRoomInfo';

export class ChatTextState {
}

export interface ChatTextProps {
  room: ChatRoomInfo;
}

const AUTOSCROLL_FUZZYNESS : number = 12;

class ChatText extends React.Component<ChatTextProps, ChatTextState> {
  SCROLLBACK_PAGESIZE: number = 50;
  autoScroll: boolean = true;
  lazyLoadTop: HTMLElement = null;
  currentRoom: RoomId;
  constructor(props: ChatTextProps) {
    super(props);
    this.state = new ChatTextState();
    this.handleScroll = this.handleScroll.bind(this);
  }
  autoScrollToBottom() : void {
    const chatBox : HTMLHtmlElement = this.refs['chatbox'] as HTMLHtmlElement;
    if (this.autoScroll && chatBox.lastElementChild) {
      chatBox.scrollTop = (chatBox.scrollHeight - chatBox.offsetHeight)
    }
  }
  componentDidUpdate() {
    this.autoScrollToBottom();
    if (this.lazyLoadTop) {
      // after a lazy load, reposition the element that was at the top
      // back at the top
      this.lazyLoadTop.scrollIntoView(true);
      this.lazyLoadTop = undefined;
    }
  }
  componentDidMount() {
    this.autoScrollToBottom();
    this.watchScroll();
  }
  componentWillUnmount() {
    this.unwatchScroll();
  }
  watchScroll() {
    const el: HTMLDivElement = this.refs['chatbox'] as HTMLDivElement;
    el.addEventListener("scroll", this.handleScroll);
  }
  handleScroll(e: MouseEvent) {
    // auto-scroll is enabled when the scroll bar is at or very near the bottom
    const chatBox: HTMLDivElement = this.refs['chatbox'] as HTMLDivElement;
    this.autoScroll = chatBox.scrollHeight - (chatBox.scrollTop + chatBox.offsetHeight) < AUTOSCROLL_FUZZYNESS;

    // if lazy loading is active, and we have scrolled up to where the lazy loaded
    // content should be then lazy load the next page of content
    const lazy: HTMLDivElement = this.refs['lazyload'] as HTMLDivElement;
    if (lazy) {
      if (chatBox.scrollTop < lazy.offsetHeight) {
        this.lazyLoadTop = lazy.nextElementSibling as HTMLElement;
        this.props.room.nextScrollbackPage();
        this.forceUpdate();
      }
    }
  }
  unwatchScroll() {
    const el: HTMLElement = this.refs['chatbox'] as HTMLElement;
    el.removeEventListener("scroll", this.handleScroll);
  }
  newRoom() : void {
    this.currentRoom = this.props.room.roomId;
    this.autoScroll = true;
  }
  render() {
    const room : ChatRoomInfo = this.props.room;
    let messages : JSX.Element[];
    let content : JSX.Element = undefined;
    let lazy : JSX.Element = undefined;
    if (room) {
      if (!this.currentRoom || !room.roomId.same(this.currentRoom)) {
        this.newRoom();
      }
      if (room.scrollback > 0) {
        lazy = <div ref="lazyload" className="chat-lazyload" style={{ height: (room.scrollback * 1.7) + 'em' }}></div>;
      }
      if (room.messages) {
        messages = room.messages.slice(room.scrollback);
      }
    }
    return (
      <div ref="chatbox" className="chat-text allow-select-text">
      {lazy}
      {messages}
      </div>
    );
  }
}

export default ChatText;
