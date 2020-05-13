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

class Utils {
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
}
