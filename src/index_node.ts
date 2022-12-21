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

import { initializeApp } from '@firebase/app';
import {
  connectFirestoreEmulator,
  Firestore,
  getFirestore,
  setLogLevel
} from '@firebase/firestore';

import { firebaseConfig, isDefaultFirebaseConfig } from './firebase_config';
import { runTheTest } from './run_the_test';
import { CancellationTokenSource } from './cancellation_token';
import { log, setLogFunction } from './logging';
import { log as nodeLog } from './logging_node';
import { formatElapsedTime } from './util';

// Initialize the logging framework.
setLogFunction(nodeLog);

interface SetupFirestoreOptions {
  useFirestoreEmulator: boolean;
  debugLoggingEnabled: boolean;
}

/**
 * Create the `Firestore` object and return it.
 *
 * The first invocation of this method will create the `Firestore` object, and
 * subsequent invocations will return the same `Firestore` instance.
 */
function setupFirestore(options: SetupFirestoreOptions): Firestore {
  const { useFirestoreEmulator, debugLoggingEnabled } = options;

  // Verify that the `FirestoreOptions` are set to something other than the
  // defaults if the Firestore emulator is not being used. The default options
  // work with the emulator, but will cause strange errors if used against prod.
  if (isDefaultFirebaseConfig(firebaseConfig) && !useFirestoreEmulator) {
    throw new Error(
      'The values of firebaseConfig in firebase_config.ts need to be set' +
        ' when not using the Firestore emulator.'
    );
  }

  log(`initializeApp(${firebaseConfig.projectId})`);
  const app = initializeApp(firebaseConfig);

  if (debugLoggingEnabled) {
    const logLevel = 'debug';
    log(`setLogLevel(${logLevel})`);
    setLogLevel(logLevel);
  }

  log('getFirestore()');
  const db = getFirestore(app);

  if (useFirestoreEmulator) {
    log("connectFirestoreEmulator(db, 'localhost', 8080)");
    connectFirestoreEmulator(db, 'localhost', 8080);
  }

  return db;
}

/**
 * Parses the command-line arguments.
 *
 * @return the parsed command-line arguments.
 */
function parseArgs(): SetupFirestoreOptions | null {
  const options: SetupFirestoreOptions = {
    useFirestoreEmulator: false,
    debugLoggingEnabled: false
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === '--emulator' || arg === '-e') {
      options.useFirestoreEmulator = true;
    } else if (arg === '--prod' || arg === '-p') {
      options.useFirestoreEmulator = false;
    } else if (arg === '--verbose' || arg === '-v') {
      options.debugLoggingEnabled = true;
    } else if (arg === '--quiet' || arg === '-q') {
      options.debugLoggingEnabled = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Syntax: ${process.argv[0]} ${process.argv[1]} [options]`);
      console.log('');
      console.log('Options:');
      console.log('  -e/--emulator');
      console.log('    Connect to the Firestore emulator.');
      console.log('  -p/--prod');
      console.log('    Connect to the Firestore production server (default).');
      console.log('  -v/--verbose');
      console.log('    Enable Firestore debug logging.');
      console.log('  -q/--quiet');
      console.log('    Disable Firestore debug logging (default).');
      console.log('  -h/--help');
      console.log('    Print this help message and exit.');
      return null;
    } else {
      throw new Error(`unrecognized command-line argument: ${arg}`);
    }
  }

  return options;
}

/**
 * Callback invoked whenever the "Enable Debug Logging" checkbox's checked state
 * changes.
 *
 * Sets up the `Firestore` instance and invoke the `runTheTest()` function from
 * `run_the_test.ts`.
 */
async function go() {
  const setupFirestoreOptions = parseArgs();
  if (setupFirestoreOptions === null) {
    return;
  }

  // Since there is no way to cancel when running in Node.js, just use a
  // CancellationToken that will never be cancelled.
  const cancellationToken = new CancellationTokenSource().cancellationToken;

  const startTime: DOMHighResTimeStamp = performance.now();
  log(`Test Started`);
  try {
    const db = setupFirestore(setupFirestoreOptions);
    await runTheTest(db, cancellationToken);
  } catch (e) {
    if (e instanceof Error) {
      log(`ERROR: ${e.message}`, { alsoLogToConsole: false });
      console.log(e.stack);
    } else {
      log(`ERROR: ${e}`);
    }
  }
  const endTime: DOMHighResTimeStamp = performance.now();
  const elapsedTimeStr = formatElapsedTime(startTime, endTime);
  log(`Test completed in ${elapsedTimeStr}`);
}

// Run the program!
go();
