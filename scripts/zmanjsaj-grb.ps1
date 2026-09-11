# Pomanjsa grb na kvadrat -Max px (ohrani razmerje, manjsih ne poveca).
#
# Windows nima `sips`, ImageMagick pa ni povsod — .NET System.Drawing je tu
# vedno na voljo in ne potrebuje nobene nove odvisnosti.
param(
  [Parameter(Mandatory = $true)][string]$Pot,
  [int]$Max = 256
)

Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile($Pot)
$w = $img.Width
$h = $img.Height
if ([Math]::Max($w, $h) -le $Max) { $img.Dispose(); exit 0 }

$s = $Max / [Math]::Max($w, $h)
$nw = [int][Math]::Round($w * $s)
$nh = [int][Math]::Round($h * $s)

# JPEG ne pozna prosojnosti: brez bele podlage postane ozadje crno.
$jpeg = $Pot -match '\.jpe?g$'
$oblika = if ($jpeg) {
  [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
} else {
  [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
}

$bmp = New-Object System.Drawing.Bitmap($nw, $nh, $oblika)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CompositingQuality = 'HighQuality'
$g.InterpolationMode = 'HighQualityBicubic'
$g.SmoothingMode = 'HighQuality'
$g.PixelOffsetMode = 'HighQuality'
if ($jpeg) {
  $g.Clear([System.Drawing.Color]::White)
} else {
  $g.Clear([System.Drawing.Color]::Transparent)
}
$g.DrawImage($img, 0, 0, $nw, $nh)
$g.Dispose()
$img.Dispose()

$zacasna = "$Pot.nov"
if ($jpeg) {
  $kodirnik = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' }
  $nast = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $nast.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, 88)
  $bmp.Save($zacasna, $kodirnik, $nast)
} else {
  $bmp.Save($zacasna, [System.Drawing.Imaging.ImageFormat]::Png)
}
$bmp.Dispose()

Move-Item $zacasna $Pot -Force
