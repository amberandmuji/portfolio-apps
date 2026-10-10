// The pet's "brain": what it is doing, where it is, and how tired it is.
// Pure Foundation - no AppKit - so the behaviour is easy to read and tweak.
import Foundation

enum Anim: String, CaseIterable {
    case walk, idle, sniff, look, sit, yawn, stretch, zoomies, lie, sleep, belly
}

/// Frame order + per-frame durations (seconds) for one animation.
struct AnimSpec {
    let frames: [Int]
    let durations: [Double]
    let oneShot: Bool   // plays once, then the activity ends
}

enum SleepReason { case tired, away, night }

/// One thing the pet does for a while.
struct Activity {
    var anim: Anim
    var duration: Double = 3           // seconds (ignored for one-shot anims); .infinity = until woken
    var speed: Double = 0              // sprite pixels per second; 0 = stays put
    var targetX: Double? = nil         // walk until this x (screen points)
    var drowsy: Bool = false           // slow, heavy blinks while lying down
}

final class PetBrain {
    // ---- Tunables -------------------------------------------------------
    static let walkSpeed = 9.0                     // sprite px / s
    static let zoomSpeed = 46.0
    static let awayAfter: TimeInterval = 5 * 60    // user idle this long -> nap
    static let backWithin: TimeInterval = 2        // user input this recent -> "you're back!"

    // ---- State the view reads ------------------------------------------
    private(set) var x: Double                     // sprite centre, window points
    private(set) var facing: Double = 1            // 1 = right, -1 = left
    private(set) var energy: Double                // 0 (exhausted) ... 1 (full)
    private(set) var anim: Anim = .idle
    private(set) var frame: Int = 0                // index into this anim's sprite frames
    private(set) var sleepReason: SleepReason? = nil

    var isAsleep: Bool { anim == .sleep || anim == .belly }

    // ---- Internals ------------------------------------------------------
    private var minX = 0.0, maxX = 1000.0
    private var scale = 3.0
    private var current = Activity(anim: .idle)
    private var queue: [Activity] = []
    private var pendingSleep: SleepReason? = nil   // set while yawning/lying on the way to sleep
    private var elapsed = 0.0
    private var step = 0
    private var stepTime = 0.0
    private var rollTimer = 120.0                   // roll between curled / belly-up while asleep
    private var nightPeekTimer = 1200.0             // occasionally peeks at a night owl
    private var hour = 12.0

    init(energy: Double, x: Double) {
        self.energy = min(1, max(0, energy))
        self.x = x
        begin(Activity(anim: .look, duration: 4))   // say hi on launch
    }

    /// Walkable range for the sprite centre, in window points.
    func setBounds(min lo: Double, max hi: Double, scale s: Double) {
        scale = s
        minX = lo
        maxX = Swift.max(lo, hi)
        x = Swift.min(Swift.max(x, minX), maxX)
    }

    // MARK: - Animation table

    static func spec(_ a: Anim, drowsy: Bool) -> AnimSpec {
        switch a {
        case .walk:    return AnimSpec(frames: [0, 1, 2, 3], durations: [0.15, 0.15, 0.15, 0.15], oneShot: false)
        case .idle:    return AnimSpec(frames: [0, 1, 2, 3], durations: [0.9, 0.35, 0.9, 0.16], oneShot: false)
        case .sniff:   return AnimSpec(frames: [0, 1], durations: [0.26, 0.26], oneShot: false)
        case .look:    return AnimSpec(frames: [0, 1, 2, 3], durations: [1.4, 0.45, 1.6, 0.18], oneShot: false)
        case .sit:     return AnimSpec(frames: [0, 1], durations: [0.7, 0.7], oneShot: false)
        case .yawn:    return AnimSpec(frames: [0, 1, 2, 3, 0], durations: [0.4, 0.35, 1.1, 0.4, 0.4], oneShot: true)
        case .stretch: return AnimSpec(frames: [0, 1, 0], durations: [0.6, 1.5, 0.5], oneShot: true)
        case .zoomies: return AnimSpec(frames: [0, 1, 2], durations: [0.08, 0.08, 0.08], oneShot: false)
        case .lie:     return drowsy
            ? AnimSpec(frames: [0, 1], durations: [1.0, 1.4], oneShot: false)
            : AnimSpec(frames: [0, 1], durations: [3.0, 0.18], oneShot: false)
        case .sleep:   return AnimSpec(frames: [0, 1], durations: [1.2, 1.2], oneShot: false)
        case .belly:   return AnimSpec(frames: [0, 1], durations: [1.0, 1.0], oneShot: false)
        }
    }

    private var spec: AnimSpec { PetBrain.spec(current.anim, drowsy: current.drowsy) }

    // MARK: - Tick

    /// Advance the pet by `dt` seconds.
    /// - userIdle: seconds since the last keyboard/mouse input.
    /// - hour: local time as a fractional hour (e.g. 21.5 = 9:30pm).
    func tick(dt rawDt: Double, userIdle: Double, hour h: Double) {
        let dt = Swift.min(Swift.max(rawDt, 0), 0.25)
        hour = h
        let night = h >= 22.5 || h < 7
        let evening = h >= 19 && !night

        updateEnergy(dt, night: night, evening: evening)

        // Step through animation frames.
        let sp = spec
        var finished = false
        stepTime += dt
        while stepTime >= sp.durations[step] {
            stepTime -= sp.durations[step]
            step += 1
            if step >= sp.frames.count {
                if sp.oneShot {
                    finished = true
                    step = sp.frames.count - 1
                    stepTime = 0
                    break
                }
                step = 0
            }
        }
        frame = sp.frames[step]

        // Move (walk / zoomies), turning around at the screen edges.
        if current.speed > 0 {
            x += facing * current.speed * scale * dt
            if x <= minX {
                x = minX; facing = 1
                if current.targetX != nil { finished = true }
            } else if x >= maxX {
                x = maxX; facing = -1
                if current.targetX != nil { finished = true }
            }
            if let t = current.targetX, (facing > 0 ? x >= t : x <= t) { finished = true }
        }

        elapsed += dt
        if !sp.oneShot && elapsed >= current.duration { finished = true }

        if react(userIdle: userIdle, night: night, dt: dt) { return }
        if finished { advance(night: night) }
    }

    private func updateEnergy(_ dt: Double, night: Bool, evening: Bool) {
        var rate: Double
        switch current.anim {
        case .sleep, .belly: rate = night ? 0.0022 : 0.002    // ~8 min from empty to full by day
        case .lie:           rate = 0.0002
        case .walk:          rate = -0.0005
        case .zoomies:       rate = -0.003
        default:             rate = -0.0002
        }
        if rate < 0 {
            if night { rate *= 2.5 } else if evening { rate *= 1.6 }
        }
        energy = Swift.min(1, Swift.max(0, energy + rate * dt))
    }

    /// Reactions to the outside world. Returns true if the current activity was replaced.
    private func react(userIdle: Double, night: Bool, dt: Double) -> Bool {
        // Came back while it was still yawning / lying down on the way to an away-nap.
        if pendingSleep == .away && userIdle < PetBrain.backWithin {
            wake(greet: true)
            return true
        }
        if !isAsleep {
            // You walked away from the computer: curl up for a nap.
            if userIdle > PetBrain.awayAfter && pendingSleep == nil {
                goToSleep(.away)
                return true
            }
            return false
        }

        switch sleepReason {
        case .away?:
            if userIdle < PetBrain.backWithin { wake(greet: true); return true }   // you're back!
        case .tired?:
            if night { sleepReason = .night }
            else if userIdle > PetBrain.awayAfter { sleepReason = .away }            // keep napping till you're back
            else if energy >= 1 { wake(greet: false); return true }
        case .night?:
            if !night {
                if userIdle > 60 { sleepReason = .away }                             // wait for you
                else { wake(greet: true); return true }                              // good morning
            }
            nightPeekTimer -= dt
            if nightPeekTimer <= 0 {
                nightPeekTimer = Double.random(in: 900...1800)
                if userIdle < 60 && energy > 0.9 { wake(greet: true); return true }  // peeks at the night owl
            }
        case nil:
            break
        }

        // Every so often, roll between curled-up and belly-up.
        rollTimer -= dt
        if rollTimer <= 0 {
            rollTimer = Double.random(in: 60...180)
            current.anim = (current.anim == .sleep) ? .belly : .sleep
            anim = current.anim
            step = 0; stepTime = 0; frame = 0
        }
        return false
    }

    // MARK: - Choosing what to do

    private func advance(night: Bool) {
        if !queue.isEmpty {
            begin(queue.removeFirst())
        } else {
            chooseNext(night: night)
        }
    }

    private func start(_ list: [Activity]) {
        guard let first = list.first else { return }
        queue = Array(list.dropFirst())
        begin(first)
    }

    private func begin(_ a: Activity) {
        current = a
        anim = a.anim
        elapsed = 0; step = 0; stepTime = 0
        frame = PetBrain.spec(a.anim, drowsy: a.drowsy).frames[0]
        if let t = a.targetX { facing = t >= x ? 1 : -1 }
        if a.anim == .sleep || a.anim == .belly {
            sleepReason = pendingSleep ?? .tired
            pendingSleep = nil
            rollTimer = Double.random(in: 60...180)
            nightPeekTimer = Double.random(in: 900...1800)
        }
    }

    private func goToSleep(_ reason: SleepReason) {
        pendingSleep = reason
        let nap: Anim = Double.random(in: 0..<1) < 0.25 ? .belly : .sleep
        start([Activity(anim: .yawn),
               Activity(anim: .lie, duration: 4, drowsy: true),
               Activity(anim: nap, duration: .infinity)])
    }

    private func wake(greet: Bool) {
        if greet { energy = Swift.max(energy, 0.35) }   // seeing you perks him up
        sleepReason = nil
        pendingSleep = nil
        start([Activity(anim: .lie, duration: 1.6),
               Activity(anim: .stretch),
               greet ? Activity(anim: .look, duration: Double.random(in: 4...7))
                     : Activity(anim: .idle, duration: 2)])
    }

    private func chooseNext(night: Bool) {
        if night { goToSleep(.night); return }
        if energy < 0.2 { goToSleep(.tired); return }

        let low = energy < 0.45
        var options: [(Anim, Double)] = [
            (.walk, 32), (.idle, 14), (.sniff, 10), (.sit, 14), (.look, 10),
            (.lie, low ? 16 : 7), (.stretch, 3),
        ]
        if low { options.append((.yawn, 4)) }
        if energy > 0.65 && hour >= 8 && hour < 20 { options.append((.zoomies, 2)) }
        options = options.filter { $0.0 != anim || $0.0 == .walk }   // no repeats except walking

        let total = options.reduce(0) { $0 + $1.1 }
        var r = Double.random(in: 0..<total)
        var pick = Anim.walk
        for (a, w) in options {
            if r < w { pick = a; break }
            r -= w
        }

        switch pick {
        case .walk:
            start([Activity(anim: .walk, duration: 60, speed: PetBrain.walkSpeed, targetX: walkTarget())])
        case .idle:
            start([Activity(anim: .idle, duration: Double.random(in: 2...5))])
        case .sniff:
            start([Activity(anim: .sniff, duration: Double.random(in: 1.5...4))])
        case .sit:
            var list = [Activity(anim: .sit, duration: Double.random(in: 4...10))]
            if Double.random(in: 0..<1) < 0.4 { list.append(Activity(anim: .look, duration: Double.random(in: 3...6))) }
            start(list)
        case .look:
            start([Activity(anim: .look, duration: Double.random(in: 3...7))])
        case .lie:
            if energy < 0.3 {   // lie down... and drift off
                pendingSleep = .tired
                start([Activity(anim: .lie, duration: Double.random(in: 6...12), drowsy: true),
                       Activity(anim: .sleep, duration: .infinity)])
            } else {
                start([Activity(anim: .lie, duration: Double.random(in: 6...15))])
            }
        case .stretch:
            start([Activity(anim: .stretch)])
        case .yawn:
            start([Activity(anim: .yawn), Activity(anim: .sit, duration: Double.random(in: 3...5))])
        case .zoomies:
            facing = Bool.random() ? 1 : -1
            start([Activity(anim: .zoomies, duration: Double.random(in: 2.5...4.5), speed: PetBrain.zoomSpeed),
                   Activity(anim: .idle, duration: 2)])
        case .sleep, .belly:
            goToSleep(.tired)
        }
    }

    /// Zoomies on demand (from the menu). If he's asleep or dozing off, he wakes and stretches first.
    func forceZoomies() {
        let midX = (minX + maxX) / 2
        let run = Activity(anim: .zoomies, duration: Double.random(in: 3...5), speed: PetBrain.zoomSpeed)
        let pant = Activity(anim: .idle, duration: 2)
        if isAsleep || pendingSleep != nil {
            sleepReason = nil
            pendingSleep = nil
            energy = Swift.max(energy, 0.35)
            start([Activity(anim: .stretch), run, pant])
        } else {
            start([run, pant])
        }
        facing = x < midX ? 1 : -1      // head for the roomier side of the screen
    }

    private func walkTarget() -> Double {
        guard maxX > minX else { return x }
        let span = maxX - minX
        var t = Double.random(in: minX...maxX)
        let minHop = Swift.min(120 * scale / 3, span / 3)
        if abs(t - x) < minHop {
            t = x + (x < (minX + maxX) / 2 ? 1 : -1) * minHop * 2
        }
        return Swift.min(Swift.max(t, minX), maxX)
    }
}
