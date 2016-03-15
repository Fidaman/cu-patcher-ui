/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Define types

export interface User {
  email: string;
  password: string;
  rememberMe: boolean;
}

export enum ChannelStatus {
  Install, 
  Validating, 
  Installing, 
  UpdateQueued, 
  Ready, 
  UninstallQueued
}

export interface Channel {
  channelName: string; 
  channelID: number; 
  channelStatus: ChannelStatus;
}

const API : string = "patcherAPI";

// Define patcher class

export class PatcherAPI { 
  private _hasReadFAQ : boolean = false;
  private _api : any;
  constructor() {
    if (API in window) {
      this._api = (<any>window)[API];
    } else {
      // Install a dummy API (for testing)
      this._api = {
        userEmail: "someone@somewhere.com",
        userPass: "modsquad",
        loginToken: "dasdakljdajdodaksjdasjd",
        screenName: "chattester",
        loginError: "",
        channelData: [
          { channelID: 4 },
          { channelID: 10 },
          { channelID: 5 }
        ],
        patcherState: 1,
        downloadRemaining: 50,
        downloadEstimate: 100,
        numberOfFiles: 1000,
        completedFiles: 734,
        hasReadFAQ: false,
        ValidateClient: function() { return true; },
        InvalidateClient: function() {},
        UninstallChannel: function() {},
        LaunchChannel: function() {},
        MarkFAQAsRead: function() {}
      };
    }
  }
  hasApi() :boolean {
    return this._api !== undefined;
  }
  getUserEmail() :string {
    return this._api.userEmail;
  }
  hasUserEmail() :boolean {
    const email = this.getUserEmail();
    return email && email.length > 0;
  }
  getLoginToken() :string {
    return this._api.loginToken;
  }
  hasLoginToken() :boolean {
    const loginToken = this.getLoginToken();
    return loginToken && loginToken.length > 0;
  }
  getScreenName() :string {
    return this._api.screenName;
  }
  hasScreenName() :boolean {
    const screenName = this.getScreenName();
    return screenName && screenName.length > 0;
  }
  hasLoginError() :boolean {
    const error = this.getLoginError();
    return error && error.length > 0;
  }
  getLoginError() :string {
    return this._api.loginError;
  }
  hasUserPass() :boolean {
    const error = this.getUserPass();
    return error && error.length > 0;
  }
  getUserPass() :string {
    return this._api.userPass;
  }
  private getChannelValue(channel:Channel) : number {
    // force sort order to Hatchery, Wyrmling, Other Channels, and Editor last
    if (channel.channelID === 4) return 0; // Hatchery
    if (channel.channelID === 10) return 1; // Wyrmling
    if (channel.channelID === 5) return 3; // Editor
    return 2;
  }
  public getAllChannels() : any[] {
    if (this._api.channelData) {
      return Array.prototype.slice.call(this._api.channelData).sort(function(a:Channel, b:Channel) {
        return this.getChannelValue(a) - this.getChannelValue(b);
      }.bind(this));
    }
    return [];
  }
  getPatcherState() :number {
    return this._api.patcherState;
  }
  isPatcherReconnecting() :boolean {
    return this._api.patcherState == 10;
  }
  getDownloadSecondsRemaining() :number {
    return this._api.downloadRemaining / this._api.downloadRate;
  }
  getDownloadRemaining() :number {
    return this._api.downloadRemaining;
  }
  getDownloadEstimate() :number {
    return this._api.downloadEstimate;
  }
  getDownloadRate() :number {
    return this._api.downloadRate;
  }
  getDownloadProgressRatio() :number {
    var estimate = this.getDownloadEstimate();
    return estimate != 0 ? (estimate - this.getDownloadRemaining()) / estimate : 1;
  }
  getDownloadProgressPercent() :number {
    return Math.round(this.getDownloadProgressRatio() * 100);
  }
  getTotalFiles() :number {
    return this._api.numberOfFiles;
  }
  getCompletedFiles() :number {
    return this._api.completedFiles;
  }
  login(user :User) :void {
    this._api.ValidateClient(user.email, user.password, user.rememberMe === true);
  }
  logout() :void {
    this._api.InvalidateClient();
  }
  installChannel(channel:Channel) :void {
    this._api.UpdateClient(channel.channelID|0);
  }
  launchChannelfunction(channel:Channel, params:string) {
    this._api.LaunchChannel(channel.channelID|0, params);
  }
  uninstallChannel(channel:Channel) {
    this._api.UninstallChannel(channel.channelID|0);
  }
  hasReadFAQ() :boolean {
    return this._hasReadFAQ || this._api.hasReadFAQ;
  }
  markFAQAsRead() {
    this._hasReadFAQ = true;
    this._api.MarkFAQAsRead();
  }
  
  /**
   * Window Controls
   */
  closeWindow() {
    this._api.closeWindow();
  }
  
  minimizeWindow() {
    this._api.minimizeWindow();
  }
  
  maximizeWindow() {
    this._api.maxmizeWindow();
  }
  
  
}

export const patcher = new PatcherAPI();

export default PatcherAPI;
