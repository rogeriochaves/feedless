In order to build this project you'll need installed

xcode
nodejs 10.13.0
npm 6.4.1

Some pieces of knowledge:

- *DON'T* install dependencies using `npm install`, just open xcode and hit the "play" button

- You can understand the build process by clicking on the project on xcode > feedless target > build phases

- In order to generate an archive for publication you might need to delete backend/node_modules first because of different
certificates code signing thing

- If you want to clean things to start over you need to delete not only backend/node_modules folder but also backend/NATIVE_BUILD.txt file