import { BrowserWindow } from 'electron';
import * as ResourceLoader from '../ResourceLoader';
import { Logger, getLogger, addLogWriter } from '../logging/Logger';
import { terminalWindows, ptyMap } from './Main';
import * as Commander from 'commander';
import * as Messages from '../WindowMessages';

const logger = getLogger('main_process.TerminalWindow');

export interface TerminalWindowOptions extends Electron.BrowserWindowOptions {
}

export class TerminalWindow extends BrowserWindow {

    constructor(options: TerminalWindowOptions) {
        super(<Electron.BrowserWindowOptions> options);
        this.initialize();
    }

    protected initialize() {
        const self = this;

        if ((<any>Commander).devTools) {
            this.webContents.openDevTools();
        }
      
        this.setMenu(null);

        this.on('closed', function() {
            self.cleanUpPtyWindow(self.id);
            delete terminalWindows[self.id];
        });

        this.loadURL(ResourceLoader.toUrl('render_process/main.html'));
        this.maximize();
        this.focus();

        this.webContents.on('devtools-closed', function() {
            self.sendDevToolStatus(false);
        });

        this.webContents.on('devtools-opened', function() {
            self.sendDevToolStatus(true);
        });
    }

    protected cleanUpPtyWindow(windowId: number): void {
        const keys = [...ptyMap.keys()];
        for (const key of keys) {
            const tup = ptyMap.get(key);
            if (tup.windowId === windowId) {
                this.closePty(key);
            }
        }
    }

    protected closePty(id: number): void {
        const ptyTerminalTuple = ptyMap.get(id);
        if (ptyTerminalTuple === undefined) {
          return;
        }
        ptyTerminalTuple.ptyTerm.destroy();
        ptyMap.delete(id);
    }

    protected handlePtyCloseRequest(msg: Messages.PtyCloseRequest): void {
        const ptyTerminalTuple = ptyMap.get(msg.id);
        if (ptyTerminalTuple === undefined) {
          logger.debug("handlePtyCloseRequest() WARNING: Input arrived for a terminal which doesn't exist.");
          return;
        }
        this.closePty(msg.id);
    }

    protected sendDevToolStatus(open: boolean): void {
        const msg: Messages.DevToolsStatusMessage = { type: Messages.MessageType.DEV_TOOLS_STATUS, open: open };
        this.webContents.send(Messages.CHANNEL_NAME, msg);
    }
}