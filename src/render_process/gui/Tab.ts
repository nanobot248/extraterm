/*
 * Copyright 2014-2016 Simon Edwards <simon@simonzone.com>
 *
 * This source code is licensed under the MIT license which is detailed in the LICENSE.txt file.
 */
import * as DomUtils from '../DomUtils';
import * as Util from './Util';
import {Logger, getLogger} from '../../logging/Logger';
import log from '../../logging/LogDecorator';

/**
 * Holds the contents of one tab inside a TabWidget tag.
 */
export class Tab extends HTMLElement {
  
  static TAG_NAME = "ET-TAB";

  //-----------------------------------------------------------------------
  // WARNING: Fields like this will not be initialised automatically. See _initProperties().
  private _log: Logger;
  
  private _mutationObserver: MutationObserver;

  private _initProperties(): void {
    this._mutationObserver = null;
    this._log = getLogger(Tab.TAG_NAME, this);
  }

  //-----------------------------------------------------------------------
  //
  //   #                                                         
  //   #       # ###### ######  ####  #   #  ####  #      ###### 
  //   #       # #      #      #    #  # #  #    # #      #      
  //   #       # #####  #####  #        #   #      #      #####  
  //   #       # #      #      #        #   #      #      #      
  //   #       # #      #      #    #   #   #    # #      #      
  //   ####### # #      ######  ####    #    ####  ###### ###### 
  //
  //-----------------------------------------------------------------------

  constructor() {
    super();
    this._initProperties();

    this._mutationObserver = new MutationObserver( (mutations) => {
      this._applyDraggable();
    });
    this._mutationObserver.observe(this, { childList: true });
  }

  connectedCallback(): void {
    this._applyDraggable();
  }

  private _applyDraggable(): void {
    for (const kid of this.childNodes) {
      if (kid instanceof HTMLElement) {
        kid.setAttribute("draggable", "true");
      }
    }
  }
}
