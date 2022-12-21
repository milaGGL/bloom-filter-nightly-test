/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type LogFunction = (message: string, options: unknown) => void;

/**
 * The underlying log function used by `log()`, and set by `setLogFunction()`.
 */
let gLogFunction: LogFunction | null = null;

/**
 * Keep track of "time zero" so that all log statements can have an offset from
 * this "time zero". This makes it easy to see how long operations take, rather
 * than printing the wall clock time.
 *
 * This value is initialized the first time that `log()` is called.
 */
let logStartTime: DOMHighResTimeStamp | null = null;

/**
 * Sets the log function to use when `log()` is invoked.
 *
 * This function must be invoked exactly once before `log()`. If `log()` is
 * invoked _before_ this function then it will throw an exception. If this
 * function is invoked more than once then it will throw an exception.
 *
 * @param logFunction The log function to set.
 */
export function setLogFunction(logFunction: LogFunction): void {
  if (gLogFunction !== null) {
    throw new Error('setLogFunction() has already been invoked');
  }
  gLogFunction = logFunction;
}

/** Logs a message to the UI and, optionally, `console.log()`. */
export function log(message: string, options?: unknown): void {
  if (gLogFunction === null) {
    throw new Error('setLogFunction() has not yet been invoked');
  }
  gLogFunction(`${elapsedTimeStr()} ${message}`, options);
}

/** Resets the start time so that the next call to `log()` will start at t=0. */
export function resetStartTime(): void {
  logStartTime = null;
}

/**
 * Creates and returns a "timestamp" string for the elapsed time.
 *
 * The given timestamp is taken as an offset from the first time that this
 * function is invoked. This allows log messages to start at "time 0" and make
 * it easy for humans to calculate the elapsed time.
 *
 * @returns The timestamp string with which to prefix log lines added to the
 * UI, created from the elapsed time since this function's first invocation.
 */
function elapsedTimeStr(): string {
  const milliseconds = getElapsedMilliseconds();
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const seconds = (milliseconds - minutes * 1000 * 60) / 1000;
  return (
    (minutes < 10 ? '0' : '') +
    minutes +
    ':' +
    (seconds < 10 ? '0' : '') +
    seconds.toFixed(3)
  );
}

/**
 * Returns the number of milliseconds that have elapsed since this function's
 * first invocation.
 */
function getElapsedMilliseconds(): number {
  if (!logStartTime) {
    logStartTime = performance.now();
    return 0;
  }
  return performance.now() - logStartTime;
}
