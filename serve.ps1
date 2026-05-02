$root = "c:\Users\dlpol\Downloads\Personal Trainer Project\app"
$http = [System.Net.HttpListener]::new()
$http.Prefixes.Add("http://localhost:8090/")
$http.Start()
Write-Host "Personal PRO Server running at http://localhost:8090/"
Write-Host "Press Ctrl+C to stop"

while ($http.IsListening) {
    $ctx = $http.GetContext()
    $path = $ctx.Request.Url.LocalPath
    if ($path -eq "/") { $path = "/index.html" }
    $file = Join-Path $root $path.Replace("/", "\")
    
    if (Test-Path $file -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ext = [System.IO.Path]::GetExtension($file).ToLower()
        $types = @{
            ".html" = "text/html;charset=utf-8"
            ".js"   = "application/javascript;charset=utf-8"
            ".css"  = "text/css;charset=utf-8"
            ".json" = "application/json"
            ".png"  = "image/png"
            ".jpg"  = "image/jpeg"
            ".svg"  = "image/svg+xml"
            ".woff2"= "font/woff2"
            ".ico"  = "image/x-icon"
        }
        if ($types.ContainsKey($ext)) {
            $ctx.Response.ContentType = $types[$ext]
        } else {
            $ctx.Response.ContentType = "application/octet-stream"
        }
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $ctx.Response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
        $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.Close()
}
