/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import ChatLineParser from './ChatLineParser';


function fromText(text: string, keygen: () => number) : JSX.Element[] {
  const regexp: RegExp = this.createRegExp();
  const match: RegExpExecArray = regexp.exec(text);

  if (match) {
    const matchColor: string = match[1];
    const matchText: string = match[2];
    return [<span key={keygen()} style={{ color: matchColor }}>{this.parse(matchText)}</span>];
  }
}

function parse(text: string): JSX.Element[] {
    const parser = new ChatLineParser();
    return parser.parse(text);
}

function createRegExp() : RegExp {
  return /::([A-Za-z]+|#[A-Fa-f0-9]{3,6})::([\S\s]+)$/g;
}

export default {
  fromText,
  createRegExp,
  parse
}
