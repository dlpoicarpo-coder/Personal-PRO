$exercises = @(
  @{ key = "elevação pélvica"; query = "elevação pélvica execução shorts" },
  @{ key = "coice no cabo"; query = "coice no cabo glúteo execução shorts" },
  @{ key = "agachamento sumô"; query = "agachamento sumô execução shorts" },
  @{ key = "cadeira abdutora"; query = "cadeira abdutora execução shorts" },
  @{ key = "elevação pélvica na máquina"; query = "elevação pélvica máquina execução shorts" },
  @{ key = "agachamento livre com barra"; query = "agachamento livre barra execução shorts" },
  @{ key = "cadeira extensora"; query = "cadeira extensora execução shorts" },
  @{ key = "leg press"; query = "leg press 45 execução shorts" },
  @{ key = "agachamento búlgaro"; query = "agachamento búlgaro execução shorts" },
  @{ key = "afundo"; query = "afundo halter execução shorts" },
  @{ key = "passada"; query = "passada halter execução shorts" },
  @{ key = "agachamento frontal"; query = "agachamento frontal execução shorts" },
  @{ key = "hack squat"; query = "agachamento hack execução shorts" },
  @{ key = "goblet squat"; query = "agachamento goblet execução shorts" },
  @{ key = "cadeira flexora"; query = "cadeira flexora execução shorts" },
  @{ key = "mesa flexora"; query = "mesa flexora execução shorts" },
  @{ key = "stiff"; query = "stiff execução shorts" },
  @{ key = "good morning"; query = "good morning exercício execução shorts" },
  @{ key = "supino reto com barra"; query = "supino reto barra execução shorts" },
  @{ key = "supino inclinado com halteres"; query = "supino inclinado halteres execução shorts" },
  @{ key = "peck deck"; query = "voador peck deck execução shorts" },
  @{ key = "cross over"; query = "cross over peito execução shorts" },
  @{ key = "puxada frontal"; query = "puxada frontal execução shorts" },
  @{ key = "remada curvada"; query = "remada curvada barra execução shorts" },
  @{ key = "levantamento terra"; query = "levantamento terra execução shorts" },
  @{ key = "remada unilateral"; query = "remada unilateral halter execução shorts" },
  @{ key = "prancha frontal"; query = "prancha abdominal execução shorts" },
  @{ key = "russian twist"; query = "russian twist abdominal execução shorts" },
  @{ key = "roda"; query = "abdominal roda execução shorts" },
  @{ key = "prancha lateral"; query = "prancha lateral execução shorts" },
  @{ key = "desenvolvimento"; query = "desenvolvimento ombro halteres execução shorts" },
  @{ key = "elevação lateral"; query = "elevação lateral halteres execução shorts" },
  @{ key = "rosca direta"; query = "rosca direta execução shorts" },
  @{ key = "rosca martelo"; query = "rosca martelo execução shorts" },
  @{ key = "rosca scott"; query = "rosca scott execução shorts" },
  @{ key = "tríceps corda"; query = "tríceps corda execução shorts" },
  @{ key = "tríceps testa"; query = "tríceps testa execução shorts" },
  @{ key = "mergulho"; query = "tríceps mergulho banco execução shorts" }
)

$results = @{}

foreach ($ex in $exercises) {
    Write-Host "Searching for: $($ex.query)..."
    # Search for shorts explicitly
    $url = "https://www.youtube.com/results?search_query=" + [uri]::EscapeDataString($ex.query)
    try {
        $headers = @{
            "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        $response = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
        $html = $response.Content
        
        # Regex to find videoId (especially near shorts or watch)
        # We can extract the first videoId. If YouTube returns shorts, they will be high up in the results.
        if ($html -match '"videoId":"([a-zA-Z0-9_-]{11})"') {
            $videoId = $Matches[1]
            $results[$ex.key] = "https://www.youtube.com/shorts/$videoId"
            Write-Host "Found Shorts: https://www.youtube.com/shorts/$videoId"
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

Write-Host "`n--- FINAL SHORTS MAPPING ---"
$results | ConvertTo-Json
