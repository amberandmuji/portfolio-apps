// PomPet - an ambient pixel-art Pomeranian that lives along the bottom of your screen.
// Menu-bar only (no Dock icon). The overlay is click-through, so it never gets in your way.
import AppKit
import ImageIO
import ServiceManagement

let petName = "Muji"   // <- rename your pup here

// MARK: - Sprites

enum SpriteLoader {
    static func load() -> [Anim: [CGImage]] {
        var out: [Anim: [CGImage]] = [:]
        for a in Anim.allCases {
            let strings = SpriteData.frames[a.rawValue] ?? []
            out[a] = strings.compactMap { b64 -> CGImage? in
                guard let data = Data(base64Encoded: b64),
                      let src = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
                return CGImageSourceCreateImageAtIndex(src, 0, nil)
            }
        }
        return out
    }
}

// MARK: - Overlay window + view

final class OverlayWindow: NSWindow {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

final class PetView: NSView {
    let brain: PetBrain
    let sprites: [Anim: [CGImage]]
    var scale: CGFloat = 3
    var zPhase: Double = 0

    init(brain: PetBrain, sprites: [Anim: [CGImage]]) {
        self.brain = brain
        self.sprites = sprites
        super.init(frame: .zero)
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    override var isOpaque: Bool { false }

    /// Where the sprite is drawn (the outline under the feet is 1 sprite-pixel above the view's bottom edge).
    var spriteRect: CGRect {
        let w = CGFloat(SpriteData.width) * scale
        let h = CGFloat(SpriteData.height) * scale
        return CGRect(x: (CGFloat(brain.x) - w / 2).rounded(), y: 0, width: w, height: h)
    }

    /// Everything that may change between frames: sprite, glow, shadow and floating z's.
    var paintRect: CGRect {
        let r = spriteRect
        return CGRect(x: r.minX - 12 * scale, y: 0, width: r.width + 24 * scale, height: bounds.height)
    }

    override func draw(_ dirtyRect: NSRect) {
        guard let ctx = NSGraphicsContext.current?.cgContext,
              let frames = sprites[brain.anim], !frames.isEmpty else { return }
        let img = frames[min(brain.frame, frames.count - 1)]
        let r = spriteRect
        ctx.interpolationQuality = .none
        ctx.setShouldAntialias(false)

        // Soft ground shadow under the body.
        let bodyX: CGFloat = brain.facing > 0 ? 22 : 26
        let sw = 22 * scale, sh = 3 * scale
        ctx.setFillColor(CGColor(srgbRed: 0.2, green: 0.12, blue: 0.08, alpha: 0.16))
        ctx.setShouldAntialias(true)
        ctx.fillEllipse(in: CGRect(x: r.minX + bodyX * scale - sw / 2, y: 1 * scale - sh / 2, width: sw, height: sh))
        ctx.setShouldAntialias(false)

        // Sprite, with a faint warm glow so the dark outline still reads on dark wallpapers.
        ctx.saveGState()
        ctx.setShadow(offset: .zero, blur: 2.5 * scale,
                      color: CGColor(srgbRed: 1, green: 0.95, blue: 0.85, alpha: 0.5))
        if brain.facing < 0 {
            ctx.translateBy(x: r.maxX, y: 0)
            ctx.scaleBy(x: -1, y: 1)
            ctx.draw(img, in: CGRect(x: 0, y: r.minY, width: r.width, height: r.height))
        } else {
            ctx.draw(img, in: r)
        }
        ctx.restoreGState()

        if brain.isAsleep { drawZs(ctx, r) }
    }

    /// Little pixel z's drifting up from the sleeping head.
    private func drawZs(_ ctx: CGContext, _ r: CGRect) {
        let glyph = ["111", "001", "010", "100", "111"]
        let dir: CGFloat = brain.facing > 0 ? 1 : -1
        let headX = brain.facing > 0 ? r.minX + 34 * scale : r.maxX - 34 * scale
        let px = max(1, (scale * 0.8).rounded())
        for k in 0..<3 {
            let ph = (zPhase * 0.35 + Double(k) / 3).truncatingRemainder(dividingBy: 1)
            let zx = headX + dir * CGFloat(ph * 9 + Double(k)) * scale
            let zy = 17 * scale + CGFloat(ph * 13) * scale
            let alpha = CGFloat(1 - ph)
            ctx.setFillColor(CGColor(srgbRed: 0.36, green: 0.19, blue: 0.11, alpha: alpha * 0.9))
            for (row, line) in glyph.enumerated() {
                for (col, ch) in line.enumerated() where ch == "1" {
                    let cell = CGRect(x: (zx + CGFloat(col) * px).rounded(),
                                      y: (zy + CGFloat(4 - row) * px).rounded(),
                                      width: px, height: px)
                    ctx.fill(cell.insetBy(dx: -1, dy: -1))      // dark edge
                }
            }
            ctx.setFillColor(CGColor(srgbRed: 0.99, green: 0.94, blue: 0.84, alpha: alpha))
            for (row, line) in glyph.enumerated() {
                for (col, ch) in line.enumerated() where ch == "1" {
                    ctx.fill(CGRect(x: (zx + CGFloat(col) * px).rounded(),
                                    y: (zy + CGFloat(4 - row) * px).rounded(),
                                    width: px, height: px))
                }
            }
        }
    }
}

// MARK: - App

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private var window: OverlayWindow!
    private var view: PetView!
    private var brain: PetBrain!
    private var statusItem: NSStatusItem!
    private var timer: Timer?

    private var statusLine: NSMenuItem!
    private var energyLine: NSMenuItem!
    private var showItem: NSMenuItem!
    private var dockItem: NSMenuItem!
    private var loginItem: NSMenuItem!
    private var sizeItems: [NSMenuItem] = []

    private var lastTick = ProcessInfo.processInfo.systemUptime
    private var lastSave = 0.0
    private var lastLayout = 0.0
    private let defaults = UserDefaults.standard

    private var scale: CGFloat {
        let s = defaults.double(forKey: "scale")
        return s >= 1 ? CGFloat(s) : 3
    }
    private var onDock: Bool { defaults.bool(forKey: "onDock") }
    private var hidden: Bool { defaults.bool(forKey: "hidden") }

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Restore energy; time away counts as rest.
        var energy = defaults.object(forKey: "energy") as? Double ?? 0.8
        if let last = defaults.object(forKey: "lastSeen") as? Date {
            energy = min(1, energy + max(0, Date().timeIntervalSince(last)) * 0.002)
        }
        let startX = defaults.object(forKey: "x") as? Double ?? 400
        brain = PetBrain(energy: energy, x: startX)

        window = OverlayWindow(contentRect: .zero, styleMask: .borderless, backing: .buffered, defer: false)
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.ignoresMouseEvents = true
        window.isReleasedWhenClosed = false
        window.level = NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.dockWindow)) + 1)
        window.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary, .ignoresCycle]

        view = PetView(brain: brain, sprites: SpriteLoader.load())
        window.contentView = view
        layoutWindow()
        setupMenu()
        if !hidden { window.orderFrontRegardless() }

        let t = Timer(timeInterval: 1.0 / 30.0, target: self, selector: #selector(tick),
                      userInfo: nil, repeats: true)
        RunLoop.main.add(t, forMode: .common)
        timer = t

        NotificationCenter.default.addObserver(self, selector: #selector(screensChanged),
                                               name: NSApplication.didChangeScreenParametersNotification,
                                               object: nil)
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(didWake),
                                                          name: NSWorkspace.didWakeNotification,
                                                          object: nil)
    }

    func applicationWillTerminate(_ notification: Notification) { save() }

    // MARK: Layout

    /// Full-width strip along the bottom of the main screen, just above the Dock (or on it).
    private func layoutWindow() {
        guard let screen = NSScreen.screens.first else { return }
        let s = scale
        view.scale = s
        let ground = onDock ? screen.frame.minY : screen.visibleFrame.minY
        let height = (CGFloat(SpriteData.height) + 14) * s
        let frame = NSRect(x: screen.frame.minX, y: ground - 1 * s,
                           width: screen.frame.width, height: height)
        if window.frame != frame {
            window.setFrame(frame, display: false)
            view.needsDisplay = true
        }
        let half = Double(CGFloat(SpriteData.width) * s / 2)
        brain.setBounds(min: half, max: Double(frame.width) - half, scale: Double(s))
    }

    @objc private func screensChanged() { layoutWindow() }

    @objc private func didWake() { lastTick = ProcessInfo.processInfo.systemUptime }

    // MARK: Loop

    @objc private func tick() {
        let now = ProcessInfo.processInfo.systemUptime
        let dt = now - lastTick
        lastTick = now

        let anyInput = CGEventType(rawValue: ~0)!
        let idle = CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: anyInput)
        let c = Calendar.current.dateComponents([.hour, .minute], from: Date())
        let hour = Double(c.hour ?? 12) + Double(c.minute ?? 0) / 60

        let before = view.paintRect
        brain.tick(dt: dt, userIdle: idle, hour: hour)
        view.zPhase += min(max(dt, 0), 0.25)
        if !hidden { view.setNeedsDisplay(before.union(view.paintRect)) }

        if now - lastLayout > 5 { lastLayout = now; layoutWindow() }   // Dock moved / resized
        if now - lastSave > 30 { lastSave = now; save() }
    }

    private func save() {
        guard let brain = brain else { return }
        defaults.set(brain.energy, forKey: "energy")
        defaults.set(brain.x, forKey: "x")
        defaults.set(Date(), forKey: "lastSeen")
    }

    // MARK: Menu

    private func setupMenu() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let button = statusItem.button {
            let icon = NSImage(systemSymbolName: "pawprint.fill", accessibilityDescription: petName)
            icon?.isTemplate = true
            button.image = icon
        }

        let menu = NSMenu()
        menu.delegate = self
        menu.autoenablesItems = false

        statusLine = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        statusLine.isEnabled = false
        energyLine = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        energyLine.isEnabled = false
        menu.addItem(statusLine)
        menu.addItem(energyLine)
        menu.addItem(.separator())

        showItem = item("Hide \(petName)", #selector(toggleHidden))
        menu.addItem(showItem)

        let sizeMenu = NSMenu()
        for (title, value) in [("Small", 2.0), ("Medium", 3.0), ("Large", 4.0)] {
            let i = item(title, #selector(setSize(_:)))
            i.representedObject = value
            sizeMenu.addItem(i)
            sizeItems.append(i)
        }
        let sizeItem = NSMenuItem(title: "Size", action: nil, keyEquivalent: "")
        sizeItem.submenu = sizeMenu
        menu.addItem(sizeItem)

        dockItem = item("Walk on Top of the Dock", #selector(toggleDock))
        menu.addItem(dockItem)
        loginItem = item("Open at Login", #selector(toggleLogin))
        menu.addItem(loginItem)
        menu.addItem(.separator())
        menu.addItem(item("Quit", #selector(quit), key: "q"))

        statusItem.menu = menu
    }

    private func item(_ title: String, _ action: Selector, key: String = "") -> NSMenuItem {
        let i = NSMenuItem(title: title, action: action, keyEquivalent: key)
        i.target = self
        return i
    }

    func menuWillOpen(_ menu: NSMenu) {
        guard let brain = brain else { return }
        let doing: String
        switch brain.anim {
        case .walk:    doing = "trotting around"
        case .idle:    doing = "hanging out"
        case .sniff:   doing = "sniffing something"
        case .look:    doing = "looking at you"
        case .sit:     doing = "sitting pretty"
        case .yawn:    doing = "yawning"
        case .stretch: doing = "having a big stretch"
        case .zoomies: doing = "doing zoomies!"
        case .lie:     doing = "lounging"
        case .sleep:   doing = "napping"
        case .belly:   doing = "napping belly-up"
        }
        statusLine.title = "\(petName) is \(doing)"
        let dots = Int((brain.energy * 5).rounded())
        energyLine.title = "Energy  " + String(repeating: "●", count: dots) + String(repeating: "○", count: 5 - dots)
        showItem.title = hidden ? "Show \(petName)" : "Hide \(petName)"
        dockItem.state = onDock ? .on : .off
        loginItem.state = SMAppService.mainApp.status == .enabled ? .on : .off
        for i in sizeItems {
            i.state = ((i.representedObject as? Double) ?? 0) == Double(scale) ? .on : .off
        }
    }

    @objc private func toggleHidden() {
        defaults.set(!hidden, forKey: "hidden")
        if hidden { window.orderOut(nil) } else { window.orderFrontRegardless(); view.needsDisplay = true }
    }

    @objc private func setSize(_ sender: NSMenuItem) {
        guard let v = sender.representedObject as? Double else { return }
        defaults.set(v, forKey: "scale")
        layoutWindow()
        view.needsDisplay = true
    }

    @objc private func toggleDock() {
        defaults.set(!onDock, forKey: "onDock")
        layoutWindow()
    }

    @objc private func toggleLogin() {
        let svc = SMAppService.mainApp
        do {
            switch svc.status {
            case .enabled:          try svc.unregister()
            case .requiresApproval: SMAppService.openSystemSettingsLoginItems()
            default:                try svc.register()
            }
        } catch {
            NSSound.beep()
        }
    }

    @objc private func quit() {
        save()
        NSApp.terminate(nil)
    }
}

// MARK: - Entry point

// Top-level code isn't main-actor isolated on every compiler, so state it explicitly.
MainActor.assumeIsolated {
    let app = NSApplication.shared
    let delegate = AppDelegate()
    app.delegate = delegate
    app.setActivationPolicy(.accessory)
    withExtendedLifetime(delegate) { app.run() }
}
