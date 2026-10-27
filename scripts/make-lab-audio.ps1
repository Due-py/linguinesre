# Generates the latency-lab question audio with the built-in Windows voice.
# Lab only: real lessons will use better pre-generated audio.
# Run from the project root:  powershell -NoProfile -File scripts\make-lab-audio.ps1

Add-Type -AssemblyName System.Speech

$questions = [ordered]@{
  q1 = "What do you like doing in your free time?"
  q2 = "Do you prefer reading books or playing sports?"
  q3 = "What do you usually do at the weekend?"
  q4 = "Are you interested in doing DIY?"
  q5 = "Would you like to go to the cinema with me this Sunday?"
}

$outDir = Join-Path $PSScriptRoot "..\public\audio\lab"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$english = $synth.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like "en-*" } | Select-Object -First 1
if (-not $english) { throw "No English Windows voice installed." }
$synth.SelectVoice($english.VoiceInfo.Name)
$synth.Rate = -1
Write-Host "Voice: $($english.VoiceInfo.Name)"

$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
foreach ($id in $questions.Keys) {
  $raw = Join-Path $outDir "$id.raw.wav"
  $synth.SetOutputToWaveFile($raw, $format)
  $synth.Speak($questions[$id])
}
$synth.SetOutputToNull()
$synth.Dispose()

# The Windows voice pads ~0.13 s before and ~0.86 s after the speech. Latency is
# measured from the end of the file, so trailing silence must go (needs ffmpeg).
$trim = "silenceremove=start_periods=1:start_threshold=-45dB,areverse," +
        "silenceremove=start_periods=1:start_threshold=-45dB,areverse"
foreach ($id in $questions.Keys) {
  $raw = Join-Path $outDir "$id.raw.wav"
  $path = Join-Path $outDir "$id.wav"
  ffmpeg -v error -y -i $raw -af $trim $path
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed on $id" }
  Remove-Item $raw
  Write-Host "Wrote $path"
}
