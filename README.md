# from SLR to phone, from LR to Kouki2

I've been using Lightroom for photo management since Lightroom v1. As I moved to take more and more photos using my phone, I realized that I do not use Lightroom editing features that much. And the features which I would like to have such as deep integration with the phone are missing. After looking at a number of alternatives such as Apple Photo, Google photo, Photoprism, Librephotos or Photosync, I could not find an app which fits.

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

At this point, Kouki2 supports some basic functionality including import, basic library management and so on

[<img src="./readme-screen1.jpeg" width="400" />]

From the high level, library management UI looks similar to LR, however there are some big differences.

**First** is publishing services. LR supports publishing services as a way to export photos to either cloud services or storage. I mostly used publishing to get a folder of photos which I then upload to some cloud service as an album. LR provides a good support for updating publishing directory based on changes in LR catalog. However, figuring out which photos need uploading was always a bit painful as there is no way to list which files have changed. Also, publishing services require non-trivial setup and are designed as long-term concepts. For Kouki, I am planning to implement "export" as a feature of selection. A user can take any selection and export it to a folder. If a folder is existing, a user will get an option to either append to the folder or replace it. 

**Second** is quick collection. In LR, quick collection provides a convenient way to create a list of photos for further processing which is more persistent than selection. The problem is that there is only one collection and many times I had to think if photos in the current quick collection need to be preserved. One option is to add a way to make additional collections, but this would require a user to invent and manage collection names which is non-trivial overhead. Another option is to make a quick collection infinite and provide a way to sort any collection by change time. When we combine the idea of infinite collection with export idea above, we get to the following workflow.

- user selects a set of photos
- at this point user can run operation on a selection, or add selection to quick collection
- in the latter case, user can later go to quick collection, select photos added recently and run an operation
- quick selection is sorted by add time, a user can always go back to previous set of photos

Installation instructions can be found [here](https://github.com/alexezh/kouki2/wiki/Installation). List of pending items is [here]([web](https://github.com/alexezh/kouki2/)https://github.com/alexezh/kouki2/web/todo.md)

