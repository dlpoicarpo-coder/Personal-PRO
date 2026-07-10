$headers = @{
  "apikey" = "sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Authorization" = "Bearer sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Prefer" = "return=representation"
}

# 1. Fetch workout to get exercises
$wUrl = "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/workouts?id=eq.2ce0fc28-beae-48e0-a642-8c3e5672dcd4"
$wRes = Invoke-RestMethod -Uri $wUrl -Headers $headers -Method Get
$workout = $wRes[0]
$exercises = $workout.data.exercises

# 2. Fetch session
$sUrl = "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/sessions?id=eq.eb88e359-a270-40cb-aa83-c9556ea6184e"
$sRes = Invoke-RestMethod -Uri $sUrl -Headers $headers -Method Get
$sessionRow = $sRes[0]
$sessionData = $sessionRow.data

# 3. Update fields using Add-Member to dynamically add properties to PSCustomObjects
$setLog = $sessionData.setLog
$totalVolume = 0
foreach ($set in $setLog) {
  $set | Add-Member -NotePropertyName "exIdx" -NotePropertyValue $set.exerciseIdx -Force
  $load = 0
  if ($set.load) { $load = [double]$set.load }
  $reps = 0
  if ($set.reps) { $reps = [int]$set.reps }
  $totalVolume += ($load * $reps)
}

# Inject the calculated fields into the session data object
$sessionData | Add-Member -NotePropertyName "setLog" -NotePropertyValue $setLog -Force
$sessionData | Add-Member -NotePropertyName "exercises" -NotePropertyValue $exercises -Force
$sessionData | Add-Member -NotePropertyName "totalVolume" -NotePropertyValue $totalVolume -Force
$sessionData | Add-Member -NotePropertyName "totalSets" -NotePropertyValue $setLog.Count -Force
$sessionData | Add-Member -NotePropertyName "totalDuration" -NotePropertyValue ($sessionData.durationMin * 60) -Force

# Put back in payload (only using valid columns: id, trainer_id, data)
$payload = @{
  id = $sessionRow.id
  trainer_id = $sessionRow.trainer_id
  data = $sessionData
}

$payloadJson = $payload | ConvertTo-Json -Depth 10 -Compress
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($payloadJson)

# 4. Update back to Supabase
try {
  $upsertRes = Invoke-RestMethod -Uri "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/sessions?id=eq.eb88e359-a270-40cb-aa83-c9556ea6184e" -Headers $headers -Method Patch -Body $bodyBytes -ContentType "application/json; charset=utf-8"
  Write-Host "Update completed successfully!"
} catch {
  Write-Host "Exception: $_"
  if ($_.Exception.Response) {
    $stream = $_.Exception.Response.GetResponseStream()
    if ($stream) {
      $reader = New-Object System.IO.StreamReader($stream)
      $body = $reader.ReadToEnd()
      Write-Host "Response Body: $body"
    }
  }
}
