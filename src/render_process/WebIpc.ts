/*
 * Copyright 2014-2016 Simon Edwards <simon@simonzone.com>
 *
 * This source code is licensed under the MIT license which is detailed in the LICENSE.txt file.
 */

import * as Electron from 'electron';
const ipc = Electron.ipcRenderer;

import {BulkFileIdentifier, Metadata} from '../main_process/bulk_file_handling/BulkFileStorage';
import * as Messages from '../WindowMessages';
import * as config from '../Config';
import {Logger, getLogger} from '../logging/Logger';
import * as ThemeTypes from '../theme/Theme';

const _log = getLogger("WebIPC");

const DEBUG = false;
const DEBUG_INCOMING = false;
const DEBUG_OUTGOING = false;

/**
 * Start IPC.
 */
export function start(): void {
  ipc.on(Messages.CHANNEL_NAME, handleAsyncIpc);
}

type ResolveFunc = (msg: Messages.Message) => void;

// This queue is used to route incoming IPC messages to expectant promise objects.
let promiseQueue: {promiseResolve: ResolveFunc, messageType: Messages.MessageType}[] = [];

export type Handler = (msg: Messages.Message) => void;
const defaultHandlers: { messageType: Messages.MessageType, handler: Handler }[] = [];

/**
 * Register a default handler for a message type
 * 
 * @param type    the message type this handler should be used for.
 * @param handler the handler itself.
 */
export function registerDefaultHandler(type: Messages.MessageType, handler: Handler): void {
  defaultHandlers.push( { messageType: type, handler: handler} );
}

function handleAsyncIpc(senderInfo: any, detail: any): void {
  const msg: Messages.Message = detail;
  if (DEBUG_INCOMING) {
    _log.debug("incoming: ", msg);
  }

  const matchingPromises = promiseQueue.filter( p => p.messageType === msg.type );
  const nonMatchingPromises = promiseQueue.filter( p => p.messageType !== msg.type );
  promiseQueue = nonMatchingPromises;
  
  matchingPromises.forEach( tup => {
    tup.promiseResolve(msg);
  });
  
  if (matchingPromises.length === 0) {
    // Fall back on the default handlers.
    defaultHandlers.filter( tup => tup.messageType === msg.type ).forEach( tup => {
      tup.handler(msg);
    });
  }
}

function request(msg: Messages.Message, replyType: Messages.MessageType): Promise<Messages.Message> {
  if (DEBUG_OUTGOING) {
    _log.debug("request: ", msg);
  }
  ipc.send(Messages.CHANNEL_NAME, msg);
  return new Promise<Messages.Message>( (resolve,cancel) => {
    promiseQueue.push( { promiseResolve: resolve, messageType: replyType } );
  });
}

export function requestConfig(): Promise<Messages.ConfigMessage> {
  const msg: Messages.ConfigRequestMessage = {type: Messages.MessageType.CONFIG_REQUEST};
  return <Promise<Messages.ConfigMessage>> request(msg, Messages.MessageType.CONFIG);
}

export function requestThemeList(): Promise<Messages.ThemeListMessage> {
  const msg: Messages.ThemeListRequestMessage = {type: Messages.MessageType.THEME_LIST_REQUEST};
  return <Promise<Messages.ThemeListMessage>> request(msg, Messages.MessageType.THEME_LIST);
}

export function requestThemeContents(themeIdList: string[], cssFileList: ThemeTypes.CssFile[]): Promise<Messages.ThemeContentsMessage> {
  if (DEBUG) {
    _log.debug("requestThemeContents(): ", themeIdList);
  }
  const msg: Messages.ThemeContentsRequestMessage = {type: Messages.MessageType.THEME_CONTENTS_REQUEST,
    themeIdList: themeIdList,
    cssFileList: cssFileList};
  return <Promise<Messages.ThemeContentsMessage>> request(msg, Messages.MessageType.THEME_CONTENTS);
}

export function requestPtyCreate(command: string, args: string[], columns: number, rows: number,
    env: Messages.EnvironmentMap, fromPtyId?: number): Promise<Messages.CreatedPtyMessage> {
      
  if (args === undefined) {
    args = [];
  }

  const msg: Messages.CreatePtyRequestMessage = {
    type: Messages.MessageType.PTY_CREATE,
    command: command,
    args: args,
    columns: columns,
    rows: rows,
    env: env
  };
  if (fromPtyId) { msg.fromPtyId = fromPtyId; }
  return <Promise<Messages.CreatedPtyMessage>> request(msg, Messages.MessageType.PTY_CREATED);
}

export function ptyInput(id: number, data: string): void {
  const msg: Messages.PtyInput = {type: Messages.MessageType.PTY_INPUT, id: id, data: data };
  ipc.send(Messages.CHANNEL_NAME, msg);
}

export function ptyOutputBufferSize(id: number, size: number): void {
  const msg: Messages.PtyOutputBufferSize = {type: Messages.MessageType.PTY_OUTPUT_BUFFER_SIZE, id, size };
  ipc.send(Messages.CHANNEL_NAME, msg);
}

export function ptyResize(id: number, columns: number, rows: number): void {
  const msg: Messages.PtyResize = {type: Messages.MessageType.PTY_RESIZE, id: id, columns: columns, rows: rows };
  ipc.send(Messages.CHANNEL_NAME, msg);
}

export function ptyClose(id: number): void {
  const msg: Messages.PtyCloseRequest = {type: Messages.MessageType.PTY_CLOSE_REQUEST, id: id };
  ipc.send(Messages.CHANNEL_NAME, msg);
}

export function devToolsRequest(open: boolean): void {
  const msg: Messages.DevToolsRequestMessage = { type: Messages.MessageType.DEV_TOOLS_REQUEST, open: open };
  ipc.send(Messages.CHANNEL_NAME, msg);
}

export function clipboardWrite(text: string): void {
  const msg: Messages.ClipboardWriteMessage = { type: Messages.MessageType.CLIPBOARD_WRITE, text: text };
  ipc.send(Messages.CHANNEL_NAME, msg);    
}

export function clipboardReadRequest(): void {
  const msg: Messages.ClipboardReadRequestMessage = { type: Messages.MessageType.CLIPBOARD_READ_REQUEST };
  ipc.send(Messages.CHANNEL_NAME, msg);      
}

export function windowCloseRequest(windowId: number): void {
  const msg: Messages.WindowCloseRequestMessage = {
    type: Messages.MessageType.WINDOW_CLOSE_REQUEST,
    windowId: windowId
  };
  ipc.send(Messages.CHANNEL_NAME, msg);  
}

export function newTerminalWindowRequest(): void {
    const msg: Messages.NewWindowMessage = {
        type: Messages.MessageType.NEW_WINDOW
    };
    ipc.send(Messages.CHANNEL_NAME, msg);
}

export function sendConfig(config: config.Config): void {
  const msg: Messages.ConfigMessage = { type: Messages.MessageType.CONFIG, config: config };
  ipc.send(Messages.CHANNEL_NAME, msg);  
}

export function requestNewTag(): Promise<Messages.NewTagMessage> {
  const msg: Messages.NewTagRequestMessage = {type: Messages.MessageType.NEW_TAG_REQUEST, async: true};
  return <Promise<Messages.NewTagMessage>> request(msg, Messages.MessageType.NEW_TAG);
}

export function requestNewTagSync(): string {
  const msg: Messages.NewTagRequestMessage = {type: Messages.MessageType.NEW_TAG_REQUEST, async: false};
  const event = <any> ipc.sendSync(Messages.CHANNEL_NAME, msg);
  const newTagMessage = <Messages.NewTagMessage> event;
  return newTagMessage.tag;
}

export function windowMinimizeRequest(windowId: number): void {
  const msg: Messages.WindowMinimizeRequestMessage = {
    type: Messages.MessageType.WINDOW_MINIMIZE_REQUEST,
    windowId: windowId
  };
  ipc.send(Messages.CHANNEL_NAME, msg);  
}

export function windowMaximizeRequest(windowId: number): void {
  const msg: Messages.WindowMaximizeRequestMessage = {
    type: Messages.MessageType.WINDOW_MAXIMIZE_REQUEST,
    windowId: windowId
  };
  ipc.send(Messages.CHANNEL_NAME, msg);  
}

export function createBulkFileSync(metadata: Metadata, size: number): {identifier: BulkFileIdentifier, url: string} {
  const msg: Messages.BulkFileCreateMessage = {type: Messages.MessageType.BULK_FILE_CREATE, metadata, size};
  const event = <any> ipc.sendSync(Messages.CHANNEL_NAME, msg);
  const createdBulkFileMessage = <Messages.BulkFileCreatedResponseMessage> event;
  return {identifier: createdBulkFileMessage.identifier, url: createdBulkFileMessage.url};
}

export function writeBulkFile(identifier: BulkFileIdentifier, data: Buffer): void {
  const msg: Messages.BulkFileWriteMessage = {type: Messages.MessageType.BULK_FILE_WRITE, identifier, data};
  ipc.send(Messages.CHANNEL_NAME, msg);
}

export function closeBulkFile(identifier: BulkFileIdentifier, success: boolean): void {
  const msg: Messages.BulkFileCloseMessage = {type: Messages.MessageType.BULK_FILE_CLOSE, identifier, success};
  ipc.send(Messages.CHANNEL_NAME, msg);
}

export function refBulkFile(identifier: BulkFileIdentifier): void {
  const msg: Messages.BulkFileRefMessage = {type: Messages.MessageType.BULK_FILE_REF, identifier};
  ipc.send(Messages.CHANNEL_NAME, msg);
}

export function derefBulkFile(identifier: BulkFileIdentifier): void {
  const msg: Messages.BulkFileDerefMessage = {type: Messages.MessageType.BULK_FILE_DEREF, identifier};
  ipc.send(Messages.CHANNEL_NAME, msg);
}
