$headers = @{
  "apikey" = "sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Authorization" = "Bearer sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
}
$sUrl = "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/sessions?id=eq.eb88e359-a270-40cb-aa83-c9556ea6184e"
$sRes = Invoke-RestMethod -Uri $sUrl -Headers $headers -Method Get
$sessionRow = $sRes[0]
$sessionData = $sessionRow.data
$payload = @{
  id = $sessionRow.id
  trainer_id = $sessionRow.trainer_id
  data = $sessionData
}
$payloadJson = $payload | ConvertTo-Json -Depth 10 -Compress
Write-Host "Length: $($payloadJson.Length)"
Write-Host "Sample: $($payloadJson.SubString(0, [Math]::Min(500, $payloadJson.Length)))"
