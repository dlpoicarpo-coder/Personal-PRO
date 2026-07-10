$headers = @{
  "apikey" = "sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Authorization" = "Bearer sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
}
$url = "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/workouts?id=eq.2ce0fc28-beae-48e0-a642-8c3e5672dcd4"
try {
  $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
  Write-Host "Workout query success! Count: $($res.Count)"
  if ($res.Count -gt 0) {
    Write-Host "Workout Name: $($res[0].data.name)"
  }
} catch {
  Write-Host "Exception: $_"
}
