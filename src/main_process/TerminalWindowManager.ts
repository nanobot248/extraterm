import { Config } from "../Config";
import { Logger, getLogger, addLogWriter } from "../logging/Logger";
import * as Messages from "../WindowMessages";

import { BrowserWindow } from "electron";
import { TerminalWindow } from "./TerminalWindow";


export class TerminalWindowManager {
    
    public readonly windows: TerminalWindow[] = [];

    constructor(config: Config) {
    }

    
}