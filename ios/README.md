In order to build this project you'll need installed

xcode
nodejs 10.13.0
npm 6.4.1

*DON'T* install dependencies using `npm install`, instead, run this:

```
npm install --no-optional --ignore-scripts
```

It will install dependencies without trying to install any native bindings for MacOS. Then, Xcode build process has some scripts to properly rebuild the native modules but using iOS target.

So open XCode and hit "play"