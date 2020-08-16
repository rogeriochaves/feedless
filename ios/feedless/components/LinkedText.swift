//
//  LinkedText.swift
//  feedless
//
//  Source: https://gist.github.com/mjm/0581781f85db45b05e8e2c5c33696f88
//

import SwiftUI

private let linkDetector = try! NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
private let blobDetector = try! NSRegularExpression(pattern: "(\\s|^)&(\\S*?=\\.sha\\d+)", options: .caseInsensitive)
private let communityDetector = try! NSRegularExpression(pattern: "(\\s|^)#([a-z0-9-]+)", options: .caseInsensitive)

struct LinkColoredText: View {
    enum Component {
        case text(String)
        case link(String)
    }

    let text: String
    let components: [Component]

    init(text: String, links: [LinkedResult]) {
        self.text = text
        let nsText = text as NSString

        var components: [Component] = []
        var index = 0
        for (_, result) in links {
            if result.range.location > index {
                components.append(.text(nsText.substring(with: NSRange(location: index, length: result.range.location - index))))
            }
            components.append(.link(nsText.substring(with: result.range)))
            index = result.range.location + result.range.length
        }

        if index < nsText.length {
            components.append(.text(nsText.substring(from: index)))
        }

        self.components = components
    }

    var body: some View {
        components.map { component in
            switch component {
            case .text(let text):
                return Text(verbatim: text)
            case .link(let text):
                return Text(verbatim: text)
                    .foregroundColor(Color(Styles.uiLinkBlue))
            }
        }.reduce(Text(""), +)
    }
}

enum LinkedType {
    case httpLink
    case blobLink
    case communityLink
}

typealias LinkedResult = (LinkedType, NSTextCheckingResult)

struct LinkedText: View {
    let text: String
    var links: [LinkedResult]
    @EnvironmentObject var router : Router
    @State var isLinkActive: Bool = false
    @State var communityName: String = ""
    @State var destination : AnyView = AnyView(EmptyView())

    init (_ text: String) {
        self.text = text
        let nsText = text as NSString

        // find the ranges of the string that have URLs
        let wholeString = NSRange(location: 0, length: nsText.length)
        links = linkDetector.matches(in: text, options: [], range: wholeString).map { (.httpLink, $0) }
        links += blobDetector.matches(in: text, options: [], range: wholeString).map { (.blobLink, $0) }
        links += communityDetector.matches(in: text, options: [], range: wholeString).map { (.communityLink, $0) }
    }

    func changeRoute(view: AnyView) {
        self.destination = view
        self.isLinkActive = true
    }

    var body: some View {
        ZStack {
            LinkColoredText(text: text, links: links)
                .font(.body) // enforce here because the link tapping won't be right if it's different
                .overlay(LinkTapOverlay(text: text, links: links, changeRoute: changeRoute))

            NavigationLink(destination: destination, isActive: $isLinkActive) {
                Text("")
            }
        }
    }
}

private struct LinkTapOverlay: UIViewRepresentable {
    typealias UIViewType = LinkTapOverlayView

    let text: String
    let links: [LinkedResult]
    let changeRoute : (AnyView) -> Void

    func makeUIView(context: UIViewRepresentableContext<LinkTapOverlay>) -> LinkTapOverlayView {
        let view = LinkTapOverlayView()
        view.textContainer = context.coordinator.textContainer

        view.isUserInteractionEnabled = true
        let tapGesture = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.didTapLabel(_:)))
        let forceTouchGestureRecognizer = ForceTouchGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.didForceTouchLabel(_:)))
        let longPressGestureRecognizer = UILongPressGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.didLongPressLabel(_:)))

        view.addGestureRecognizer(tapGesture)
        view.addGestureRecognizer(forceTouchGestureRecognizer)
        view.addGestureRecognizer(longPressGestureRecognizer)

        return view
    }

    func updateUIView(_ uiView: LinkTapOverlayView, context: UIViewRepresentableContext<LinkTapOverlay>) {
        let attributedString = NSAttributedString(string: text, attributes: [.font: UIFont.preferredFont(forTextStyle: .body)])
        context.coordinator.textStorage = NSTextStorage(attributedString: attributedString)
        context.coordinator.textStorage!.addLayoutManager(context.coordinator.layoutManager)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject {
        let overlay: LinkTapOverlay

        let layoutManager = NSLayoutManager()
        let textContainer = NSTextContainer(size: .zero)
        var textStorage: NSTextStorage?

        init(_ overlay: LinkTapOverlay) {
            self.overlay = overlay

            textContainer.lineFragmentPadding = 0
            textContainer.lineBreakMode = .byWordWrapping
            textContainer.maximumNumberOfLines = 0
            layoutManager.addTextContainer(textContainer)
        }

        enum LinkedUrl {
            case web(URL)
            case blob(String)
            case community(String)
        }

        func getUrl(_ location: CGPoint) -> LinkedUrl? {
            if let (type, result) = link(at: location) {
                let stringMatch = textStorage?.attributedSubstring(from: result.range).string.replacingOccurrences(of: "\n", with: "").replacingOccurrences(of: " ", with: "") ?? ""

                switch type {
                case .httpLink:
                    if let url = result.url {
                        return .web(url)
                    }
                case .blobLink:
                    return .blob(stringMatch)
                case .communityLink:
                    return .community(stringMatch.replacingOccurrences(of: "#", with: ""))
                }
            }

            return nil
        }

        @objc func didTapLabel(_ gesture: UITapGestureRecognizer) {
            let location = gesture.location(in: gesture.view!)
            guard let url = getUrl(location) else { return }

            switch url {
            case .web(let url_):
                UIApplication.shared.open(url_, options: [:], completionHandler: nil)
            case .blob(let blob):
                self.overlay.changeRoute(
                    AnyView(BlobScreen(blob: blob))
                )
            case .community(let name):
                self.overlay.changeRoute(
                    AnyView(CommunitiesShow(name: name))
                )
            }
        }

        @objc func didForceTouchLabel(_ gesture: ForceTouchGestureRecognizer) {
            let location = gesture.location(in: gesture.view!)
            guard let url = getUrl(location) else { return }

            if case let .web(url_) = url {
                UIApplication.share(url_)
            }
        }

        @objc func didLongPressLabel(_ gesture: UILongPressGestureRecognizer) {
            let location = gesture.location(in: gesture.view!)
            guard let url = getUrl(location) else { return }

            if case let .web(url_) = url {
                UIApplication.share(url_)
            }
        }

        private func link(at point: CGPoint) -> LinkedResult? {
            guard !overlay.links.isEmpty else {
                return nil
            }

            let indexOfCharacter = layoutManager.characterIndex(
                for: point,
                in: textContainer,
                fractionOfDistanceBetweenInsertionPoints: nil
            )

            return overlay.links.first { (_, result) in result.range.contains(indexOfCharacter) }
        }
    }
}

private class LinkTapOverlayView: UIView {
    var textContainer: NSTextContainer!

    override func layoutSubviews() {
        super.layoutSubviews()

        var newSize = bounds.size
        newSize.height += 20 // need some extra space here to actually get the last line
        textContainer.size = newSize
    }
}

import UIKit.UIGestureRecognizerSubclass

final class ForceTouchGestureRecognizer: UIGestureRecognizer {

    private let threshold: CGFloat = 0.75

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesBegan(touches, with: event)
        if let touch = touches.first {
            handleTouch(touch)
        }
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesMoved(touches, with: event)
        if let touch = touches.first {
            handleTouch(touch)
        }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesEnded(touches, with: event)
        state = UIGestureRecognizer.State.failed
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesCancelled(touches, with: event)
        state = UIGestureRecognizer.State.failed
    }

    private func handleTouch(_ touch: UITouch) {
        guard touch.force != 0 && touch.maximumPossibleForce != 0 else { return }

        if touch.force / touch.maximumPossibleForce >= threshold {
            state = UIGestureRecognizer.State.recognized
        }
    }

}

// From: https://stackoverflow.com/questions/37938722/how-to-implement-share-button-in-swift
extension UIApplication {
    class var topViewController: UIViewController? { return getTopViewController() }
    private class func getTopViewController(base: UIViewController? = UIApplication.shared.windows.first!.rootViewController) -> UIViewController? {
        if let nav = base as? UINavigationController { return getTopViewController(base: nav.visibleViewController) }
        if let tab = base as? UITabBarController {
            if let selected = tab.selectedViewController { return getTopViewController(base: selected) }
        }
        if let presented = base?.presentedViewController { return getTopViewController(base: presented) }
        return base
    }

    static var currentActivity : UIActivityViewController?  = nil
    private class func _share(_ data: [Any],
                              applicationActivities: [UIActivity]?) {
        if currentActivity != nil { return }
        let activityViewController = UIActivityViewController(activityItems: data, applicationActivities: nil)
        currentActivity = activityViewController
        UIApplication.topViewController?.present(activityViewController, animated: true) { () in
            currentActivity = nil
        }
    }

    class func share(_ data: Any...,
                     applicationActivities: [UIActivity]? = nil) {
        _share(data, applicationActivities: applicationActivities)
    }
    class func share(_ data: [Any],
                     applicationActivities: [UIActivity]? = nil) {
        _share(data, applicationActivities: applicationActivities)
    }
}
