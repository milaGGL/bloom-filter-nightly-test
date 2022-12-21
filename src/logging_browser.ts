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

/** Clears the messages logged via `log()` from the UI. */
export function clearLogs(): void {
  getLogHtmlElement().innerHTML = '';
}

export interface LogOptions {
  alsoLogToConsole: boolean;
}

/** Logs a message to the UI and console.log(). */
export function log(message: string, options: unknown): void {
  const typedOptions = options as Partial<LogOptions>;
  const alsoLogToConsole = typedOptions?.alsoLogToConsole ?? false;
  const htmlElement = getLogHtmlElement();
  htmlElement.appendChild(document.createTextNode(message));
  htmlElement.appendChild(document.createElement('br'));
  if (alsoLogToConsole) {
    console.log(message);
  }
}

/** Gets the HTML element that contains the logged messages. */
function getLogHtmlElement(): HTMLElement {
  return document.getElementById('logPara')!;
}
