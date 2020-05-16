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
}
