' Lance RaceWolf sans console.
' Chemin rapide : Electron déjà compilé (comme un .exe installé).
' Sinon : scripts\launch.bat (install / build une fois).
Option Explicit
Dim sh, fso, scriptsDir, root, electron, mainJs, distHtml, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptsDir = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(scriptsDir)
electron = root & "\node_modules\electron\dist\electron.exe"
mainJs = root & "\dist-electron\electron\main.js"
distHtml = root & "\dist\launcher.html"

sh.CurrentDirectory = root

If fso.FileExists(electron) And fso.FileExists(mainJs) And fso.FileExists(distHtml) Then
  sh.Run """" & electron & """ .", 1, False
Else
  cmd = "cmd /c set RACEWOLF_SILENT=1&& """ & scriptsDir & "\launch.bat"""
  sh.Run cmd, 0, False
End If
