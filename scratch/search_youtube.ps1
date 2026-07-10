$exercises = @(
  @{ key = "elevação pélvica"; query = "Smart Fit Elevação Pélvica" },
  @{ key = "coice no cabo"; query = "Smart Fit Coice no Cabo" },
  @{ key = "agachamento sumô"; query = "Smart Fit Agachamento Sumo" },
  @{ key = "cadeira abdutora"; query = "Smart Fit Cadeira Abdutora" },
  @{ key = "elevação pélvica na máquina"; query = "Smart Fit Elevação Pelvica na Maquina" },
  @{ key = "agachamento livre com barra"; query = "Smart Fit Agachamento Livre" },
  @{ key = "cadeira extensora"; query = "Smart Fit Cadeira Extensora" },
  @{ key = "leg press"; query = "Smart Fit Leg Press 45" },
  @{ key = "agachamento búlgaro"; query = "Smart Fit Agachamento Bulgaro" },
  @{ key = "afundo"; query = "Smart Fit Afundo" },
  @{ key = "passada"; query = "Smart Fit Passada" },
  @{ key = "agachamento frontal"; query = "Smart Fit Agachamento Frontal" },
  @{ key = "hack squat"; query = "Smart Fit Hack Squat" },
  @{ key = "goblet squat"; query = "Smart Fit Goblet Squat" },
  @{ key = "cadeira flexora"; query = "Smart Fit Cadeira Flexora" },
  @{ key = "mesa flexora"; query = "Smart Fit Mesa Flexora" },
  @{ key = "stiff"; query = "Smart Fit Stiff" },
  @{ key = "good morning"; query = "Smart Fit Good Morning" },
  @{ key = "supino reto com barra"; query = "Smart Fit Supino Reto" },
  @{ key = "supino inclinado com halteres"; query = "Smart Fit Supino Inclinado" },
  @{ key = "peck deck"; query = "Smart Fit Voador" },
  @{ key = "cross over"; query = "Smart Fit Cross Over" },
  @{ key = "puxada frontal"; query = "Smart Fit Puxada Frontal" },
  @{ key = "remada curvada"; query = "Smart Fit Remada Curvada" },
  @{ key = "levantamento terra"; query = "Smart Fit Levantamento Terra" },
  @{ key = "remada unilateral"; query = "Smart Fit Remada Unilateral" },
  @{ key = "prancha frontal"; query = "Smart Fit Prancha" },
  @{ key = "russian twist"; query = "Smart Fit Russian Twist" },
  @{ key = "roda"; query = "Smart Fit Abdominal Roda" },
  @{ key = "prancha lateral"; query = "Smart Fit Prancha Lateral" },
  @{ key = "desenvolvimento"; query = "Smart Fit Desenvolvimento" },
  @{ key = "elevação lateral"; query = "Smart Fit Elevação Lateral" },
  @{ key = "rosca direta"; query = "Smart Fit Rosca Direta" },
  @{ key = "rosca martelo"; query = "Smart Fit Rosca Martelo" },
  @{ key = "rosca scott"; query = "Smart Fit Rosca Scott" },
  @{ key = "tríceps corda"; query = "Smart Fit Triceps Corda" },
  @{ key = "tríceps testa"; query = "Smart Fit Triceps Testa" },
  @{ key = "mergulho"; query = "Smart Fit Mergulho Banco" }
)

$results = @{}

foreach ($ex in $exercises) {
    Write-Host "Searching for: $($ex.query)..."
    $url = "https://www.youtube.com/results?search_query=" + [uri]::EscapeDataString($ex.query)
    try {
        $headers = @{
            "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        $response = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
        $html = $response.Content
        
        # Regex to find videoId in YouTube HTML
        if ($html -match '"videoId":"([a-zA-Z0-9_-]{11})"') {
            $videoId = $Matches[1]
            $results[$ex.key] = "https://www.youtube.com/watch?v=$videoId"
            Write-Host "Found: https://www.youtube.com/watch?v=$videoId"
        } else {
            $results[$ex.key] = $null
            Write-Host "Not found"
        }
    } catch {
        $results[$ex.key] = $null
        Write-Host "Error: $_"
    }
    Start-Sleep -Milliseconds 600
}

Write-Host "`n--- FINAL MAPPING ---"
$results | ConvertTo-Json
