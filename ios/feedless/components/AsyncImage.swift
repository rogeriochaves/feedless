//
//  AsyncImage.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI
import Foundation

struct AsyncImage: View {
    @ObservedObject var imageLoader : ImageLoader
    let url : String?

    init(url: String?, imageLoader: ImageLoader) {
        self.url = url
        self.imageLoader = imageLoader
        if let url_ = url {
            imageLoader.load(url: url_)
        }
    }

    var body: some View {
        if let url_ = url, let image = imageLoader.images[url_] {
            return AnyView(Image(uiImage: image)
                .resizable())
        } else {
            return AnyView(Image("no-avatar")
                .resizable())
        }
    }
}
