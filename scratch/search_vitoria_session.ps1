$headers = @{
  "apikey" = "sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Authorization" = "Bearer sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
}
# Filter by studentId
$url = "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/sessions?select=*&data->>studentId=eq.e99b4208-5ec1-412b-8f04-9978b8c4fc65"
try {
  $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
  Write-Host "Found $($res.Count) sessions for Vitória."
  foreach ($r in $res) {
    $data = $r.data
    Write-Host "ID: $($r.id) | Date: $($data.date) | Workout: $($data.workoutName) | Status: $($data.status)"
  }
} catch {
  Write-Host "Exception: $_"
}
