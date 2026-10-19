import AppKit
import WebKit

// Palimpsest: a native window around the map viewer.
// Pages load live from the project folder named in Info.plist (PalimpsestSourceFolder), so edits show up
// without rebuilding: the app checks the folder every second and reloads when a page changes.
// If that folder is missing, it falls back to the copies bundled inside the app.

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var currentPage = "home"            // "home" (time machine) or "compare"
    var lastSignature = ""
    var showingLive = false

    lazy var sourceFolder: URL? = {
        guard let path = Bundle.main.object(forInfoDictionaryKey: "PalimpsestSourceFolder") as? String, !path.isEmpty else { return nil }
        return URL(fileURLWithPath: (path as NSString).expandingTildeInPath, isDirectory: true)
    }()
    let livePages = ["home": "index.html", "compare": "compare.html"]
    let bundledPages = ["home": "index.html", "compare": "compare.html"]

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()

        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()               // keeps the remembered map, mode and basemap
        config.preferences.isElementFullscreenEnabled = true

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsMagnification = false
        webView.setValue(false, forKey: "drawsBackground")

        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let size = NSSize(width: screen.width * 0.85, height: screen.height * 0.88)
        window = NSWindow(
            contentRect: NSRect(origin: .zero, size: size),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered, defer: false)
        window.title = "Palimpsest"
        window.minSize = NSSize(width: 720, height: 520)
        window.collectionBehavior.insert(.fullScreenPrimary)
        window.backgroundColor = NSColor(red: 0.09, green: 0.125, blue: 0.153, alpha: 1)
        window.contentView = webView
        window.delegate = self
        window.setFrameAutosaveName("PalimpsestMainWindow")
        if !window.setFrameUsingName("PalimpsestMainWindow") { window.center() }
        window.makeKeyAndOrderFront(nil)

        load(page: "home")
        lastSignature = signature()
        Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in self?.checkForChanges() }
        NSApp.activate(ignoringOtherApps: true)
    }

    // MARK: Live loading

    private func liveURL(_ page: String) -> URL? {
        guard let folder = sourceFolder, let name = livePages[page] else { return nil }
        let url = folder.appendingPathComponent(name)
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    func load(page: String) {
        currentPage = page
        if let url = liveURL(page), let folder = sourceFolder {
            showingLive = true
            webView.loadFileURL(url, allowingReadAccessTo: folder)
        } else if let resources = Bundle.main.resourceURL, let name = bundledPages[page] {
            showingLive = false
            webView.loadFileURL(resources.appendingPathComponent(name), allowingReadAccessTo: resources)
        }
        window.subtitle = showingLive ? "Live from \((sourceFolder?.path as NSString?)?.abbreviatingWithTildeInPath ?? "")" : ""
    }

    /// Modification dates of every page, script and stylesheet in the project (skipping the app's own source and builds).
    private func signature() -> String {
        guard let folder = sourceFolder,
              let walker = FileManager.default.enumerator(at: folder, includingPropertiesForKeys: [.contentModificationDateKey, .fileSizeKey],
                                                          options: [.skipsHiddenFiles, .skipsPackageDescendants])
        else { return "" }
        var files: [URL] = []
        for case let url as URL in walker {
            if ["app", "build", "docs", "previews", "node_modules"].contains(url.lastPathComponent) { walker.skipDescendants(); continue }
            files.append(url)
        }
        return files
            .filter { ["html", "js", "css", "json"].contains($0.pathExtension.lowercased()) }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
            .map { url -> String in
                let v = try? url.resourceValues(forKeys: [.contentModificationDateKey, .fileSizeKey])
                return "\(url.path):\(v?.contentModificationDate?.timeIntervalSince1970 ?? 0):\(v?.fileSize ?? 0)"
            }
            .joined(separator: "|")
    }

    private func checkForChanges() {
        let sig = signature()
        let liveAvailable = liveURL(currentPage) != nil
        if sig != lastSignature || liveAvailable != showingLive {
            lastSignature = sig
            load(page: currentPage)            // the page restores its year and camera from local storage
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // keep track of in-page links between the two pages
        let name = webView.url?.lastPathComponent ?? ""
        if name == "palimpsest.html" { currentPage = "compare" }
        else if name == "timemachine.html" || name == "index.html" { currentPage = "home" }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    // Links to the libraries and archives (attribution, sources) open in the default browser.
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = action.request.url, action.navigationType == .linkActivated, url.scheme?.hasPrefix("http") == true {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url { NSWorkspace.shared.open(url) }
        return nil
    }

    @objc func reloadPage(_ sender: Any?) { load(page: currentPage) }
    @objc func openPage(_ sender: NSMenuItem) {
        guard let page = sender.representedObject as? String else { return }
        load(page: page)
    }
    @objc func revealProject(_ sender: Any?) {
        if let folder = sourceFolder { NSWorkspace.shared.activateFileViewerSelecting([folder]) }
    }
    @objc func sendKey(_ sender: NSMenuItem) {
        guard let key = sender.representedObject as? String else { return }
        let js = "document.body.dispatchEvent(new KeyboardEvent('keydown', {key: '\(key)', bubbles: true}))"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    private func buildMenu() {
        let main = NSMenu()

        let appItem = NSMenuItem(); main.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Palimpsest", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Hide Palimpsest", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit Palimpsest", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu

        let editItem = NSMenuItem(); main.addItem(editItem)
        let edit = NSMenu(title: "Edit")
        edit.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
        edit.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
        edit.addItem(.separator())
        edit.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = edit

        let viewItem = NSMenuItem(); main.addItem(viewItem)
        let view = NSMenu(title: "View")
        let home = NSMenuItem(title: "Time Machine", action: #selector(openPage(_:)), keyEquivalent: "1")
        home.representedObject = "home"; view.addItem(home)
        let compare = NSMenuItem(title: "Side-by-side Compare", action: #selector(openPage(_:)), keyEquivalent: "2")
        compare.representedObject = "compare"; view.addItem(compare)
        view.addItem(.separator())
        for (title, key, js) in [("Play or Pause Time", "p", " "), ("Tilt to 3D", "t", "t"), ("Show or Hide Panel", "l", "Escape")] {
            let item = NSMenuItem(title: title, action: #selector(sendKey(_:)), keyEquivalent: key)
            item.representedObject = js
            view.addItem(item)
        }
        view.addItem(withTitle: "Reload", action: #selector(reloadPage(_:)), keyEquivalent: "r")
        view.addItem(withTitle: "Show Project Folder", action: #selector(revealProject(_:)), keyEquivalent: "")
        view.addItem(.separator())
        let fs = NSMenuItem(title: "Enter Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        fs.keyEquivalentModifierMask = [.control, .command]
        view.addItem(fs)
        viewItem.submenu = view

        let winItem = NSMenuItem(); main.addItem(winItem)
        let win = NSMenu(title: "Window")
        win.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        win.addItem(withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        winItem.submenu = win
        NSApp.windowsMenu = win

        NSApp.mainMenu = main
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
