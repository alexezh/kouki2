# from SLR to phone, from Lightroom to Kouki2

I've been using Lightroom for photo management since Lightroom v1. As I moved to make more and more photos using phone, I realized that I do not use Lightroom features that much. And the features which I would like to have like deep phone integration are missing. After looking at number of alternatives such as Apple Photo, Google photo, Photoprism, Librephotos or Photosync, I could not an app which fits.

My typical scenario is
- Take 100-500 photos a day
- Go through photos on the phone or laptop, rank with favs, colors or stars
- Publish a subset of selected phones on FB, Google Photo, etc
- Remove not-so-interesting photos from the phone into an archive
- Few times a year, print small subset of photos or make a book

Key things I am looking for are:
- work with existing photo archive structure, including albums, export folders etc
- one click transfer from the phone
- one click archive of duplicate photos from the phone to hard drive while removing them from the phone
- flexible photo management on a computer (and a phone) including duplicate detection and export
- no service cost
- minimal editing (crop/rotation)

At this point, Kouki2 supports import and initial level of photo editing (favorites/rejected/etc). I am planning to add export to folders, phash based duplicate detection and import/export from photo in next few months. 

[<img src="./readme-screen1.jpeg" width="400" />]

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
