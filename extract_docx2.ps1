$path = 'C:\Users\Rad\OneDrive - Telkom University\Kuliah\Skripsi\Draf Skripsi Raditya Hidayat - Parafrase.docx'
if (Test-Path $path) {
    Copy-Item $path -Destination "C:\Users\Rad\Downloads\Github\cert-system\temp2.zip"
    Expand-Archive -Path "C:\Users\Rad\Downloads\Github\cert-system\temp2.zip" -DestinationPath "C:\Users\Rad\Downloads\Github\cert-system\temp2_docx" -Force
    $xml = Get-Content "C:\Users\Rad\Downloads\Github\cert-system\temp2_docx\word\document.xml" -Raw
    $text = $xml -replace '<[^>]+>', ' ' -replace '\s+', ' '
    $text | Out-File "C:\Users\Rad\Downloads\Github\cert-system\skripsi_parafrase.txt" -Encoding UTF8
    Remove-Item "C:\Users\Rad\Downloads\Github\cert-system\temp2.zip" -Force
    Remove-Item "C:\Users\Rad\Downloads\Github\cert-system\temp2_docx" -Recurse -Force
    Write-Host "Extraction complete."
} else {
    Write-Host "File not found!"
}
