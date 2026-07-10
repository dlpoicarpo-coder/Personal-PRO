$headers = @{
  "apikey" = "sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Authorization" = "Bearer sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Content-Type" = "application/json"
}

$res = Invoke-RestMethod -Uri "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/exercises?select=id,data" -Headers $headers

Write-Output "Iniciando atualização de imagens de Ombros no Supabase..."

foreach ($item in $res) {
    if ($item.data -and $item.data.name) {
        $name = $item.data.name.Trim()
        $nameLower = $name.ToLower()
        $id = $item.id
        $imageUrl = $null
        
        if ($nameLower -like "*desenvolvimento*" -or $nameLower -like "*arnold press*") {
            $imageUrl = "assets/exercises/dumbbell_shoulder_press.png"
        }
        elseif ($nameLower -like "*eleva*o lateral*") {
            $imageUrl = "assets/exercises/lateral_raise.png"
        }
        
        if ($imageUrl) {
            Write-Output "Atualizando: '$name' com '$imageUrl' (ID: $id)"
            
            # Converter a propriedade data para JSON e remontar como PSCustomObject
            $jsonStr = $item.data | ConvertTo-Json -Depth 10
            $dataObj = $jsonStr | ConvertFrom-Json
            
            # Usar Add-Member para adicionar ou sobrescrever a propriedade imageUrl no PSCustomObject
            $dataObj | Add-Member -Type NoteProperty -Name "imageUrl" -Value $imageUrl -Force
            
            # Gerar o body final em JSON
            $bodyObj = @{
                "data" = $dataObj
            }
            $body = $bodyObj | ConvertTo-Json -Depth 10 -Compress
            
            try {
                $patchUrl = "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/exercises?id=eq.$id"
                $patchRes = Invoke-WebRequest -Uri $patchUrl -Method PATCH -Headers $headers -Body $body -ContentType "application/json; charset=utf-8"
                Write-Output "Sucesso! Status: $($patchRes.StatusCode)"
            } catch {
                Write-Error "Falha ao atualizar o exercício '$name': $_"
            }
        }
    }
}

Write-Output "Atualização de imagens de Ombros concluída!"
