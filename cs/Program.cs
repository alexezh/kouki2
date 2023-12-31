// https://github.com/suzuki-0000/SKPhotoBrowser
// phone - browse photos, 
//         merge external fav
//         move unfav to archive
//         bring back fav 
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
//builder.Services.AddSignalR();
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = null;
});

string koukiPath;
string exportPath = null;
string devicesPath = null;

if (args.Length > 0)
{
    koukiPath = args[0];
    if (args.Length >= 2)
    {
        exportPath = args[1];
    }
    if (args.Length >= 3)
    {
        devicesPath = args[2];
    }
}
else
{
    var picturesPath = Environment.GetFolderPath(Environment.SpecialFolder.MyPictures);
    koukiPath = Path.GetFullPath("kouki2", picturesPath);
}

if (exportPath == null)
{
    exportPath = Path.GetFullPath("export", koukiPath);
}
if (devicesPath == null)
{
    devicesPath = Path.GetFullPath("devices", koukiPath);
}

Console.WriteLine($"Using {koukiPath} for Kouki database and directories");
Console.WriteLine($"You can change it by running 'kouki2 <path_to_db> <path_to_export_dir> <path_to_device_dir>'");
var app = builder.Build();

// initialize storage
PhotoFs.Open(koukiPath, exportPath, devicesPath);

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
