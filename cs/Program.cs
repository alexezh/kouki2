var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddSignalR();

var app = builder.Build();

// initialize storage
//ProjectCollection.Instance.Initialize();
var pfs = new PhotoFs("./photo.sqlite");
pfs.AddSourceFolder(new FolderName("~/Pictures/stream/2007"));

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
    name: "listFiles",
    pattern: "/api/{controller=ListFiles}",
      new { controller = "ListFiles", action = "List" });

app.MapControllerRoute(
    name: "createProject",
    pattern: "/api/{controller=ProjectList}/{action=CreateProject}");

app.MapFallbackToFile("index.html"); ;
app.MapHub<RctHub>("/updates");

app.Run();
