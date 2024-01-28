using kouki2.Controllers;

var builder = WebApplication.CreateBuilder(args);

//WebApplication.
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

try
{
    Directory.CreateDirectory(koukiPath);
}
catch (Exception e)
{
    Console.Error.WriteLine("Cannot create folder " + koukiPath);
    return;
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

Console.WriteLine("wwwwroot:" + app.Environment.WebRootPath);

PhotoLibraryController.RegisterRoutes(app);
JobController.RegisterRoutes(app);
ExportController.RegisterRoutes(app);
SimilarityController.RegisterRoutes(app);
MobileSyncController.RegisterRoutes(app);

app.MapFallbackToFile("index.html"); ;
//app.MapHub<RctHub>("/updates");

app.Start();
BrowserHelper.OpenBrowser("http://localhost:5054");
app.WaitForShutdown();