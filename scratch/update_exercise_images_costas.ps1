$headers = @{
  "apikey" = "sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Authorization" = "Bearer sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Content-Type" = "application/json"
}

$res = Invoke-RestMethod -Uri "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/exercises?select=id,data" -Headers $headers

Write-Output "Iniciando atualização de imagens de Costas no Supabase..."

foreach ($item in $res) {
    if ($item.data -and $item.data.name) {
        $name = $item.data.name.Trim()
        $nameLower = $name.ToLower()
        $id = $item.id
        $imageUrl = $null
        
        if ($nameLower -like "*puxada frontal*" -or $nameLower -like "*puxada fechada*") {
            $imageUrl = "assets/exercises/lat_pulldown.png"
        }
        elseif ($nameLower -like "*remada curvada*") {
            $imageUrl = "assets/exercises/barbell_row.png"
        }
        elseif ($nameLower -eq "levantamento terra" -or $nameLower -eq "terra") {
            $imageUrl = "assets/exercises/barbell_deadlift.png"
        }
        elseif ($nameLower -like "*remada unilateral*") {
            $imageUrl = "assets/exercises/dumbbell_row.png"
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

Write-Output "Atualização de imagens de Costas concluída!"
