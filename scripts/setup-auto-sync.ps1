# Empire Agent Auto-Sync Setup
# Creates a Windows Scheduled Task to sync skills to the app every hour

$taskName = "EmpireAgentSkillsSync"
$scriptPath = "C:\Users\josep\Documents\Claude\empire-agent\scripts\sync-skills.py"
$action = New-ScheduledTaskAction -Execute "python" -Argument "$scriptPath --deploy"
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Hours 1) -Once -At (Get-Date)
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -RunOnlyIfNetworkAvailable

try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Auto-sync Empire Agent skills registry to GitHub/Vercel"
    Write-Host "[OK] Scheduled task '$taskName' created - runs every hour"
    Write-Host "[OK] New skills in ~/.claude/skills/ will auto-deploy to empire-agent-eight.vercel.app"
} catch {
    Write-Host "[ERROR] Failed to create scheduled task: $_"
    Write-Host "To sync manually run: python scripts/sync-skills.py --deploy"
}
