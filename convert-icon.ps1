# PowerShell script to convert PNG to ICO
Add-Type -AssemblyName System.Drawing

$inputPath = "c:\Users\pc-jeogo\Desktop\FocusPlus\casnos\resources\logo.png"
$outputPath = "c:\Users\pc-jeogo\Desktop\FocusPlus\casnos\build\icon.ico"

try {
    # Load the PNG image
    $image = [System.Drawing.Image]::FromFile($inputPath)

    # Create a new bitmap with 256x256 size
    $resized = New-Object System.Drawing.Bitmap(256, 256)
    $graphics = [System.Drawing.Graphics]::FromImage($resized)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($image, 0, 0, 256, 256)

    # Save as ICO
    $resized.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Icon)

    # Clean up
    $graphics.Dispose()
    $resized.Dispose()
    $image.Dispose()

    Write-Host "Successfully converted PNG to ICO"
} catch {
    Write-Host "Error converting image: $($_.Exception.Message)"
    Write-Host "You may need to manually convert the logo.png to icon.ico using an online converter"
}
