//
//  AppDelegate.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    @objc
    func startNode() {
        var targetEnvironment = "iphoneos"
        #if targetEnvironment(simulator)
            targetEnvironment = "iphonesimulator"
        #endif
        let jsFile = Bundle.main.path(forResource: "backend/out/index.js", ofType: nil)!

        let documentsPath = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0]
        let bundlePath = Bundle.main.bundlePath
        Utils.debug("documentsPath \(documentsPath)")
        NodeRunner.startEngine(withArguments: ["node", jsFile, documentsPath, bundlePath, targetEnvironment])
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.

        if ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] != "1" {
            let nodejsThread = Thread(target:self, selector:#selector(startNode), object:nil)
            nodejsThread.stackSize = 4*1024*1024;
            nodejsThread.start()
        }

        return true
    }

    // MARK: UISceneSession Lifecycle

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        // Called when a new scene session is being created.
        // Use this method to select a configuration to create the new scene with.
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
        // Called when the user discards a scene session.
        // If any sessions were discarded while the application was not running, this will be called shortly after application:didFinishLaunchingWithOptions.
        // Use this method to release any resources that were specific to the discarded scenes, as they will not return.
    }


}

