$path = 'C:\Users\Rad\OneDrive - Telkom University\Kuliah\Skripsi\Draf Skripsi Raditya Hidayat - Parafrase.docx'
if (Test-Path $path) {
    Copy-Item $path -Destination "C:\Users\Rad\Downloads\Github\cert-system\temp3.zip"
    Expand-Archive -Path "C:\Users\Rad\Downloads\Github\cert-system\temp3.zip" -DestinationPath "C:\Users\Rad\Downloads\Github\cert-system\temp3_docx" -Force
    $xml = Get-Content "C:\Users\Rad\Downloads\Github\cert-system\temp3_docx\word\document.xml" -Raw
    
    # Replace paragraph tags with newlines
    $xml = $xml -replace '<w:p\b[^>]*>', "`r`n"
    # Replace tab tags with tabs
    $xml = $xml -replace '<w:tab/>', "`t"
    # Remove all other XML tags
    $text = $xml -replace '<[^>]+>', ''
    
    # Decode XML entities
    $text = $text.Replace("&amp;", "&").Replace("&lt;", "<").Replace("&gt;", ">").Replace("&quot;", "`"").Replace("&apos;", "'")
    
    $text | Out-File "C:\Users\Rad\Downloads\Github\cert-system\skripsi_parafrase_clean.txt" -Encoding UTF8
    
    Remove-Item "C:\Users\Rad\Downloads\Github\cert-system\temp3.zip" -Force
    Remove-Item "C:\Users\Rad\Downloads\Github\cert-system\temp3_docx" -Recurse -Force
    Write-Host "Clean extraction complete."
} else {
    Write-Host "File not found!"
}
