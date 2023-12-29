// https://github.com/suzuki-0000/SKPhotoBrowser
// phone - browse photos, 
//         merge external fav
//         move unfav to archive
//         bring back fav 
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
//builder.Services.AddSignalR();

var app = builder.Build();

if (args.Length < 3)
{
    Console.Error.WriteLine("use koukisrc <path_to_db> <path_to_export_dir> <path_to_device_dir>");
    return;
}

// initialize storage
PhotoFs.Open(args[0], args[1], args[2]);
//PhotoFs.Instance.AddSourceFolder(new FolderName("/Users/alexezh/Pictures/stream/2018"));
//PhotoFs.Instance.AddSourceFolder(new FolderName("/Users/alexezh/Pictures/stream/2019"));

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

//app.UseHttpsRedirection();
var staticOptions = new StaticFileOptions();
staticOptions.ServeUnknownFileTypes = true;
app.UseStaticFiles(staticOptions);
app.UseRouting();
app.UseAuthorization();

//app.MapControllerRoute(
//    name: "default",
//    pattern: "{controller=ProjectList}/{action=ListProjects}");

// app.MapControllerRoute(
//     name: "GetFolder",
//     pattern: "/api/{controller=PhotoLibrary}/{action=GetFolder)/{id?}");

app.MapControllerRoute(
    name: "GetFolder",
    pattern: "/api/{controller=PhotoLibrary}/{action=GetFolder}/{id}");

app.MapControllerRoute(
    name: "GetCollection",
    pattern: "/api/{controller=PhotoLibrary}/{action=GetCollection}/{id}");

app.MapControllerRoute(
    name: "GetCollections",
    pattern: "/api/{controller=PhotoLibrary}/{action=GetCollections}");

app.MapControllerRoute(
    name: "GetSourceFolders",
    pattern: "/api/{controller=PhotoLibrary}/{action=GetSourceFolders}");

app.MapControllerRoute(
    name: "GetImage",
    pattern: "/api/{controller=PhotoLibrary}/{action=GetImage}/{id}");

app.MapControllerRoute(
    name: "GetThumbnail",
    pattern: "/api/{controller=PhotoLibrary}/{action=GetThumbnail}/{id}");

app.MapControllerRoute(
    name: "AddSourceFolder",
    pattern: "/api/{controller=PhotoLibrary}/{action=AddSourceFolder}");

app.MapControllerRoute(
    name: "UpdateSourceFolder",
    pattern: "/api/{controller=PhotoLibrary}/{action=RescanSourceFolder}");

app.MapControllerRoute(
    name: "CheckSourceFolder",
    pattern: "/api/{controller=PhotoLibrary}/{action=CheckSourceFolder}");

app.MapControllerRoute(
    name: "UpdatePhotos",
    pattern: "/api/{controller=PhotoLibrary}/{action=UpdatePhotos}");

app.MapControllerRoute(
    name: "GetJobStatus",
    pattern: "/api/{controller=Job}/{action=GetJobStatus}/{id}");

app.MapControllerRoute(
    name: "ExportPhotos",
    pattern: "/api/{controller=Export}/{action=ExportPhotos}");

app.MapControllerRoute(
    name: "GetSyncList",
    pattern: "/api/{controller=MobileSync}/{action=GetSyncList}");

app.MapControllerRoute(
    name: "ConnectDevice",
    pattern: "/api/{controller=MobileSync}/{action=ConnectDevice}");

app.MapControllerRoute(
    name: "AddDevice",
    pattern: "/api/{controller=MobileSync}/{action=AddDevice}");

app.MapControllerRoute(
    name: "GetDevices",
    pattern: "/api/{controller=MobileSync}/{action=GetDevices}");

app.MapControllerRoute(
    name: "UploadFile",
    pattern: "/api/{controller=MobileSync}/{action=UploadFile}");

app.MapControllerRoute(
    name: "AddFile",
    pattern: "/api/{controller=MobileSync}/{action=AddFile}");

app.MapFallbackToFile("index.html"); ;
//app.MapHub<RctHub>("/updates");

app.Run();
