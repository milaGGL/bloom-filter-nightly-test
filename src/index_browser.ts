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

import { initializeApp, FirebaseApp } from '@firebase/app';
import {
  connectFirestoreEmulator,
  Firestore,
  getFirestore,
  initializeFirestore,
  setLogLevel
} from '@firebase/firestore';

import { firebaseConfig, isDefaultFirebaseConfig } from './firebase_config';
import {
  runAddDoc,
  runDeleteDoc,
  runListDocs,
  runModifyDoc,
  runTheTest
} from './run_the_test';
import { CancellationTokenSource } from './cancellation_token';
import { log, resetStartTime, setLogFunction } from './logging';
import { clearLogs, log as browserLog } from './logging_browser';
import { formatElapsedTime } from './util';

// Initialize the logging framework.
setLogFunction(browserLog);

// The `FirebaseApp` and `Firestore` instances, stored in global variables so
// that they can be re-used each time that the test is run.
let app: FirebaseApp | null = null;
let db: Firestore | null = null;

/**
 * Create the `Firestore` object and return it.
 *
 * The first invocation of this method will create the `Firestore` object, and
 * subsequent invocations will return the same `Firestore` instance.
 */
function setupFirestore(): Firestore {
  if (db) {
    return db;
  }

  const { chkFirestoreEmulator } = getUiElements();

  // Verify that the `FirestoreOptions` are set to something other than the
  // defaults if the Firestore emulator is not being used. The default options
  // work with the emulator, but will cause strange errors if used against prod.
  const useFirestoreEmulator = saveCheckboxState(chkFirestoreEmulator);
  if (isDefaultFirebaseConfig(firebaseConfig) && !useFirestoreEmulator) {
    throw new Error(
      'The values of firebaseConfig in firebase_config.ts need to be set' +
        ' when not using the Firestore emulator.'
    );
  }

  // Disable the "Use Firestore Emulator" checkbox because once the `Firestore`
  // object is created then it's too late to change your mind about using the
  // Firestore emulator or prod.
  chkFirestoreEmulator.disabled = true;

  if (!app) {
    log(`initializeApp(${firebaseConfig.projectId})`);
    app = initializeApp(firebaseConfig);
  }

  setLogLevelToMatchChkDebugLogging();

  log('getFirestore()');

  db = initializeFirestore(app, {
    host: 'test-firestore.sandbox.googleapis.com/'
  });

  if (useFirestoreEmulator) {
    log("connectFirestoreEmulator(db, 'localhost', 8080)");
    connectFirestoreEmulator(db, 'localhost', 8080);
  }

  return db;
}

let setLogLevelInvoked = false;

/**
 * Calls `setLogLevel()` to set the Firestore log level, specifying the log
 * level indicated by the "Enable Debug Logging" checkbox in the UI.
 *
 * As an optimization, this function avoids calling `setLogLevel('info')` if
 * it knows that the log level is already 'info'.
 */
function setLogLevelToMatchChkDebugLogging(): void {
  const { chkDebugLogging } = getUiElements();
  const checked = saveCheckboxState(chkDebugLogging);
  if (checked || setLogLevelInvoked) {
    const logLevel = checked ? 'debug' : 'info';
    log(`setLogLevel(${logLevel})`);
    setLogLevel(logLevel);
    setLogLevelInvoked = true;
  }
}

/**
 * Callback invoked whenever the "Enable Debug Logging" checkbox's checked state
 * changes.
 */
function onChkDebugLoggingClick(): void {
  // Don't bother calling `setLogLevel()` if the `Firestore` instance hasn't yet
  // been created, because setting the log level is done as part of the
  // `Firestore` instance creation in `setupFirestore()`. This allows the user
  // to toggle the checkbox without actually having any effect, until they press
  // the "Run Test" button.
  if (db) {
    setLogLevelToMatchChkDebugLogging();
  }
}

let currentCancellationTokenSource: CancellationTokenSource | null = null;

/**
 * Callback invoked whenever the "Enable Debug Logging" checkbox's checked state
 * changes.
 *
 * Sets up the `Firestore` instance and invoke the `runTheTest()` function from
 * `run_the_test.ts`.
 */
async function go(this: GlobalEventHandlers, ev: MouseEvent) {
  const { btnRunTest, btnCancelTest } = getUiElements();
  const title = (ev.currentTarget as HTMLElement).innerText;

  if (currentCancellationTokenSource) {
    currentCancellationTokenSource.cancel();
  }
  const cancellationTokenSource = new CancellationTokenSource();
  currentCancellationTokenSource = cancellationTokenSource;

  log(`"${title}" started`);
  try {
    btnRunTest.disabled = true;
    btnCancelTest.disabled = false;
    btnCancelTest.onclick = (ev: MouseEvent) => {
      log(`"${(ev.currentTarget as HTMLElement).innerText}" clicked`);
      cancellationTokenSource.cancel();
    };
    const db = setupFirestore();
    await runTheTest(db, cancellationTokenSource.cancellationToken);
  } catch (e) {
    if (e instanceof Error) {
      log(`ERROR: ${e.message}`, { alsoLogToConsole: false });
      console.log(e.stack);
    } else {
      log(`ERROR: ${e}`);
    }
  } finally {
    btnRunTest.disabled = false;
  }
  log('\n\n');
}

/**
 * Clears the logs from the UI and resets the log time back to zero.
 */
function clearLogsAndResetStartTime(): void {
  clearLogs();
  resetStartTime();
}

/**
 * Saves the "checked" state of the given checkbox into the session storage.
 *
 * This allows the "checked" state to be restored when the page is refreshed.
 * See `initializeCheckboxState()`.
 *
 * @param checkbox The checkbox whose "checked" state to save.
 * @returns `true` if the checkbox was checked, or `false` if it was not.
 */
function saveCheckboxState(checkbox: HTMLInputElement): boolean {
  const checked = checkbox.checked;

  if (typeof Storage !== 'undefined') {
    window.sessionStorage.setItem(checkbox.id, checked ? '1' : '0');
  }

  return checked;
}

/**
 * Restores the "checked" state of the given checkbox from the session storage.
 *
 * If a "checked" state was saved by a previous invocation of
 * `saveCheckboxState()` for the given checkbox then its "checked" state will be
 * set to whatever is saved in the session storage.
 *
 * @param checkbox The checkbox whose "checked" state to initialize.
 */
function initializeCheckboxState(checkbox: HTMLInputElement): void {
  if (typeof Storage === 'undefined') {
    // Local storage is not available; nothing to do.
    return;
  }

  const value = window.sessionStorage.getItem(checkbox.id);
  if (value === '1') {
    checkbox.checked = true;
  } else if (value === '0') {
    checkbox.checked = false;
  } else if (value !== undefined) {
    console.log(
      `WARNING: initializeCheckboxState(): unexpected value ` +
        `in window.sessionStorage for ${checkbox.id}: ${value}`
    );
  }
}

async function addDoc(this: GlobalEventHandlers, ev: MouseEvent) {
  if (currentCancellationTokenSource) {
    currentCancellationTokenSource.cancel();
  }
  const cancellationTokenSource = new CancellationTokenSource();
  currentCancellationTokenSource = cancellationTokenSource;

  try {
    const db = setupFirestore();
    await runAddDoc(db, cancellationTokenSource.cancellationToken);
  } catch (e) {
    if (e instanceof Error) {
      log(`ERROR: ${e.message}`, { alsoLogToConsole: false });
      console.log(e.stack);
    } else {
      log(`ERROR: ${e}`);
    }
  }
  log('Add doc completed.');
  log('\n');

}

async function deleteDoc(this: GlobalEventHandlers, ev: MouseEvent) {
  if (currentCancellationTokenSource) {
    currentCancellationTokenSource.cancel();
  }
  const cancellationTokenSource = new CancellationTokenSource();
  currentCancellationTokenSource = cancellationTokenSource;

  try {
    const db = setupFirestore();
    await runDeleteDoc(db, cancellationTokenSource.cancellationToken);
  } catch (e) {
    if (e instanceof Error) {
      log(`ERROR: ${e.message}`, { alsoLogToConsole: false });
      console.log(e.stack);
    } else {
      log(`ERROR: ${e}`);
    }
  }
  log('Delete doc completed.');
  log('\n');
}

async function modifyDoc(this: GlobalEventHandlers, ev: MouseEvent) {
  if (currentCancellationTokenSource) {
    currentCancellationTokenSource.cancel();
  }
  const cancellationTokenSource = new CancellationTokenSource();
  currentCancellationTokenSource = cancellationTokenSource;

  try {
    const db = setupFirestore();
    await runModifyDoc(db, cancellationTokenSource.cancellationToken);
  } catch (e) {
    if (e instanceof Error) {
      log(`ERROR: ${e.message}`, { alsoLogToConsole: false });
      console.log(e.stack);
    } else {
      log(`ERROR: ${e}`);
    }
  }
  log('Modify doc completed.');
  log('\n');
}

async function listDocs(this: GlobalEventHandlers, ev: MouseEvent) {
  if (currentCancellationTokenSource) {
    currentCancellationTokenSource.cancel();
  }
  const cancellationTokenSource = new CancellationTokenSource();
  currentCancellationTokenSource = cancellationTokenSource;

  try {
    const db = setupFirestore();
    await runListDocs(db, cancellationTokenSource.cancellationToken);
  } catch (e) {
    if (e instanceof Error) {
      log(`ERROR: ${e.message}`, { alsoLogToConsole: false });
      console.log(e.stack);
    } else {
      log(`ERROR: ${e}`);
    }
  }
  log('\n');
}

/**
 * Initialize the "checked" state of the checkboxes in the UI.
 *
 * See `initializeCheckboxState()`.
 */
function initializeCheckboxStates(): void {
  const { chkDebugLogging, chkFirestoreEmulator } = getUiElements();
  initializeCheckboxState(chkDebugLogging);
  initializeCheckboxState(chkFirestoreEmulator);
}

// The HTML elements in the UI with which this script interacts.
interface UiElements {
  btnRunTest: HTMLButtonElement;
  btnList: HTMLButtonElement;
  btnCancelTest: HTMLButtonElement;
  btnClearLogs: HTMLButtonElement;
  btnAddDoc: HTMLButtonElement;
  btnDeleteDoc: HTMLButtonElement;
  btnModifyDoc: HTMLButtonElement;
  chkDebugLogging: HTMLInputElement;
  chkFirestoreEmulator: HTMLInputElement;
}

/** Returns the HTML elements from the UI with which this script interacts. */
function getUiElements(): UiElements {
  return {
    btnRunTest: document.getElementById('btnRunTest') as HTMLButtonElement,
    btnList: document.getElementById('btnList') as HTMLButtonElement,
    btnCancelTest: document.getElementById(
      'btnCancelTest'
    ) as HTMLButtonElement,
    btnClearLogs: document.getElementById('btnClearLogs') as HTMLButtonElement,
    btnAddDoc: document.getElementById('btnAddDoc') as HTMLButtonElement,
    btnDeleteDoc: document.getElementById('btnDeleteDoc') as HTMLButtonElement,
    btnModifyDoc: document.getElementById('btnModifyDoc') as HTMLButtonElement,
    chkDebugLogging: document.getElementById(
      'chkDebugLogging'
    ) as HTMLInputElement,
    chkFirestoreEmulator: document.getElementById(
      'chkFirestoreEmulator'
    ) as HTMLInputElement
  };
}

/** Registers callbacks and initializes state of the HTML UI. */
function initializeUi(): void {
  const {
    btnRunTest,
    btnList,
    btnCancelTest,
    btnClearLogs,
    chkDebugLogging,
    btnAddDoc,
    btnDeleteDoc,
    btnModifyDoc
  } = getUiElements();
  btnRunTest.onclick = go;
  btnList.onclick = listDocs;
  btnCancelTest.disabled = true;
  btnClearLogs.onclick = clearLogsAndResetStartTime;
  chkDebugLogging.onclick = onChkDebugLoggingClick;
  btnAddDoc.onclick = addDoc;
  btnDeleteDoc.onclick = deleteDoc;
  btnModifyDoc.onclick = modifyDoc;
  initializeCheckboxStates();

  log(`Click "${btnRunTest.innerText}" to run the test`);
}

// Call initializeUi() to get everything wired up.
initializeUi();
