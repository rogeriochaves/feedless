//
//  Utils.swift
//  feedless
//
//  Created by Rogerio Chaves on 04/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import UIKit
import SwiftUI

class Utils {
    static let emptyImage = UIColor.white.image(CGSize(width: 64, height: 64));

    static func ssbFolder() -> String {
        let documentsPath = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0]
        return documentsPath + "/.ssb";
    }

    static func clearKeyString(_ key: String) -> String {
        var cleanKey = key
        cleanKey = cleanKey.replacingOccurrences(of: "#.*?(\n|$)", with: "", options: [.regularExpression])
        cleanKey = cleanKey.replacingOccurrences(of: "\n\n", with: "", options: [.regularExpression])
        cleanKey = cleanKey.replacingOccurrences(of: "\n\\{", with: "{", options: [.regularExpression])

        return cleanKey
    }

    static func ssbKeyJSON() -> String? {
        guard
            let data = try? Data(contentsOf: URL(fileURLWithPath: ssbFolder() + "/secret")),
            let string = String(data: data, encoding: .utf8) as String?
        else {
            return nil
        }
        return clearKeyString(string)
    }

    static func ssbKey() -> SSBKey? {
        if (FileManager.default.fileExists(atPath: ssbFolder() + "/logged-out")) {
            return nil
        }
        let decoder = JSONDecoder()
        guard
            let json = ssbKeyJSON(),
            let data = json.data(using: .utf8),
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

    static func splitInSmallPosts(_ text : String, limit : Int = 140) -> [String] {
        let text = escapeMarkdown(text);

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

    static func topicTitle(_ topic: TopicEntry) -> String {
        var title = escapeMarkdown(topic.value.content.title ?? topic.value.content.text)

        let ssbRefPattern = #"((&|%).*?=\.sha\d+)"#
        title = title.replacingOccurrences(of: ssbRefPattern, with: "", options: .regularExpression)

        title = title.replacingOccurrences(of: #"\n"#, with: " ", options: .regularExpression)

        if (title.count > 60) {
          return title.prefix(60) + "...";
        }
        return title
    }

    static func changeNavigationColor(_ color: UIColor) {
        let coloredAppearance = UINavigationBarAppearance()
        coloredAppearance.configureWithTransparentBackground()
        coloredAppearance.backgroundColor = color
        coloredAppearance.titleTextAttributes = [.foregroundColor: UIColor.black]
        coloredAppearance.largeTitleTextAttributes = [.foregroundColor: UIColor.black]

        UINavigationBar.appearance().standardAppearance = coloredAppearance
        UINavigationBar.appearance().compactAppearance = coloredAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = coloredAppearance
        UINavigationBar.appearance().tintColor = .white
    }

    static func debug(_ str: String) {
        if ProcessInfo.processInfo.environment["DEBUG_SWIFT"] != nil {
            print(str)
        }
    }

    static func clearCache(_ path: String) {
        guard let encodedPath = path.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) else { return }
        guard let url = URL(string: "http://127.0.0.1:3000\(encodedPath)") else { return }
        let task = session.dataTask(with: url)
        URLCache.shared.removeCachedResponse(for: task)
        task.suspend()
    }

    static let session = getURLSession()
    private static func getURLSession() -> URLSession {
        let config = URLSessionConfiguration.default
        config.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        let session = URLSession(configuration: config)

        return session
    }

    // From: https://stackoverflow.com/a/31314494/996404
    static func resizeImage(image: UIImage, targetSize: CGSize) -> UIImage? {
        let size = image.size

        let widthRatio  = targetSize.width  / size.width
        let heightRatio = targetSize.height / size.height

        // Figure out what our orientation is, and use that to form the rectangle
        var newSize: CGSize
        if(widthRatio > heightRatio) {
            newSize =  CGSize(width: size.width * heightRatio, height: size.height * heightRatio)
        } else {
            newSize =  CGSize(width: size.width * widthRatio,  height: size.height * widthRatio)
        }

        // This is the rect that we've calculated out and this is what is actually used below
        let rect = CGRect(x: 0, y: 0, width: newSize.width, height: newSize.height)

        // Actually do the resizing to the rect using the ImageContext stuff
        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: rect)
        let newImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        return newImage
    }
}
