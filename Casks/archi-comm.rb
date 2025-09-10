cask "archi-comm" do
  version "0.2.1"
  sha256 :no_check # will be auto-updated by Homebrew

  url "https://github.com/acailic/archi-comm/releases/download/v#{version}/ArchiComm_#{version}_universal.dmg"
  name "ArchiComm"
  desc "Desktop Architecture Communication Platform"
  homepage "https://github.com/acailic/archi-comm"

  auto_updates true
  depends_on macos: ">= :high_sierra"

  app "ArchiComm.app"

  zap trash: [
    "~/Library/Application Support/ArchiComm",
    "~/Library/Caches/ArchiComm",
    "~/Library/Preferences/com.archicomm.app.plist",
    "~/Library/Saved Application State/com.archicomm.app.savedState"
  ]
end