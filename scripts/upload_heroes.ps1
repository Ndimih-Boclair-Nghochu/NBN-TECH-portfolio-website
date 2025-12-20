# PowerShell script to fetch hero images and upload to S3
param(
  [string]$Bucket = 'nbntech-frontend'
)

$images = @{
  'hero-home' = 'https://images.unsplash.com/photo-1521790367033-1b24042c0e20'
  'hero-contact' = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'
  'hero-portfolio' = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085'
  'hero-blogs' = 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2'
  'hero-services' = 'https://images.unsplash.com/photo-1519389950473-47ba0277781c'
}
$widths = 480,800,1200,1600

$workdir = Join-Path $env:TEMP ("heroes_" + [guid]::NewGuid().ToString())
New-Item -Path $workdir -ItemType Directory | Out-Null
Write-Host "Working dir: $workdir"

foreach($key in $images.Keys) {
  $base = $images[$key]
  Write-Host "Processing $key -> $base"
  foreach($w in $widths) {
    $h = [math]::Floor($w * 0.5625)
    $jpg = "$key-$w.jpg"
    $src = "$($base)?w=$w&h=$h&fit=crop&auto=format&q=80"
    $out = Join-Path $workdir $jpg
    Write-Host "  Downloading $src -> $jpg"
    try {
      Invoke-WebRequest -Uri $src -OutFile $out -UseBasicParsing -ErrorAction Stop
    } catch {
      Write-Error "Failed to download $src : $_"
      continue
    }

    # Upload to S3
    Write-Host "  Uploading to s3://$Bucket/uploads/$jpg"
    $upload = & aws s3 cp $out "s3://$Bucket/uploads/$jpg" --acl public-read --content-type image/jpeg --cache-control "public, max-age=31536000, immutable"
    if($LASTEXITCODE -ne 0) {
      Write-Error "aws s3 cp failed for $jpg"
    }
  }
}

Write-Host "Done uploading.\nTip: run aws cloudfront create-invalidation --distribution-id <DIST> --paths '/uploads/*' to invalidate the cache."