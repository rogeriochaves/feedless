//
//  ImageLoader.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

class ImageLoader: ObservableObject {
    @Published var images : [String: UIImage] = [:]
    var attempts : [String: Int] = [:]
    var scheduled : [String: Bool] = [:]

    func load(url: String) {
        if self.scheduled[url] ?? false {
            return
        }
        self.scheduled[url] = true
        if self.images[url] != nil {
            return
        }
        self.attempts[url] = (self.attempts[url] ?? 0) + 1
        if self.attempts[url]! > 10 {
            Utils.debug("Image not found after 10 attempts, giving up")
            return
        }

        let url_ = URL(string: url)!
        let config = URLSessionConfiguration.default
        config.requestCachePolicy = .returnCacheDataElseLoad
        let session = URLSession(configuration: config)

        Utils.debug("Requests to load image \(url_)")
        session.dataTask(with: url_) {(data, response, error) in
            if let rawData = data, let image = UIImage(data: rawData) {
                Utils.debug("Image loaded \(url_)")
                DispatchQueue.main.async {
                    self.scheduled[url] = false
                    self.images[url] = image
                }
            } else {
                Utils.debug("No data for image \(url_), trying again in 5s")
                URLCache.shared.removeCachedResponse(for: session.dataTask(with: url_))
                DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                    self.scheduled[url] = false
                    self.load(url: url)
                }
            }
        }.resume()
    }
}
