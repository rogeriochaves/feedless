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
    private let showInReplyTo:Bool

    init(_ posts: Posts, limit: Int = 140, reverseOrder: Bool = true, showInReplyTo: Bool = true) {
        self.posts = posts.sorted(by: { a, b in
            reverseOrder ? b.rts ?? 0 < a.rts ?? 0 : a.rts ?? 0 < b.rts ?? 0
        })

        self.limit = limit
        self.showInReplyTo = showInReplyTo
    }

    func timeSince(timestamp: Int?) -> String {
        guard let timestamp_ = timestamp else { return "" }

        let ts = Double(timestamp_)
        let now : Double = NSDate().timeIntervalSince1970
        let seconds = floor((now - ts) / 1000)
        var interval = floor(seconds / 31536000)

        interval = floor(seconds / 2592000);
        if (interval > 1) {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "MM dd, yyyy"
            dateFormatter.timeZone = TimeZone.current
            return dateFormatter.string(from: Date(timeIntervalSince1970: TimeInterval(timestamp_)))
        }
        interval = floor(seconds / 86400)
        if interval > 1 {
            return  "\(Int(interval)) days ago"
        }
        interval = floor(seconds / 3600)
        if interval > 1 {
            return "\(Int(interval)) hours ago"
        }
        interval = floor(seconds / 60)
        if interval > 1 {
            return "\(Int(interval)) minutes ago"
        }
        return "just now"
    };

    func inReplyToLink(_ post: Entry<AuthorProfileContent<Post>>) -> Text {
        if showInReplyTo, let inReplyTo = post.value.content.inReplyTo {
            return Text(" in reply to " + (inReplyTo.name ?? "unknown"))
                .font(.subheadline)
                .foregroundColor(Styles.darkGray)
        }
        return Text("")
    }

    func postItem(_ post: Entry<AuthorProfileContent<Post>>, _ text: String) -> some View {
        HStack(alignment: .top) {
            NavigationLink(destination: ProfileScreen(id: post.value.author)) {
                AsyncImage(url: Utils.avatarUrl(profile: post.value.authorProfile), imageLoader: self.imageLoader)
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 48, height: 48)
                    .border(Styles.darkGray)
            }
            VStack(alignment: .leading, spacing: 5) {
                Group {
                    Text(post.value.authorProfile.name ?? "unknown")
                    .bold()
                    +
                    Text(" " + text)
                }
                Group {
                    Text(timeSince(timestamp: post.rts))
                        .font(.subheadline)
                        .foregroundColor(Styles.darkGray)
                    +
                    inReplyToLink(post)
                }
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
    }

    func postIfVisible(_ post: Entry<AuthorProfileContent<Post>>) -> some View {
        if post.value.hidden == true {
            return AnyView(
                Group {
                    HStack(alignment: .top) {
                        Text("Post not visible either because you have hidden it, blocked the user or they are not in your extended friends range")
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    Divider()
                    .padding(.vertical, 10)
                }
            )
        } else if post.value.deleted != true && post.value.content.text != nil {
            return AnyView(
                ForEach(Utils.splitInSmallPosts(post.value.content.text ?? "", limit: self.limit), id: \.self) { text in
                    Group {
                        self.postItem(post, text)
                        Divider()
                            .padding(.vertical, 10)
                    }
                }
            )
        }
        return AnyView(EmptyView())
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(posts, id: \.key) { post in
                self.postIfVisible(post)
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
