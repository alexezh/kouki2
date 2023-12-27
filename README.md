# from SLR to phone, from LR to Kouki2

I've been using Lightroom for photo management since Lightroom v1. As I moved to make more and more photos using phone, I realized that I do not use Lightroom features that much. And the features which I would like to have such as deep phone integration are missing. After looking at number of alternatives such as Apple Photo, Google photo, Photoprism, Librephotos or Photosync, I could not an app which fits.

Key scenarios which I would like to cover with Kouki are:

- work with existing photo archive structure, including albums, export folders etc
- one click transfer from the phone
- one click remove of not-so-interesting photos from the phone into an archive
- one click archive of duplicate photos from the phone to hard drive while removing them from the phone
- flexible photo management on a computer (and a phone) including
  * duplicate detection
  * favorite, starts, colors and user defined flags
  * tagging (including tagging by custom tools or scripts)
  * short term and long term collections
- no service cost
- minimal editing (crop/rotation)

At this point, Kouki2 supports import and initial level of photo editing (favorites/rejected/etc). I am planning to add export to folders, phash based duplicate detection and import/export from photo in next few months. 

[<img src="./readme-screen1.jpeg" width="400" />]

There are several areas where I am looking to diverge from LR. First is publishing services. LR supports publishing services as a way to export photos to either cloud services or storage. I mostly used publishing to get a folder of photos which I then upload to some cloud service as an album. LR provides a good support for updating publishing directory based on changes in LR catalog. However, figuring out which photos need uploading was always bit painful as there is no way to list which files have changed. Also, publishing services require non-trivial setup and designed as a long-term concepts. For Kouki, I am planning to "export" be a feature of selection. A user can take any selection and export it to a folder. If a folder is existing, a user will get an option to either append to folder or replace it. 

Second is quick collection. TBD

Installation:
- install DotNet Core
- cd kouki2/cs
- dotnet build koukisrv.csproj
- dotnet run

UI is built from web directory. 
- install nodejs
- go to web directory and run "npm install"
- run "npm run build" to produce build
- copy to web/build to cs/wwwroot directory 
