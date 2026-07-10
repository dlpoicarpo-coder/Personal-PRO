$headers = @{
  "apikey" = "sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Authorization" = "Bearer sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
}
$url = "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/sessions?select=*"
try {
  $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
  Write-Host "Total sessions: $($res.Count)"
  foreach ($r in $res) {
    # If the response is mapped to data
    $data = $r.data
    $workoutName = $data.workoutName
    $status = $data.status
    $date = $data.date
    $studentId = $data.studentId
    $id = $r.id
    $trainerId = $r.trainer_id
    Write-Host "ID: $id | Trainer: $trainerId | Student: $studentId | Date: $date | Workout: $workoutName | Status: $status"
  }
} catch {
  Write-Host "Exception: $_"
}
