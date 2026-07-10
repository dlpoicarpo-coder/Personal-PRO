$headers = @{
  "apikey" = "sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Authorization" = "Bearer sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
}
$url = "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/sessions?id=eq.eb88e359-a270-40cb-aa83-c9556ea6184e"
try {
  $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
  $session = $res[0]
  Write-Host "Raw JSON data of session:"
  $session | ConvertTo-Json -Depth 2
} catch {
  Write-Host "Exception: $_"
}
