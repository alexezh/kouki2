Current select: xcode-select -p /Library/Developer/CommandLineTools

Directory of react component: https://reactnative.directory/?search=qrcode

Save photos to FS

npm install react-native-fs --save
and then link the library.

After Putting the image under Library/Caches:

enter image description here

we can save the local image:

var cacheImagePath = RNFS.CachesDirectoryPath+"/logo_og.png";
console.log(cacheImagePath);
var promise = CameraRoll.saveImageWithTag(cacheImagePath);
promise.then(function(result) {
  console.log('save succeeded ' + result);
}).catch(function(error) {
  console.log('save failed ' + error);
});
