// https://github.com/suzuki-0000/SKPhotoBrowser
// phone - browse photos, 
//         merge external fav
//         move unfav to archive
//         bring back fav 
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
//builder.Services.AddSignalR();

var app = builder.Build();

// initialize storage
PhotoFs.Open("../");
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

app.MapControllerRoute(
    name: "GetPhotos",
    pattern: "/api/{controller=PhotoLibrary}/{action=GetPhotos}/{id?}");

app.MapControllerRoute(
    name: "GetImage",
    pattern: "/api/{controller=PhotoLibrary}/{action=GetImage}/{id}");

app.MapControllerRoute(
    name: "GetImage",
    pattern: "/api/{controller=PhotoLibrary}/{action=GetThumbnail}/{id}");

app.MapFallbackToFile("index.html"); ;
//app.MapHub<RctHub>("/updates");

app.Run();
