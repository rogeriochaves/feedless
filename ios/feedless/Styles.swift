//
//  Styles.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

class Styles {
    static var darkGray = Color(
        red: 0.4,
        green: 0.4,
        blue: 0.4
    )
    static var gray = Color(
        red: 0.8,
        green: 0.8,
        blue: 0.8
    )
    static var lightGray = Color(
        red: 230 / 255,
        green: 230 / 255,
        blue: 230 / 255
    )
    static var primaryBlue = Color(
        red: 127 / 255,
        green: 230 / 255,
        blue: 230 / 255
    )
    static var uiBlue = UIColor(
        red: 127 / 255,
        green: 230 / 255,
        blue: 230 / 255,
        alpha: 1
    )
    static var uiDarkBlue = UIColor(
        red: 0 / 255,
        green: 68 / 255,
        blue: 68 / 255,
        alpha: 1
    )
    static var uiYellow = UIColor(
        red: 255 / 255,
        green: 238 / 255,
        blue: 119 / 255,
        alpha: 1
    )
    static var uiDarkYellow = UIColor(
        red: 102 / 255,
        green: 85 / 255,
        blue: 0 / 255,
        alpha: 1
    )
    static var uiPink = UIColor(
        red: 255 / 255,
        green: 187 / 255,
        blue: 187 / 255,
        alpha: 1
    )
    static var uiDarkPink = UIColor(
        red: 102 / 255,
        green: 0 / 255,
        blue: 0 / 255,
        alpha: 1
    )
    static var uiLightBlue = UIColor(
        red: 141 / 255,
        green: 235 / 255,
        blue: 245 / 255,
        alpha: 1
    )
    // This will be black on dark mode
    static var uiWhite = UIColor.systemBackground

    // This will be white on dark mode
    static var uiBlack = UIColor.label
}
