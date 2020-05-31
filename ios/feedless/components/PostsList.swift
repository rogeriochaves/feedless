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
    private let limit:Int

    init(_ posts: Posts, limit: Int = 140, reverseOrder: Bool = true) {
        self.posts = posts.sorted(by: { a, b in
            reverseOrder ? b.rts < a.rts : a.rts < b.rts
        })

        self.limit = limit
    }

    func postItem(_ post: Entry<AuthorProfileContent<Post>>, _ text: String) -> some View {
        HStack(alignment: .top) {
            NavigationLink(destination: ProfileScreen(id: post.value.author)) {
                AsyncImage(url: Utils.avatarUrl(profile: post.value.authorProfile), imageLoader: self.imageLoader)
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 48, height: 48)
                    .border(Styles.darkGray)
            }
            Group {
                Text(post.value.authorProfile.name ?? "unknown")
                .bold()
                +
                Text(" " + text)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(posts, id: \.key) { post in
                ForEach(Utils.splitInSmallPosts(post.value.content.text ?? "", limit: self.limit), id: \.self) { text in
                    Group {
                        self.postItem(post, text)
                        Divider()
                            .padding(.vertical, 10)
                    }
                }
            }
        }
    }
}

struct PostsList_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            PostsList(Samples.posts())
                .environmentObject(ImageLoader())
        }
    }
}
