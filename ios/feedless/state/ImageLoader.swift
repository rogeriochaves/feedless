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
    @Published var attempts : [String: Int] = [:]
    @Published var scheduled : [String: Bool] = [:]

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
            print("Image not found after 10 attempts, giving up")
            return
        }

        let url_ = URL(string: url)!
        let config = URLSessionConfiguration.default
        config.requestCachePolicy = .returnCacheDataElseLoad
        let session = URLSession(configuration: config)

        print("Requests to load image \(url_)")
        session.dataTask(with: url_) {(data, response, error) in
            self.scheduled[url] = false
            if let rawData = data, let image = UIImage(data: rawData) {
                print("Image loaded \(url_)")
                DispatchQueue.main.async {
                    self.images[url] = image
                }
            } else {
                print("No data for image \(url_), trying again in 5s")
                DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                    self.scheduled[url] = false
                    self.load(url: url)
                }
            }
        }.resume()
    }
}
