$content = Get-Content -Raw -Path "js/pages/student-portal.js"
$len = $content.Length
$i = 0
$line = 1
$col = 1
$openBraces = New-Object System.Collections.ArrayList
$inSingleQuote = $false
$inDoubleQuote = $false
$inBacktick = $false
$inLineComment = $false
$inBlockComment = $false

while ($i -lt $len) {
    $c = $content[$i]
    if ($c -eq "`n") {
        $line++
        $col = 1
        if ($inLineComment) { $inLineComment = $false }
    } else {
        $col++
    }

    # Handle escaping inside strings
    if ($c -eq '\' -and ($inSingleQuote -or $inDoubleQuote -or $inBacktick)) {
        $i += 2
        continue
    }

    # Handle line comment
    if ($inLineComment) {
        $i++
        continue
    }

    # Handle block comment
    if ($inBlockComment) {
        if ($c -eq '*' -and $i + 1 -lt $len -and $content[$i+1] -eq '/') {
            $inBlockComment = $false
            $i += 2
            continue
        }
        $i++
        continue
    }

    # Handle strings
    if ($inSingleQuote) {
        if ($c -eq "'") { $inSingleQuote = $false }
        $i++
        continue
    }
    if ($inDoubleQuote) {
        if ($c -eq '"') { $inDoubleQuote = $false }
        $i++
        continue
    }
    if ($inBacktick) {
        if ($c -eq '`') { $inBacktick = $false }
        $i++
        continue
    }

    # Check for start of comments or strings
    if ($c -eq '/' -and $i + 1 -lt $len -and $content[$i+1] -eq '/') {
        $inLineComment = $true
        $i += 2
        continue
    }
    if ($c -eq '/' -and $i + 1 -lt $len -and $content[$i+1] -eq '*') {
        $inBlockComment = $true
        $i += 2
        continue
    }
    if ($c -eq "'") {
        $inSingleQuote = $true
        $i++
        continue
    }
    if ($c -eq '"') {
        $inDoubleQuote = $true
        $i++
        continue
    }
    if ($c -eq '`') {
        $inBacktick = $true
        $i++
        continue
    }

    # Braces
    if ($c -eq '{') {
        [void]$openBraces.Add(@{line=$line; col=$col})
    }
    if ($c -eq '}') {
        if ($openBraces.Count -eq 0) {
            Write-Host "Extra closing brace at line $line, col $col"
        } else {
            $openBraces.RemoveAt($openBraces.Count - 1)
        }
    }
    $i++
}

Write-Host "Total open braces left unclosed: $($openBraces.Count)"
if ($openBraces.Count -gt 0) {
    Write-Host "Unclosed open braces locations:"
    foreach ($ob in $openBraces) {
        Write-Host "  Line $($ob.line), Col $($ob.col)"
    }
}
