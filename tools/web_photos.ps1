# Make a web copy of a photo for the "Off the clock" carousel.
#
# From WSL, in the repo root:
#   powershell.exe -File "$(wslpath -w tools/web_photos.ps1)" "$(wslpath -w photos/NAME.jpg)" "$(wslpath -w $PWD)\photos\web\name.jpg"
#
# Resizes to 900px tall (sharp at 2x for the 420px max display height), saves a
# quality-82 JPEG, applies the EXIF rotation, and drops all metadata (GPS too).
# Reads JPEG, PNG and HEIC (HEIC needs Windows' HEIF extension). If a photo
# still comes out sideways or mirrored, pass -force 3 (180°), 6 (90° cw) or 8 (90° ccw).
param([string]$src, [string]$dst, [int]$maxH = 900, [long]$q = 82, [int]$force = 0)
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($src)
# apply EXIF orientation
if ($img.PropertyIdList -contains 0x0112) {
  $o = $img.GetPropertyItem(0x0112).Value[0]; if ($force) { $o = $force }
  switch ($o) { 2 {$img.RotateFlip('RotateNoneFlipX')} 3 {$img.RotateFlip('Rotate180FlipNone')} 4 {$img.RotateFlip('RotateNoneFlipY')} 5 {$img.RotateFlip('Rotate90FlipX')} 6 {$img.RotateFlip('Rotate90FlipNone')} 7 {$img.RotateFlip('Rotate270FlipX')} 8 {$img.RotateFlip('Rotate270FlipNone')} }
}
$h = [Math]::Min($maxH, $img.Height); $w = [int][Math]::Round($img.Width * $h / $img.Height)
$bmp = New-Object System.Drawing.Bitmap $w, $h   # fresh bitmap: no EXIF/GPS carried over
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
$g.DrawImage($img, 0, 0, $w, $h)
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$p = New-Object System.Drawing.Imaging.EncoderParameters 1
$p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), $q
$bmp.Save($dst, $enc, $p)
"$w x $h"
