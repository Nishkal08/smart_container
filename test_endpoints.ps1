$base = "http://localhost:3000/api/v1"
$script:token = ""
$ts = Get-Date -Format 'yyyyMMddHHmmss'
$testEmail = "testanalyst_$ts@smartcontainer.dev"
$ctnId1 = "CTN-TEST-PM-$ts"
$ctnId2 = "CTN-PRED-PM-$ts"

function req {
    param($method, $url, $body=$null, $useToken=$true)
    $headers = @{}
    if ($useToken -and $script:token) { $headers["Authorization"] = "Bearer $($script:token)" }
    try {
        if ($body) { $r = Invoke-WebRequest $url -Method $method -Body $body -ContentType "application/json" -Headers $headers -UseBasicParsing -ErrorAction Stop }
        else { $r = Invoke-WebRequest $url -Method $method -Headers $headers -UseBasicParsing -ErrorAction Stop }
        return @{ code = [int]$r.StatusCode; body = $r.Content }
    } catch {
        $code = 0
        try { $code = [int]$_.Exception.Response.StatusCode.value__ } catch {}
        return @{ code = $code; body = $_.ErrorDetails.Message }
    }
}

function show($label, $r, $expectCode) {
    $ok = if ($r.code -eq $expectCode) { "PASS" } else { "FAIL" }
    $color = if ($ok -eq "PASS") { "Green" } else { "Red" }
    Write-Host "[$ok] $label  (got $($r.code), expected $expectCode)" -ForegroundColor $color
    if ($ok -eq "FAIL") { Write-Host "     Body: $($r.body)" -ForegroundColor DarkGray }
    return $r
}

# ─── Health ──────────────────────────────────────────────────────────────────
Write-Host "`n=== HEALTH ===" -ForegroundColor Cyan
$r = req "GET" "$base/health" -useToken $false
show "Health Check" $r 200

# ─── Auth ────────────────────────────────────────────────────────────────────
Write-Host "`n=== AUTH ===" -ForegroundColor Cyan

$registerBody = "{`"name`":`"Test Analyst`",`"email`":`"$testEmail`",`"password`":`"TestPass123!`",`"role`":`"ANALYST`"}"
$r = req "POST" "$base/auth/register" $registerBody -useToken $false
show "Register new user" $r 201

$r = req "POST" "$base/auth/register" $registerBody -useToken $false
show "Register duplicate (expect 409)" $r 409

$r = req "POST" "$base/auth/register" '{"email":"not-an-email","password":"123"}' -useToken $false
show "Register invalid input (expect 400)" $r 400

$r = req "POST" "$base/auth/login" '{"email":"admin@smartcontainer.dev","password":"Admin123!"}' -useToken $false
show "Login admin" $r 200
if ($r.code -eq 200) {
    $json = $r.body | ConvertFrom-Json
    $script:token = $json.data.accessToken
    $script:refreshToken = $json.data.refreshToken
    Write-Host "     Token saved OK" -ForegroundColor DarkGreen
}

$r = req "POST" "$base/auth/login" '{"email":"admin@smartcontainer.dev","password":"wrongpassword"}' -useToken $false
show "Login wrong password (expect 401)" $r 401

$r = req "GET" "$base/auth/me"
show "GET /me" $r 200

$r = req "GET" "$base/auth/me" -useToken $false
show "GET /me no token (expect 401)" $r 401

$r = req "POST" "$base/auth/refresh" "{`"refreshToken`": `"$($script:refreshToken)`"}"
show "Refresh token" $r 200

# ─── Containers ──────────────────────────────────────────────────────────────
Write-Host "`n=== CONTAINERS ===" -ForegroundColor Cyan

$r = req "GET" "$base/containers?page=1&limit=10"
show "List containers" $r 200

$r = req "GET" "$base/containers?page=1&limit=5&risk_level=CRITICAL"
show "List containers filter CRITICAL" $r 200

$body = "{`"container_id`":`"$ctnId1`",`"declaration_date`":`"2024-01-15`",`"declaration_time`":`"10:30:00`",`"trade_regime`":`"IMPORT`",`"origin_country`":`"CN`",`"destination_port`":`"USLAX`",`"destination_country`":`"US`",`"hs_code`":`"851712`",`"importer_id`":`"IMP-PM-001`",`"exporter_id`":`"EXP-PM-001`",`"declared_value`":15000.00,`"declared_weight`":500.0,`"measured_weight`":550.0,`"shipping_line`":`"MAERSK`",`"dwell_time_hours`":36.5}"
$r = req "POST" "$base/containers" $body
show "Create container" $r 201
if ($r.code -eq 201) {
    $json = $r.body | ConvertFrom-Json
    $script:containerDbId = $json.data.container.id
    Write-Host "     container_db_id: $($script:containerDbId)" -ForegroundColor DarkGreen
}

$r = req "POST" "$base/containers" $body
show "Create container duplicate (expect 409)" $r 409

$r = req "GET" "$base/containers/$($script:containerDbId)"
show "Get container by ID" $r 200

$r = req "GET" "$base/containers/00000000-0000-0000-0000-000000000000"
show "Get container not found (expect 404)" $r 404

# ─── Predictions ─────────────────────────────────────────────────────────────
Write-Host "`n=== PREDICTIONS ===" -ForegroundColor Cyan

$body2 = "{`"container_id`":`"$ctnId2`",`"declaration_date`":`"2024-03-01`",`"declaration_time`":`"08:00:00`",`"trade_regime`":`"IMPORT`",`"origin_country`":`"IR`",`"destination_port`":`"GBFXT`",`"destination_country`":`"GB`",`"hs_code`":`"930190`",`"importer_id`":`"IMP-PRED-001`",`"exporter_id`":`"EXP-PRED-001`",`"declared_value`":500.00,`"declared_weight`":1000.0,`"measured_weight`":1500.0,`"shipping_line`":`"CMA CGM`",`"dwell_time_hours`":150.0}"
$r = req "POST" "$base/containers" $body2
show "Create high-risk container" $r 201
if ($r.code -eq 201) {
    $json = $r.body | ConvertFrom-Json
    $script:containerDbId = $json.data.container.id
}

$r = req "POST" "$base/predictions/single" "{`"container_id`": `"$($script:containerDbId)`"}"
show "Single prediction" $r 200

$r = req "GET" "$base/predictions/$($script:containerDbId)"
show "Get prediction by container" $r 200

$r = req "GET" "$base/predictions?page=1&limit=10"
show "List predictions" $r 200

$batchBody = "{`"container_ids`": [`"$ctnId1`"], `"job_name`": `"Postman Test Batch`"}"
$r = req "POST" "$base/predictions/batch" $batchBody
show "Queue batch prediction" $r 202
if ($r.code -eq 202) {
    $json = $r.body | ConvertFrom-Json
    $script:batchJobId = $json.data.batch_job_id
    Write-Host "     batch_job_id: $($script:batchJobId)" -ForegroundColor DarkGreen
}

$r = req "GET" "$base/predictions/export"
show "Export predictions CSV" $r 200

# ─── Jobs ────────────────────────────────────────────────────────────────────
Write-Host "`n=== JOBS ===" -ForegroundColor Cyan

$r = req "GET" "$base/jobs"
show "List jobs" $r 200

$r = req "GET" "$base/jobs/$($script:batchJobId)"
show "Get job by ID" $r 200

# ─── Analytics ───────────────────────────────────────────────────────────────
Write-Host "`n=== ANALYTICS ===" -ForegroundColor Cyan

$r = req "GET" "$base/analytics/summary"
show "Dashboard summary" $r 200

$r = req "GET" "$base/analytics/risk-distribution"
show "Risk distribution" $r 200

$r = req "GET" "$base/analytics/trends"
show "Risk trends" $r 200

$r = req "GET" "$base/analytics/top-risky-shippers"
show "Top risky shippers" $r 200

$r = req "GET" "$base/analytics/country-risk"
show "Country risk heatmap" $r 200

# ─── New: Auth Change Password ────────────────────────────────────────────────
Write-Host "`n=== AUTH - CHANGE PASSWORD ===" -ForegroundColor Cyan

$r = req "POST" "$base/auth/change-password" '{"current_password":"Admin123!","new_password":"Admin456#"}'
show "Change password" $r 200

$r = req "POST" "$base/auth/change-password" '{"current_password":"WrongPass1","new_password":"Admin789#"}'
show "Change password wrong current (expect 400)" $r 400

# Change password back so login still works in re-runs
$r = req "POST" "$base/auth/change-password" '{"current_password":"Admin456#","new_password":"Admin123!"}'
show "Restore original password" $r 200

# ─── New: Container Update ────────────────────────────────────────────────────
Write-Host "`n=== CONTAINERS - UPDATE ===" -ForegroundColor Cyan

# Create container to update
$ctnIdUpdate = "CTN-UPDATE-$ts"
$bodyUpdate = "{`"container_id`":`"$ctnIdUpdate`",`"declaration_date`":`"2024-06-01`",`"declaration_time`":`"12:00:00`",`"trade_regime`":`"IMPORT`",`"origin_country`":`"DE`",`"destination_port`":`"USNYK`",`"destination_country`":`"US`",`"hs_code`":`"300490`",`"importer_id`":`"IMP-UPD-001`",`"exporter_id`":`"EXP-UPD-001`",`"declared_value`":2000.00,`"declared_weight`":200.0,`"measured_weight`":210.0,`"shipping_line`":`"HAPAG`",`"dwell_time_hours`":20.0}"
$r = req "POST" "$base/containers" $bodyUpdate
show "Create container for update test" $r 201
if ($r.code -eq 201) {
    $json = $r.body | ConvertFrom-Json
    $script:updateCtnDbId = $json.data.container.id
}

$r = req "PUT" "$base/containers/$($script:updateCtnDbId)" '{"dwell_time_hours":99.5,"shipping_line":"MSC"}'
show "Update container fields" $r 200

$r = req "PUT" "$base/containers/00000000-0000-0000-0000-000000000001" '{"dwell_time_hours":1}'
show "Update non-existent container (expect 404)" $r 404

# ─── New: Predictions Re-score ───────────────────────────────────────────────
Write-Host "`n=== PREDICTIONS - RE-SCORE ===" -ForegroundColor Cyan

$r = req "POST" "$base/predictions/re-score/$($script:containerDbId)"
show "Re-score container (upsert prediction)" $r 200

$r = req "POST" "$base/predictions/re-score/00000000-0000-0000-0000-000000000001"
show "Re-score non-existent container (expect 404)" $r 404

# ─── New: Users (ADMIN only) ─────────────────────────────────────────────────
Write-Host "`n=== USERS (ADMIN) ===" -ForegroundColor Cyan

$r = req "GET" "$base/users"
show "List users (admin)" $r 200
if ($r.code -eq 200) {
    $json = $r.body | ConvertFrom-Json
    $script:adminUserId = ($json.data.users | Where-Object { $_.email -eq 'admin@smartcontainer.dev' }).id
    Write-Host "     admin user id: $($script:adminUserId)" -ForegroundColor DarkGreen
}

$r = req "GET" "$base/users?role=ADMIN"
show "List users filtered by role=ADMIN" $r 200

$r = req "GET" "$base/users/$($script:adminUserId)"
show "Get user by ID" $r 200

$r = req "PATCH" "$base/users/$($script:adminUserId)" '{"name":"Admin User Updated"}'
show "Patch user name" $r 200

$r = req "PATCH" "$base/users/00000000-0000-0000-0000-000000000099" '{"name":"Ghost"}'
show "Patch non-existent user (expect 404)" $r 404

# Test ANALYST cannot access users endpoint
$analystLoginR = req "POST" "$base/auth/login" "{`"email`":`"$testEmail`",`"password`":`"TestPass123!`"}" -useToken $false
$analystToken = $null
if ($analystLoginR.code -eq 200) {
    $ajson = $analystLoginR.body | ConvertFrom-Json
    $analystToken = $ajson.data.accessToken
}
$savedToken = $script:token
$script:token = $analystToken
$r = req "GET" "$base/users"
show "List users as ANALYST (expect 403)" $r 403
$script:token = $savedToken

# ─── New: Jobs - Cancel + Results ───────────────────────────────────────────
Write-Host "`n=== JOBS - CANCEL & RESULTS ===" -ForegroundColor Cyan

# Queue a new batch job to cancel
$ctnIdCancel = "CTN-CANCEL-$ts"
$bodyCancel = "{`"container_id`":`"$ctnIdCancel`",`"declaration_date`":`"2024-07-01`",`"declaration_time`":`"09:00:00`",`"trade_regime`":`"IMPORT`",`"origin_country`":`"JP`",`"destination_port`":`"USLAX`",`"destination_country`":`"US`",`"hs_code`":`"841830`",`"importer_id`":`"IMP-CXL-001`",`"exporter_id`":`"EXP-CXL-001`",`"declared_value`":5000.00,`"declared_weight`":100.0,`"measured_weight`":102.0,`"shipping_line`":`"ONE`",`"dwell_time_hours`":12.0}"
$r = req "POST" "$base/containers" $bodyCancel
if ($r.code -eq 201) {
    $json = $r.body | ConvertFrom-Json
    $cancelCtnId = $json.data.container.id
    $batchR = req "POST" "$base/predictions/batch" "{`"container_ids`": [`"$ctnIdCancel`"], `"job_name`": `"Cancel Test Job`"}"
    if ($batchR.code -eq 202) {
        $bjson = $batchR.body | ConvertFrom-Json
        $script:cancelJobId = $bjson.data.batch_job_id
        Write-Host "     cancel_job_id: $($script:cancelJobId)" -ForegroundColor DarkGreen

        $cancelR = req "DELETE" "$base/jobs/$($script:cancelJobId)"
        # Worker may process the job before cancel arrives; both 200 (cancelled) and 409 (already completed) are correct
        $cancelOk = if ($cancelR.code -eq 200 -or $cancelR.code -eq 409) { "PASS" } else { "FAIL" }
        $cancelColor = if ($cancelOk -eq "PASS") { "Green" } else { "Red" }
        Write-Host "[$cancelOk] Cancel queued job  (got $($cancelR.code), expected 200 or 409)" -ForegroundColor $cancelColor
    }
}

$r = req "GET" "$base/jobs/$($script:batchJobId)/results"
show "Get job results CSV" $r 200

$r = req "DELETE" "$base/jobs/00000000-0000-0000-0000-000000000099"
show "Cancel non-existent job (expect 404)" $r 404

# ─── New: Admin Stats & Flush Cache ─────────────────────────────────────────
Write-Host "`n=== ADMIN ===" -ForegroundColor Cyan

$r = req "GET" "$base/admin/stats"
show "Admin stats" $r 200

$r = req "POST" "$base/admin/flush-cache" '{}'
show "Admin flush-cache" $r 200

# Test ANALYST cannot access admin endpoints
$script:token = $analystToken
$r = req "GET" "$base/admin/stats"
show "Admin stats as ANALYST (expect 403)" $r 403
$script:token = $savedToken

# ─── Cleanup ─────────────────────────────────────────────────────────────────
Write-Host "`n=== CLEANUP ===" -ForegroundColor Cyan
$r = req "DELETE" "$base/containers/$($script:containerDbId)"
show "Delete prediction container (soft delete)" $r 200

$r = req "DELETE" "$base/containers/$($script:updateCtnDbId)"
show "Delete update-test container (soft delete)" $r 200

Write-Host "`nDone." -ForegroundColor Cyan
