/*
 * Copyright 2014-2018 Simon Edwards <simon@simonzone.com>
 *
 * This source code is licensed under the MIT license which is detailed in the LICENSE.txt file.
 */
import {Event} from 'extraterm-extension-api';


export interface BufferSizeChange {
  totalBufferSize: number;  // Sizes here are in 16bit characters.
  availableDelta: number;
}


/**
 * Represents a PTY.
 */
export interface Pty {
  /**
   * Write data to the pty
   *
   * @param data data to write.
   */
  write(data: string): void;

  getAvailableWriteBufferSize(): number;

  onAvailableWriteBufferSizeChange: Event<BufferSizeChange>;

  /**
   * Tell the pty that the size of the terminal has changed
   *
   * @param cols number of columns in ther terminal.
   * @param rows number of rows in the terminal.
   */
  resize(cols: number, rows: number): void;

  permittedDataSize(size: number): void;

  /**
   * Destroy the pty and shut down the attached process
   */
  destroy(): void;
  
  onData: Event<string>;
  
  onExit: Event<void>;
  
  /**
   * Try to get the current working directory of the process associated with
   * this terminal (e.g. bash).
   * @return Null if there is no associated process or if the CWD cannot be
   *    retrieved (e.g. no support for the current OS). A string containing
   *    the current working directory otherwise.
   *    
   */
  getCwd(): string;
}
