import { Config } from "../Config";
import { Logger, getLogger, addLogWriter } from "../logging/Logger";
import * as Messages from "../WindowMessages";

import { Pty, BufferSizeChange } from "../pty/Pty";
import { PtyConnector, PtyOptions, EnvironmentMap } from "./pty/PtyConnector";
import * as PtyConnectorFactory from "./pty/PtyConnectorFactory";

import { BrowserWindow } from "electron";

const logger = getLogger("main_process.PtyManager");

interface PtyTuple {
  windowId: number;
  ptyTerm: Pty;
  outputBufferSize: number; // The number of characters we are allowed to send.
  outputPaused: boolean; // True if the term's output is paused.
}

export class PtyManager {
  public readonly ptyMap: Map<number, PtyTuple> = new Map<number, PtyTuple>();

  protected ptyCounter = 0;
  protected ptyConnector: PtyConnector;

  constructor(config: Config) {
    this.ptyConnector = PtyConnectorFactory.factory(config);
  }

  public destroy(): void {
    this.ptyConnector.destroy();
  }

  public createPty(
    sender: Electron.WebContents,
    file: string,
    args: string[],
    env: EnvironmentMap,
    cols: number,
    rows: number,
    fromPtyId?: number
  ): number {
    const self = this;
    const ptyEnv = _.clone(env);
    ptyEnv["TERM"] = "xterm";

    const ptyOptions: PtyOptions = {
      name: "xterm",
      cols: cols,
      rows: rows,
      env: ptyEnv
    };

    if (fromPtyId) {
      logger.debug("Got fromPtyId ...");
      const fromPty = self.ptyMap.get(fromPtyId);
      if (fromPty && fromPty.ptyTerm) {
        logger.debug("fromPty was found: ", fromPty);
        const cwd = fromPty.ptyTerm.getCwd();
        logger.debug("fromPty CWD: ", cwd);
        if (cwd) {
          logger.debug("CWD of fromPty is: ", cwd);
          ptyOptions.cwd = cwd;
        }
      }
    }

    const ptyTerm = this.ptyConnector.spawn(file, args, ptyOptions);

    this.ptyCounter++;
    const ptyId = this.ptyCounter;
    const ptyTup = {
      windowId: BrowserWindow.fromWebContents(sender).id,
      ptyTerm: ptyTerm,
      outputBufferSize: 0,
      outputPaused: true
    };
    this.ptyMap.set(ptyId, ptyTup);

    ptyTerm.onData((data: string) => {
      if (!sender.isDestroyed()) {
        const msg: Messages.PtyOutput = {
          type: Messages.MessageType.PTY_OUTPUT,
          id: ptyId,
          data: data
        };
        sender.send(Messages.CHANNEL_NAME, msg);
      }
    });

    ptyTerm.onExit(() => {
      logger.debug("pty process exited.");
      if (!sender.isDestroyed()) {
        const msg: Messages.PtyClose = {
          type: Messages.MessageType.PTY_CLOSE,
          id: ptyId
        };
        sender.send(Messages.CHANNEL_NAME, msg);
      }
      ptyTerm.destroy();
      self.ptyMap.delete(ptyId);
    });

    ptyTerm.onAvailableWriteBufferSizeChange(
      (bufferSizeChange: BufferSizeChange) => {
        const msg: Messages.PtyInputBufferSizeChange = {
          type: Messages.MessageType.PTY_INPUT_BUFFER_SIZE_CHANGE,
          id: ptyId,
          totalBufferSize: bufferSizeChange.totalBufferSize,
          availableDelta: bufferSizeChange.availableDelta
        };
        sender.send(Messages.CHANNEL_NAME, msg);
      }
    );

    return ptyId;
  }

  public closePty(id: number): void {
    const ptyTerminalTuple = this.ptyMap.get(id);
    if (ptyTerminalTuple === undefined) {
      return;
    }
    ptyTerminalTuple.ptyTerm.destroy();
    this.ptyMap.delete(id);
  }

  public cleanUpPtyWindow(windowId: number): void {
    const keys = [...this.ptyMap.keys()];
    for (const key of keys) {
      const tup = this.ptyMap.get(key);
      if (tup.windowId === windowId) {
        this.closePty(key);
      }
    }
  }

  public handlePtyCreate(
    sender: Electron.WebContents,
    msg: Messages.CreatePtyRequestMessage
  ): Messages.CreatedPtyMessage {
    //TODO: impl fromPty stuff
    const id = this.createPty(
      sender,
      msg.command,
      msg.args,
      msg.env,
      msg.columns,
      msg.rows,
      msg.fromPtyId
    );
    const reply: Messages.CreatedPtyMessage = {
      type: Messages.MessageType.PTY_CREATED,
      id: id
    };
    return reply;
  }

  public handlePtyInput(msg: Messages.PtyInput): void {
    const ptyTerminalTuple = this.ptyMap.get(msg.id);
    if (ptyTerminalTuple === undefined) {
      logger.warn(
        "handlePtyInput() WARNING: Input arrived for a terminal which doesn't exist."
      );
      return;
    }

    ptyTerminalTuple.ptyTerm.write(msg.data);
  }

  public handlePtyOutputBufferSize(msg: Messages.PtyOutputBufferSize): void {
    const ptyTerminalTuple = this.ptyMap.get(msg.id);
    if (ptyTerminalTuple === undefined) {
      logger.warn(
        "handlePtyOutputBufferSize() WARNING: Input arrived for a terminal which doesn't exist."
      );
      return;
    }

    ptyTerminalTuple.ptyTerm.permittedDataSize(msg.size);
  }

  public handlePtyResize(msg: Messages.PtyResize): void {
    const ptyTerminalTuple = this.ptyMap.get(msg.id);
    if (ptyTerminalTuple === undefined) {
      logger.warn(
        "handlePtyResize() WARNING: Input arrived for a terminal which doesn't exist."
      );
      return;
    }
    ptyTerminalTuple.ptyTerm.resize(msg.columns, msg.rows);
  }

  public handlePtyCloseRequest(msg: Messages.PtyCloseRequest): void {
    const ptyTerminalTuple = this.ptyMap.get(msg.id);
    if (ptyTerminalTuple === undefined) {
      logger.warn("handlePtyCloseRequest() WARNING: Input arrived for a terminal which doesn't exist.");
      return;
    }
    this.closePty(msg.id);
  }
}
