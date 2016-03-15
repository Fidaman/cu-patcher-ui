/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import * as ReactDom from 'react-dom';
import {connect} from 'react-redux';

import reducer from './redux/modules/reducer';
import {changeRoute, Routes} from './redux/modules/locations';
import {showChat, hideChat} from './redux/modules/chat';
import {fetchPage} from './redux/modules/news';
import {fetchAlerts, validateAlerts} from './redux/modules/patcherAlerts';
import {fetchHeroContent, validateHeroContent} from './redux/modules/heroContent';

import Sidebar from './sidebar/Sidebar';
import Header from './Header';
import WindowHeader from './WindowHeader';
import Chat from './content/chat/Chat';
import Hero from './content/Hero';
import News from './content/News';
import PatchNotes from './content/PatchNotes';
import Support from './content/Support';
import Animate from './Animate';

import {patcher} from './api/PatcherAPI';
import {CSENormalizeString} from './api/CSENormalizeString';

function select(state: any): any {
  return {
    location: state.location.location,
    chat: state.chat,
    currentChannel: state.channels.currentChannel,
    channels: state.channels.channels,
    news: state.news,
    alerts: state.alerts,
    heroContent: state.heroContent,
  }
}

// since we're using redux all props are optional in the TypeScript interface
// since redux fills it out at runtime rather than props being passed in from
// a parent component
//
// Props will match what is returned from select() plust a dispatch function
export interface PatcherAppProps {
  dispatch?: (action: any) => void;
  location?: Routes;
  chat?: any;
  currentChannel?: any;
  channels?: any;
  news?: any;
  alerts?: any;
  heroContent?: any;
}

export interface PatcherState {};

export class PatcherApp extends React.Component<PatcherAppProps, PatcherState> {
  public name = 'cse-patcher';
  
  private alertsInterval: any = null;
  private heroContentInterval: any = null;
  
  static propTypes = {
    dispatch: React.PropTypes.func.isRequired,
    location: React.PropTypes.number.isRequired,
    chat: React.PropTypes.object.isRequired
  }

  onRouteChanged = (route: Routes) => {
    this.props.dispatch(changeRoute(route));
  }
  
  hideChat = () => {
    this.props.dispatch(hideChat());
  }
  
  showChat = () => {
    this.props.dispatch(showChat());
  }
  
  fetchNewsPage = (page: number) => {
    this.props.dispatch(fetchPage(page));
  }
  
  onPatcherAPIUpdate = () => {
    this.setState({});
  }
  
  componentDidMount() {
    // fetch initial alerts and then every minute validate & fetch alerts.
    if (!this.props.alerts.isFetching) this.props.dispatch(fetchAlerts());
    this.alertsInterval = setInterval(() => {
      this.props.dispatch(validateAlerts());
      if (!this.props.alerts.isFetching) this.props.dispatch(fetchAlerts());
    }, 60000);
    
    // fetch initial hero content and then every 30 minutes validate & fetch hero content.
    if (!this.props.heroContent.isFetching) this.props.dispatch(fetchHeroContent());
    this.heroContentInterval = setInterval(() => {
      this.props.dispatch(validateHeroContent());
      if (!this.props.heroContent.isFetching) this.props.dispatch(fetchHeroContent());
    }, 60000 * 30);
  }
  
  componentDidUnMount() {
    // unregister intervals
    clearInterval(this.alertsInterval);
    clearInterval(this.heroContentInterval);
  }

  render() {
    let content: any = null;
    switch(this.props.location) {
      case Routes.HERO:
        content = (
          <div key='0'>
            <Hero
              isFetching={this.props.heroContent.isFetching}
              didInvalidate={this.props.heroContent.didInvalidate}
              lastUpdated={this.props.heroContent.lastUpdated}
              items={this.props.heroContent.items} />
          </div>
        );
        break;
      case Routes.NEWS:
        content = (
          <div key='1'>
            <News
              isFetching={this.props.news.isFetching}
              didInvalidate={this.props.news.didInvalidate}
              lastUpdated={this.props.news.lastUpdated}
              nextPage={this.props.news.nextPage}
              posts={this.props.news.posts}
              fetchPage={this.fetchNewsPage}/>
          </div>
        );
        break;
      case Routes.PATCHNOTES: content = <div key='2'><PatchNotes /></div>; break;
      case Routes.SUPPORT: content = <div key='3'><Support /></div>; break;
    }
    
    let chat: any = null;
    if (this.props.chat.visibility.showChat) {
      chat = (
        <div id="chat-window" key='0'>
          <Chat hideChat={this.hideChat} username={CSENormalizeString(patcher.getScreenName())} userpass={patcher.getUserPass()} />
        </div>
      );
    }
    
    return (
      <div id={this.name}>
        <WindowHeader />
        <Header changeRoute={this.onRouteChanged} activeRoute={this.props.location} openChat={this.showChat} />
        <Sidebar alerts={this.props.alerts.alerts} onApiUpdated={this.onPatcherAPIUpdate} />
        <div className='main-content'>
        <Animate animationEnter='fadeIn' animationLeave='fadeOut'
          durationEnter={400} durationLeave={500}>
          {content}
        </Animate>
        </div>
        <Animate animationEnter='slideInRight' animationLeave='slideOutRight'
          durationEnter={400} durationLeave={500}>
          {chat}
        </Animate>
      </div>
    );
  }
};

export default connect(select)(PatcherApp);
