param(
  [string]$Repo,
  [string]$Branch,
  [int]$Limit = 10,
  [switch]$LatestFailure,
  [long]$RunId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepositorySlug {
  param([string]$ExplicitRepo)

  if ($ExplicitRepo) {
    return $ExplicitRepo
  }

  $remoteUrl = git remote get-url origin 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($remoteUrl)) {
    throw "origin remote から GitHub repository を判定できません。-Repo owner/name を指定してください。"
  }

  if ($remoteUrl -match "github\.com[:/](.+?)(?:\.git)?$") {
    return $Matches[1]
  }

  throw "GitHub repository を判定できません。-Repo owner/name を指定してください。"
}

function Get-ApiHeaders {
  $token = $env:GITHUB_TOKEN
  if ([string]::IsNullOrWhiteSpace($token)) {
    $token = $env:GH_TOKEN
  }

  if ([string]::IsNullOrWhiteSpace($token)) {
    throw "GITHUB_TOKEN または GH_TOKEN を設定してください。"
  }

  return @{
    Accept = "application/vnd.github+json"
    Authorization = "Bearer $token"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "kakeibo-app-ci-helper"
  }
}

function Invoke-GitHubApi {
  param(
    [string]$Uri,
    [hashtable]$Headers
  )

  return Invoke-RestMethod -Method Get -Uri $Uri -Headers $Headers
}

function Format-Timestamp {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return "-"
  }

  return ([DateTimeOffset]::Parse($Value)).ToString("yyyy-MM-dd HH:mm:ss zzz")
}

function Write-RunSummary {
  param([object]$Run)

  Write-Output ("Workflow : {0}" -f $Run.name)
  Write-Output ("Run ID   : {0}" -f $Run.id)
  Write-Output ("Branch   : {0}" -f $Run.head_branch)
  Write-Output ("Status   : {0}" -f $Run.status)
  Write-Output ("Result   : {0}" -f $Run.conclusion)
  Write-Output ("Event    : {0}" -f $Run.event)
  Write-Output ("Commit   : {0}" -f $Run.head_sha)
  Write-Output ("Started  : {0}" -f (Format-Timestamp $Run.run_started_at))
  Write-Output ("Updated  : {0}" -f (Format-Timestamp $Run.updated_at))
  Write-Output ("URL      : {0}" -f $Run.html_url)
}

function Write-JobSummary {
  param([object[]]$Jobs)

  if (-not $Jobs -or $Jobs.Count -eq 0) {
    Write-Output ""
    Write-Output "Job 情報はありません。"
    return
  }

  Write-Output ""
  Write-Output "Jobs:"
  foreach ($job in $Jobs) {
    Write-Output ("- {0} [{1}/{2}]" -f $job.name, $job.status, $job.conclusion)
    Write-Output ("  URL: {0}" -f $job.html_url)

    $interestingSteps = @($job.steps | Where-Object {
      $_.conclusion -in @("failure", "cancelled", "timed_out", "action_required")
    })
    if ($interestingSteps.Count -eq 0) {
      $interestingSteps = @($job.steps | Select-Object -Last 3)
    }

    foreach ($step in $interestingSteps) {
      Write-Output ("  - Step {0}: {1} [{2}/{3}]" -f $step.number, $step.name, $step.status, $step.conclusion)
    }
  }
}

$repoSlug = Get-RepositorySlug -ExplicitRepo $Repo
$headers = Get-ApiHeaders

if ($RunId -gt 0) {
  $run = Invoke-GitHubApi -Uri "https://api.github.com/repos/$repoSlug/actions/runs/$RunId" -Headers $headers
}
else {
  $queryParts = @("per_page=$Limit")
  if ($Branch) {
    $queryParts += "branch=$Branch"
  }

  $runsResponse = Invoke-GitHubApi -Uri ("https://api.github.com/repos/$repoSlug/actions/runs?{0}" -f ($queryParts -join "&")) -Headers $headers
  $runs = @($runsResponse.workflow_runs)

  if ($LatestFailure) {
    $failureConclusions = @("failure", "timed_out", "action_required", "startup_failure")
    $run = $runs | Where-Object { $_.conclusion -in $failureConclusions } | Select-Object -First 1
    if (-not $run) {
      throw "直近 $Limit 件に失敗 run が見つかりませんでした。"
    }
  }
  else {
    Write-Output ("Recent workflow runs for {0}" -f $repoSlug)
    Write-Output ""
    foreach ($item in $runs) {
      Write-Output ("- {0} #{1} [{2}/{3}] {4} {5}" -f $item.name, $item.run_number, $item.status, $item.conclusion, $item.head_branch, $item.html_url)
    }
    return
  }
}

Write-RunSummary -Run $run

$jobsResponse = Invoke-GitHubApi -Uri "https://api.github.com/repos/$repoSlug/actions/runs/$($run.id)/jobs?per_page=100" -Headers $headers
$failedJobs = @($jobsResponse.jobs | Where-Object { $_.conclusion -in @("failure", "cancelled", "timed_out", "action_required") })

if ($failedJobs.Count -gt 0) {
  Write-JobSummary -Jobs $failedJobs
}
else {
  Write-JobSummary -Jobs @($jobsResponse.jobs)
}
