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

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  query,
  runTransaction,
  where,
  writeBatch,
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Query,
  QuerySnapshot,
  deleteDoc,
  updateDoc
} from '@firebase/firestore';

import { log } from './logging';
import { createdDocumentData, createDocument } from './util';

/**
 * Runs the test.
 *
 * Replace the body of this function with the code you would like to execute
 * when the user clicks the "Run Test" button in the UI.
 *
 * @param db the `Firestore` instance to use.
 * case of a cancellation request.
 */
export async function runTheTest(db: Firestore): Promise<void> {
  const collectionRef = collection(db, 'v9web-demo');
  const documentRef1 = await createDocument(
    collectionRef,
    'doc1',
    createdDocumentData()
  );
  const documentRef2 = await createDocument(
    collectionRef,
    'doc2',
    createdDocumentData()
  );
  const documentRef3 = await createDocument(
    collectionRef,
    'doc3',
    createdDocumentData()
  );

  const matchQuery = query(collectionRef, where('matched', '==', true));
  const unsubscribe = onSnapshot(matchQuery, snapshot => {
    log(`Watch Change for "matched==true" query:`);
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        log(
          `New Document ${change.doc._key.toString()}: ${JSON.stringify(
            change.doc.data()
          )}`
        );
      }
      if (change.type === 'modified') {
        log(
          `Modified Document ${change.doc._key.toString()}: ${JSON.stringify(
            change.doc.data()
          )}`
        );
      }
      if (change.type === 'removed') {
        log(
          `Removed Document ${change.doc._key.toString()}: ${JSON.stringify(
            change.doc.data()
          )}`
        );
      }
    });
    log('\n');
  });
}

export async function runSizeTest(db: Firestore): Promise<void> {
  const collectionRef = collection(db, 'v9web-demo');
  for (let i = 1; i <= 1000; i++) {
    await createDocument(collectionRef, `doc${i}`, createdDocumentData(true));
  }

  const matchQuery = query(collectionRef, where('matched', '==', true));
  const unsubscribe = onSnapshot(matchQuery, snapshot => {
    log(`${snapshot.size} documents created for query { matched == true} .`);
  });
}

export async function runAddDoc(db: Firestore): Promise<void> {
  log('\n');

  const docId = document.getElementById('txtAddDoc') as HTMLInputElement;
  const collectionRef = collection(db, 'v9web-demo');
  try {
    await createDocument(collectionRef, docId.value, createdDocumentData());
  } catch (e) {
    console.log('error in add doc:', e);
  }
}

export async function runDeleteDoc(db: Firestore): Promise<void> {
  log('\n');

  const docId = document.getElementById('txtDeleteDoc') as HTMLInputElement;
  const docRef = doc(db, 'v9web-demo', docId.value);
  try {
    await deleteDoc(docRef);
  } catch (e) {
    console.log('error in delete doc:', e);
  }
}

export async function runModifyDoc(db: Firestore): Promise<void> {
  log('\n');

  const docId = document.getElementById('txtModifyDoc') as HTMLInputElement;
  const docRef = doc(db, 'v9web-demo', docId.value);
  const snapshot = await getDoc(docRef);
  try {
    await updateDoc(docRef, {
      matched: snapshot.exists() ? !snapshot.data().matched : false
    });
  } catch (e) {
    console.log('error in modify doc:', e);
  }
}
export async function runListDocs(db: Firestore): Promise<void> {
  log('\n Listing docs with "matched==true":');
  const collectionRef = collection(db, 'v9web-demo');
  const matchQuery = query(collectionRef, where('matched', '==', true));

  const snapshot = await getDocs(matchQuery);
  snapshot.forEach(doc => {
    log(`${doc._key.toString()}: ${JSON.stringify(doc.data())}`);
  });
}
