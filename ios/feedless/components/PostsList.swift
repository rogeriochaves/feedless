//
//  Posts.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

enum PostsReference {
    case WallId(String)
    case CommunityName(String)
}

struct PostsList : View {
    @EnvironmentObject var imageLoader : ImageLoader
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var context : Context
    @EnvironmentObject var communities : Communities
    private let posts:Posts
    private let limit:Int
    private let showInReplyTo:Bool
    private let reference:PostsReference
    @State var postMenuOpen:PostEntry? = nil

    init(_ posts: Posts, reference: PostsReference) {
        self.reference = reference

        switch reference {
        case .WallId(_):
            // Reverse order
            self.posts = posts.sorted(by: { a, b in b.rts ?? 0 < a.rts ?? 0 })
            self.limit = 140
            self.showInReplyTo = true
        case .CommunityName(_):
            self.posts = posts.sorted(by: { a, b in a.rts ?? 0 < b.rts ?? 0 })
            self.limit = 10_000
            self.showInReplyTo = false
        }
    }

    private var isPostMenuOpen: Binding<Bool> { Binding (
        get: { self.postMenuOpen != nil },
        set: { _ in }
    )}

    func timeSince(timestamp: Int?) -> String {
        guard let timestamp_ = timestamp else { return "" }

        let ts = Double(timestamp_) / 1000
        let now : Double = NSDate().timeIntervalSince1970
        let seconds = floor(now - ts)
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
            return  "\(Int(interval))d"
        }
        interval = floor(seconds / 3600)
        if interval > 1 {
            return "\(Int(interval))h"
        }
        interval = floor(seconds / 60)
        if interval > 1 {
            return "\(Int(interval))m"
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
                HStack(alignment: .center) {
                    (
                        Text(post.value.authorProfile.name ?? "unknown")
                        .bold()
                        +
                        Text(" · " + timeSince(timestamp: post.rts))
                            .font(.subheadline)
                            .foregroundColor(Styles.darkGray)
                        +
                        inReplyToLink(post)
                        ).lineLimit(1).truncationMode(.tail)
                    Spacer()
                    Button(action: {
                        self.postMenuOpen = post
                    }) {
                        Image(systemName: "chevron.down")
                            .foregroundColor(Styles.gray)
                            .padding(.trailing, 5)
                    }
                }
                LinkedText(text)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
    }

    func postIfVisible(_ post: Entry<AuthorProfileContent<Post>>) -> some View {
        if post.value.deleted == true || post.value.content.text == nil {
            return AnyView(EmptyView())
        } else if post.value.hidden == true || self.profiles.blockeds.contains(post.value.author) {
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
        }

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

    func confirmDialog(message: String, onConfirm: ((UIAlertAction) -> Void)?) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)

        alert.addAction(UIAlertAction(title: "OK", style: .default, handler: onConfirm))
        alert.addAction(UIAlertAction(title: "Cancel", style: .default))
        UIApplication.shared.windows.first?.rootViewController?.present(alert, animated: true, completion: nil)
    }

    func deletePost(_ post: PostEntry) {
        switch reference {
        case .WallId(let wallId):
            self.profiles.deletePost(context: self.context, wall: wallId, post: post)
        case .CommunityName(let name):
            self.communities.deletePost(context: self.context, name: name, post: post)
        }
    }

    func flagPost(_ post: PostEntry, onConfirm: (() -> Void)?) {
        let alert = UIAlertController(title: "Flag post", message: "Please type a reason for flagging this", preferredStyle: .alert)

        alert.addTextField { (textField) in
            textField.text = ""
        }

        alert.addAction(UIAlertAction(title: "OK", style: .default, handler: { [weak alert] (_) in
            let textField = alert?.textFields![0]
            self.profiles.flagPost(context: self.context, post: post, reason: textField?.text ?? "")

            if let cb = onConfirm {
                cb()
            }
        }))

        alert.addAction(UIAlertAction(title: "Cancel", style: .default))

        UIApplication.shared.windows.first?.rootViewController?.present(alert, animated: true, completion: nil)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(posts, id: \.key) { post in
                self.postIfVisible(post)
            }
        }
        .actionSheet(isPresented: isPostMenuOpen) {
            if self.postMenuOpen?.value.author == self.context.ssbKey?.id {
                return ActionSheet(
                    title: Text("Actions"),
                    buttons: [
                        .cancel { self.postMenuOpen = nil },
                        .default( Text("Delete") ) {
                            if let post = self.postMenuOpen {
                                self.deletePost(post)
                            }
                            self.postMenuOpen = nil
                        },
                        ]
                )
            } else {
                return ActionSheet(
                    title: Text("Actions"),
                    buttons: [
                        .cancel { self.postMenuOpen = nil },
                        .default( Text("Hide") ) {
                            if let post = self.postMenuOpen {
                                self.deletePost(post)
                                self.confirmDialog(message: "Do you also want to flag the post?", onConfirm: { _ in
                                    self.flagPost(post, onConfirm: nil)
                                })
                            }
                            self.postMenuOpen = nil
                        },
                        .default( Text("Flag") ) {
                            if let post = self.postMenuOpen {
                                self.flagPost(post, onConfirm: {
                                    self.confirmDialog(message: "Do you also want to hide the post?", onConfirm: { _ in
                                        self.deletePost(post)
                                    })
                                })
                            }
                            self.postMenuOpen = nil
                        },
                        ]
                )
            }
        }
    }
}

struct PostsList_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            PostsList(Samples.posts(), reference: .WallId("foo"))
                .environmentObject(ImageLoader())
                .environmentObject(Samples.context())
                .environmentObject(Profiles())
                .environmentObject(Communities())
        }
    }
}
