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

import { FirebaseOptions } from '@firebase/app';

// Replace `firebaseConfig` below with your project's config, copied from the
// Firebase Console. If using the Firestore emulator, you can just leave the
// values below as-is.
const firebaseConfig: FirebaseOptions = {

};

/**
 * Returns whether the values in the given `FirebaseOptions` are set to the
 * dummy/default values that are committed into the GitHub repository.
 *
 * This function is used to test whether the config was modified to contain
 * valid data.
 */
export function isDefaultFirebaseConfig(options: FirebaseOptions): boolean {
  return (
    options.apiKey === 'abc-123-def' && options.projectId === 'my-test-project'
  );
}

export { firebaseConfig };
