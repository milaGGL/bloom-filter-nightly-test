## Common Setup for both Browser and Node

1. Run `npm install` to install dependencies.
2. Edit `src/firebase_config.ts` to fill out your `apiKey` and `projectId`
   (not required if you only want to use the Firestore emulator).
3. Edit `src/run_the_test.ts` to run whatever code you want to run.

## Run in a Browser

1. Run `npm run build` to generate the compiled JavaScript.
2. Open `index.html` in a web browser, and click the "Run Test" button.

## Run in Node.js

1. Run `npm run run` to run the code in Node on the command line.

To connect to the Firestore emulator, specify `-e`.
To enable Firestore debug logging, specify `-v`.

Example:
```
npm run run -- -e -v
```

# Using your own v9 SDK:

```
cd ~/firebase-js-sdk/packages/firestore
yarn build:debug
yarn pack  # this resulted in a tar file (e.g. firebase-firestore-v3.4.4.tgz)
cd ~/firestore-team/v9web
npm install firebase-firestore-v3.4.4.tgz
```
