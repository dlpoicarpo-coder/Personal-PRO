$headers = @{
  "apikey" = "sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Authorization" = "Bearer sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
}
$url = "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/students?select=id,trainer_id,data"
try {
  $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
  foreach ($r in $res) {
    Write-Host "ID: $($r.id) | Name: $($r.data.name) | Email: $($r.data.email) | Trainer: $($r.trainer_id)"
  }
} catch {
  Write-Error $_
}
