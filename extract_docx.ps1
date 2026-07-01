$path = 'C:\Users\Rad\OneDrive - Telkom University\Kuliah\Skripsi\Draf Skripsi Raditya Hidayat.docx'
Copy-Item $path -Destination "C:\Users\Rad\Downloads\Github\cert-system\temp.zip"
Expand-Archive -Path "C:\Users\Rad\Downloads\Github\cert-system\temp.zip" -DestinationPath "C:\Users\Rad\Downloads\Github\cert-system\temp_docx" -Force
$xml = Get-Content "C:\Users\Rad\Downloads\Github\cert-system\temp_docx\word\document.xml" -Raw
$text = $xml -replace '<[^>]+>', ' ' -replace '\s+', ' '
$text | Out-File "C:\Users\Rad\Downloads\Github\cert-system\skripsi_text.txt" -Encoding UTF8
Remove-Item "C:\Users\Rad\Downloads\Github\cert-system\temp.zip" -Force
Remove-Item "C:\Users\Rad\Downloads\Github\cert-system\temp_docx" -Recurse -Force
