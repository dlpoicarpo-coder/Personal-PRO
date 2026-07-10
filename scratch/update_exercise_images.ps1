$headers = @{
  "apikey" = "sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Authorization" = "Bearer sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E"
  "Content-Type" = "application/json"
}

$res = Invoke-RestMethod -Uri "https://vbxedlloesvjpqzunqyv.supabase.co/rest/v1/exercises?select=id,data" -Headers $headers

Write-Output "Iniciando atualização de imagens no Supabase com busca flexível..."

foreach ($item in $res) {
    if ($item.data -and $item.data.name) {
        $name = $item.data.name.Trim()
        $nameLower = $name.ToLower()
        $id = $item.id
        $imageUrl = $null
        
        if ($nameLower -like "*eleva*o p*lvica*" -or $nameLower -like "*eleva*Ã£o p*lvica*" -or $nameLower -like "*hip thrust*") {
            if ($nameLower -like "*m*quina*" -or $nameLower -like "*m&aacute;quina*") {
                $imageUrl = "assets/exercises/hip_thrust_machine.png"
            } else {
                $imageUrl = "assets/exercises/hip_thrust.png"
            }
        }
        elseif ($nameLower -like "*coice*cabo*") {
            $imageUrl = "assets/exercises/glute_kickback.png"
        }
        elseif ($nameLower -like "*agachamento*sum*") {
            $imageUrl = "assets/exercises/sumo_squat.png"
        }
        elseif ($nameLower -like "*cadeira abd*") {
            $imageUrl = "assets/exercises/hip_abductor.png"
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

Write-Output "Atualização de imagens concluída!"
