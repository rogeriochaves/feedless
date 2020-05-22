//
//  Utils.swift
//  feedless
//
//  Created by Rogerio Chaves on 04/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import UIKit
import SwiftUI

extension String {
    func image() -> UIImage? {
        let nsString = (self as NSString)
        let font = UIFont.systemFont(ofSize: 16) // you can change your font size here
        let stringAttributes = [NSAttributedString.Key.font: font]
        let imageSize = nsString.size(withAttributes: stringAttributes)

        UIGraphicsBeginImageContextWithOptions(imageSize, false, 0) //  begin image context
        UIColor.clear.set() // clear background
        UIRectFill(CGRect(origin: CGPoint(), size: imageSize)) // set rect size
        nsString.draw(at: CGPoint.zero, withAttributes: stringAttributes) // draw text within rect
        let image = UIGraphicsGetImageFromCurrentImageContext() // create image from context
        UIGraphicsEndImageContext() //  end image context

        return image ?? UIImage()
    }
}

extension UIColor {
    func image(_ size: CGSize = CGSize(width: 1, height: 1)) -> UIImage {
        return UIGraphicsImageRenderer(size: size).image { rendererContext in
            self.setFill()
            rendererContext.fill(CGRect(origin: .zero, size: size))
        }
    }
}

class Utils {
    static let emptyImage = UIColor.white.image(CGSize(width: 64, height: 64));

    static func ssbFolder() -> String {
        let documentsPath = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0]
        return documentsPath + "/.ssb";
    }
    
    static func ssbKey() -> SSBKey? {
        if (FileManager.default.fileExists(atPath: ssbFolder() + "/logged-out")) {
            return nil;
        }
        let decoder = JSONDecoder()
        guard
            let data = try? Data(contentsOf: URL(fileURLWithPath: ssbFolder() + "/secret")),
            let ssbKey = try? decoder.decode(SSBKey.self, from: data)
        else {
            return nil
        }
        return ssbKey
    }

    static func blobUrl(blob: String) -> String {
        return "http://127.0.0.1:3000/blob/\(blob)";
    }

    static func avatarUrl(profile: Profile) -> String? {
        if let image = profile.image {
            return Utils.blobUrl(blob: image)
        }
        return nil
    }

    static func escapeMarkdown(_ str : String) -> String {
        var result = str;

        let imagesPattern = #"!\[.*?\]\((.*?)\)"#
        result = result.replacingOccurrences(of: imagesPattern, with: "$1", options: .regularExpression);

        let mentionPattern = #"\[(@.*?)\]\(@.*?\)"#
        result = result.replacingOccurrences(of: mentionPattern, with: "$1", options: .regularExpression);

        let linksPattern = #"\[.*?\]\((.*?)\)"#
        result = result.replacingOccurrences(of: linksPattern, with: "$1", options: .regularExpression);

        let headersPattern = #"(^|\n)#+ "#
        result = result.replacingOccurrences(of: headersPattern, with: "", options: .regularExpression);
        return result;
    }

    static func splitInSmallPosts(_ text : String) -> [String] {
        let text = escapeMarkdown(text);
        let limit = 140;

        if (text.count <= limit) {
            return [text]
        }

        var splittedPosts : [String] = [];
        let words = text.split(separator: " ")
        var nextPost = ""
        for word in words {
            let postsCount = splittedPosts.count + 1;
            let pageMarker = "\(postsCount)/"

            if (nextPost.count + word.count + pageMarker.count + 1 < limit) {
              nextPost += word + " "
            } else {
              splittedPosts.append(nextPost + pageMarker)
              nextPost = word + " "
            }
        }
        let postsCount = splittedPosts.count + 1;
        let lastMarker = postsCount > 1 ? "\(postsCount)/\(postsCount)" : ""
        splittedPosts.append(nextPost + lastMarker)
        return splittedPosts.reversed()
    }
}

final class KeyboardResponder: ObservableObject {
    private var notificationCenter: NotificationCenter
    @Published private(set) var currentHeight: CGFloat = 0

    init(center: NotificationCenter = .default) {
        notificationCenter = center
        notificationCenter.addObserver(self, selector: #selector(keyBoardWillShow(notification:)), name: UIResponder.keyboardWillShowNotification, object: nil)
        notificationCenter.addObserver(self, selector: #selector(keyBoardWillHide(notification:)), name: UIResponder.keyboardWillHideNotification, object: nil)
    }

    deinit {
        notificationCenter.removeObserver(self)
    }

    @objc func keyBoardWillShow(notification: Notification) {
        if let keyboardSize = (notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue)?.cgRectValue {
            currentHeight = keyboardSize.height
        }
    }

    @objc func keyBoardWillHide(notification: Notification) {
        currentHeight = 0
    }
}
