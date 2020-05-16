//
//  Posts.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct PostsList : View {
    @EnvironmentObject var imageLoader : ImageLoader
    private let posts:Posts

    init(_ posts: Posts) {
        self.posts = posts
    }

    func avatarUrl(profile: Profile) -> String? {
        if let image = profile.image {
            return Utils.blobUrl(blob: image)
        }
        return nil
    }

    var body: some View {
        List(posts, id: \.key) { post in
            HStack {
                AsyncImage(url: self.avatarUrl(profile: post.value.authorProfile), imageLoader: self.imageLoader)
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 64, height: 64)
                Text(post.value.content.text)
            }
        }
    }
}

struct PostsList_Previews: PreviewProvider {
    static var previews: some View {
        PostsList(Samples.posts())
            .environmentObject(ImageLoader())
    }
}
