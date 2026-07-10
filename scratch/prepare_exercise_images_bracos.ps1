$headers = @{
  "apikey" = "sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Authorization" = "Bearer sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Content-Type" = "application/json"
}

$res = Invoke-RestMethod -Uri "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/exercises?select=id,data" -Headers $headers

Write-Output "Pre-configurando caminhos de imagens de Bracos (Biceps e Triceps) no Supabase..."

foreach ($item in $res) {
    if ($item.data -and $item.data.name) {
        $name = $item.data.name.Trim()
        $nameLower = $name.ToLower()
        $id = $item.id
        $imageUrl = $null
        
        # Biceps
        if ($nameLower -like "*rosca direta*" -or $nameLower -eq "rosca 21") {
            $imageUrl = "assets/exercises/barbell_bicep_curl.png"
        }
        elseif ($nameLower -like "*rosca martelo*") {
            $imageUrl = "assets/exercises/dumbbell_hammer_curl.png"
        }
        elseif ($nameLower -like "*rosca scott*" -or $nameLower -like "*rosca concentrada*") {
            $imageUrl = "assets/exercises/preacher_bicep_curl.png"
        }
        
        # Triceps
        elseif ($nameLower -like "*tr*ceps corda*" -or $nameLower -like "*tr*ceps pulley*" -or $nameLower -like "*extens*o de tr*ceps no cabo*") {
            $imageUrl = "assets/exercises/tricep_pushdown.png"
        }
        elseif ($nameLower -like "*tr*ceps testa*" -or $nameLower -like "*tr*ceps franc*s*") {
            $imageUrl = "assets/exercises/tricep_overhead.png"
        }
        elseif ($nameLower -like "*mergulho*") {
            $imageUrl = "assets/exercises/tricep_dips.png"
        }
        
        if ($imageUrl) {
            Write-Output "Configurando: '$name' -> '$imageUrl' (ID: $id)"
            
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
                Write-Error "Falha ao configurar o exercicio '$name': $_"
            }
        }
    }
}

Write-Output "Pre-configuracao concluida!"
