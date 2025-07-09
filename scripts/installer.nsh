; NSIS installer script for CASNOS
; This script handles the installation of different screen types

!macro customInstall
  ; Copy start scripts to installation directory
  SetOutPath $INSTDIR
  
  ; Determine which screen type this is based on product name
  ${If} $R0 == "CASNOS Display"
    File "${BUILD_RESOURCES_DIR}\start-display.bat"
    File /r "${BUILD_RESOURCES_DIR}\server"
  ${ElseIf} $R0 == "CASNOS Customer" 
    File "${BUILD_RESOURCES_DIR}\start-customer.bat"
  ${ElseIf} $R0 == "CASNOS Window"
    File "${BUILD_RESOURCES_DIR}\start-window.bat"
  ${ElseIf} $R0 == "CASNOS Admin"
    File "${BUILD_RESOURCES_DIR}\start-admin.bat"
  ${EndIf}
!macroend
