import AppKit
let S: CGFloat = 1024
let img = NSImage(size: NSSize(width: S, height: S))
img.lockFocus()
let ctx = NSGraphicsContext.current!.cgContext
let inset: CGFloat = 100, r: CGFloat = 185
let body = NSRect(x: inset, y: inset, width: S - 2*inset, height: S - 2*inset)
let shape = NSBezierPath(roundedRect: body, xRadius: r, yRadius: r)
// drop shadow
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -14), blur: 30, color: NSColor.black.withAlphaComponent(0.35).cgColor)
NSColor(red: 0.09, green: 0.125, blue: 0.153, alpha: 1).setFill(); shape.fill()
ctx.restoreGState()
shape.addClip()
let mid = S / 2
// left: old map paper
NSColor(red: 0.91, green: 0.85, blue: 0.70, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: mid, height: S).fill()
// right: modern map
NSColor(red: 0.13, green: 0.18, blue: 0.22, alpha: 1).setFill()
NSRect(x: mid, y: 0, width: S - mid, height: S).fill()
// a river crossing both halves
func river(_ color: NSColor, _ w: CGFloat) {
  let p = NSBezierPath(); p.move(to: NSPoint(x: 60, y: 330))
  p.curve(to: NSPoint(x: 980, y: 640), controlPoint1: NSPoint(x: 380, y: 260), controlPoint2: NSPoint(x: 640, y: 720))
  p.lineWidth = w; p.lineCapStyle = .round; color.setStroke(); p.stroke()
}
NSGraphicsContext.saveGraphicsState(); NSBezierPath(rect: NSRect(x: 0, y: 0, width: mid, height: S)).addClip()
river(NSColor(red: 0.55, green: 0.66, blue: 0.68, alpha: 1), 70)
// hand-drawn streets in sepia
NSColor(red: 0.45, green: 0.33, blue: 0.22, alpha: 0.75).setStroke()
for i in 0..<7 { let p = NSBezierPath(); p.lineWidth = 9
  p.move(to: NSPoint(x: 120 + CGFloat(i)*55, y: 470 + CGFloat(i)*18)); p.line(to: NSPoint(x: 180 + CGFloat(i)*40, y: 860)); p.stroke() }
for i in 0..<5 { let p = NSBezierPath(); p.lineWidth = 9
  p.move(to: NSPoint(x: 100, y: 560 + CGFloat(i)*65)); p.line(to: NSPoint(x: mid, y: 600 + CGFloat(i)*58)); p.stroke() }
NSGraphicsContext.restoreGraphicsState()
NSGraphicsContext.saveGraphicsState(); NSBezierPath(rect: NSRect(x: mid, y: 0, width: S - mid, height: S)).addClip()
river(NSColor(red: 0.30, green: 0.50, blue: 0.58, alpha: 1), 70)
NSColor(red: 0.85, green: 0.88, blue: 0.86, alpha: 0.85).setStroke()
for i in 0..<5 { let p = NSBezierPath(); p.lineWidth = 12
  p.move(to: NSPoint(x: mid + CGFloat(i)*85 + 30, y: 120)); p.line(to: NSPoint(x: mid + CGFloat(i)*85 + 30, y: 300 + CGFloat(i)*30)); p.stroke()
  let q = NSBezierPath(); q.lineWidth = 12; q.move(to: NSPoint(x: mid, y: 720 + CGFloat(i)*45)); q.line(to: NSPoint(x: 940, y: 720 + CGFloat(i)*45)); q.stroke() }
NSGraphicsContext.restoreGraphicsState()
// swipe line + handle
let red = NSColor(red: 0.71, green: 0.27, blue: 0.17, alpha: 1)
red.setFill(); NSRect(x: mid - 9, y: 0, width: 18, height: S).fill()
let h = NSBezierPath(ovalIn: NSRect(x: mid - 78, y: mid - 78, width: 156, height: 156)); h.fill()
NSColor.white.setStroke()
for dir: CGFloat in [-1, 1] { let a = NSBezierPath(); a.lineWidth = 16; a.lineCapStyle = .round; a.lineJoinStyle = .round
  a.move(to: NSPoint(x: mid + dir*18, y: mid + 30)); a.line(to: NSPoint(x: mid + dir*45, y: mid)); a.line(to: NSPoint(x: mid + dir*18, y: mid - 30)); a.stroke() }
img.unlockFocus()
let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
